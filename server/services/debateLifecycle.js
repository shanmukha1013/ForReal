const Debate = require('../models/Debate');
const logger = require('../utils/logger');
const { notify } = require('./notificationService');
const { emitToRoom } = require('../sockets');

const OPEN_STATUSES = ['live', 'ending_soon'];
const ENDING_SOON_MAX_MS = 60 * 60 * 1000; // never flag "ending soon" more than 1h early
const SYNC_THROTTLE_MS = 15 * 1000;

// The community verdict is decided by votes only. A tie (or no votes) is
// reported honestly as having no winner.
const pickWinner = (options = []) => {
  if (!options.length) return null;
  const sorted = [...options].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const [first, second] = sorted;
  if (!first.votes || (second && second.votes === first.votes)) return null;
  return first;
};

const describeVerdict = (debate, winner) => {
  const total = debate.stats?.totalVotes || 0;
  if (!total) return 'The debate closed without any votes.';
  if (!winner) return `The debate closed in a tie after ${total} vote${total === 1 ? '' : 's'}.`;
  const share = Math.round(((winner.votes || 0) / total) * 100);
  return `"${winner.label}" carried the room with ${share}% of ${total} vote${total === 1 ? '' : 's'}.`;
};

const finalizeDebate = async (debate) => {
  const now = new Date();
  const winner = pickWinner(debate.options);
  const verdict = describeVerdict(debate, winner);

  // The status condition makes finalisation idempotent across concurrent
  // requests and multiple server instances.
  const updated = await Debate.findOneAndUpdate(
    { _id: debate._id, status: { $in: OPEN_STATUSES } },
    {
      $set: {
        status: 'finished',
        'lifecycle.finishedAt': now,
        'finalVerdict.winningOptionId': winner?._id || null,
        'finalVerdict.communityVerdict': verdict,
        'finalVerdict.generatedAt': now,
      },
      $push: {
        timeline: { type: 'FINISHED', title: 'Debate closed', description: verdict, timestamp: now },
      },
    },
    { returnDocument: 'after', projection: { status: 1, lifecycle: 1, finalVerdict: 1, options: 1, stats: 1, creator: 1 } }
  ).lean();

  if (!updated) return null;

  emitToRoom(`debate_${debate._id}`, 'debate_updated', {
    _id: updated._id,
    status: updated.status,
    lifecycle: updated.lifecycle,
    finalVerdict: updated.finalVerdict,
    options: updated.options,
    stats: updated.stats,
  });
  notify({
    recipient: updated.creator,
    sender: updated.creator,
    system: true,
    type: 'debateFinished',
    entity: updated._id,
    entityModel: 'Debate',
    message: verdict,
  });

  return updated;
};

// Marks open debates as ending soon when less than 25% of their duration
// (capped at one hour) remains.
const flagEndingSoon = (now) =>
  Debate.updateMany(
    { status: 'live', 'lifecycle.endsAt': { $gt: now } },
    [
      {
        $set: {
          status: {
            $cond: [
              {
                $lte: [
                  { $subtract: ['$lifecycle.endsAt', now] },
                  { $min: [ENDING_SOON_MAX_MS, { $multiply: ['$duration', 15000] }] },
                ],
              },
              'ending_soon',
              '$status',
            ],
          },
        },
      },
    ],
    { updatePipeline: true }
  );

let lastSync = 0;
let syncInFlight = null;

// Brings every open debate's status up to date. Throttled so that list
// endpoints can call it on every request without extra database load.
const syncAllDebates = async ({ force = false } = {}) => {
  if (!force && Date.now() - lastSync < SYNC_THROTTLE_MS) return;
  if (syncInFlight) return syncInFlight;

  lastSync = Date.now();
  syncInFlight = (async () => {
    try {
      const now = new Date();
      const expired = await Debate.find({ status: { $in: OPEN_STATUSES }, 'lifecycle.endsAt': { $lte: now } })
        .select('options stats creator')
        .limit(100)
        .lean();
      for (const debate of expired) {
        await finalizeDebate(debate);
      }
      await flagEndingSoon(now);
    } catch (error) {
      logger.warn(`Debate lifecycle sync failed: ${error.message}`);
    } finally {
      syncInFlight = null;
    }
  })();
  return syncInFlight;
};

// Synchronises a single (lean) debate document in memory and in the database.
const syncDebate = async (debate) => {
  if (!debate || !OPEN_STATUSES.includes(debate.status)) return debate;
  const endsAt = new Date(debate.lifecycle?.endsAt).getTime();
  const remaining = endsAt - Date.now();

  if (remaining <= 0) {
    const updated = await finalizeDebate(debate);
    if (updated) {
      return { ...debate, ...updated };
    }
    return { ...debate, status: 'finished' };
  }

  const threshold = Math.min(ENDING_SOON_MAX_MS, (debate.duration || 0) * 15000);
  if (debate.status === 'live' && remaining <= threshold) {
    await Debate.updateOne({ _id: debate._id, status: 'live' }, { status: 'ending_soon' });
    return { ...debate, status: 'ending_soon' };
  }
  return debate;
};

const isOpen = (debate) => OPEN_STATUSES.includes(debate.status);

module.exports = {
  OPEN_STATUSES,
  pickWinner,
  syncAllDebates,
  syncDebate,
  isOpen,
};
