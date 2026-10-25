// End-to-end API tests against an in-memory MongoDB.
// Run with: npm test
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');

let mongo;
let app;

const password = 'correct-horse-42';

const cookieFrom = (res) => (res.headers['set-cookie'] || [])
  .map((c) => c.split(';')[0])
  .filter((c) => c.startsWith('jwt_refresh=') && c !== 'jwt_refresh=')
  .pop();

const register = async (username) => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username, email: `${username}@example.com`, password });
  assert.equal(res.status, 201, res.body.message);
  return { token: res.body.data.accessToken, id: res.body.data._id, cookie: cookieFrom(res) };
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongo.getUri();
  process.env.JWT_SECRET = 'test-secret-that-is-definitely-long-enough-123';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.AUTH_RATE_LIMIT_MAX = '1000';

  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  ({ createApp: app } = require('../app'));
  app = app();
});

after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

describe('health and security', () => {
  test('health endpoint reports database status', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.database, 'connected');
  });

  test('unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  test('NoSQL operator injection in login is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: { $gt: '' }, password: { $gt: '' } });
    assert.equal(res.status, 400);
  });

  test('regex metacharacters in search are matched literally', async () => {
    const res = await request(app).get('/api/search').query({ q: '(.*+[' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.users, []);
  });

  test('disallowed CORS origins are refused', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    assert.equal(res.status, 403);
  });
});

describe('authentication', () => {
  test('registration validates input', async () => {
    const bad = await request(app).post('/api/auth/register').send({ username: 'A!', email: 'x', password: '1' });
    assert.equal(bad.status, 400);
  });

  test('register, duplicate, login, me, refresh rotation and logout', async () => {
    const { token, cookie } = await register('alice');
    assert.ok(token);
    assert.ok(cookie, 'refresh cookie is set');

    const dup = await request(app).post('/api/auth/register')
      .send({ username: 'alice', email: 'other@example.com', password });
    assert.equal(dup.status, 409);

    const wrong = await request(app).post('/api/auth/login').send({ username: 'alice', password: 'nope-nope-nope' });
    assert.equal(wrong.status, 401);

    const login = await request(app).post('/api/auth/login').send({ username: 'ALICE', password, rememberMe: true });
    assert.equal(login.status, 200);
    const loginCookie = cookieFrom(login);

    const me = await request(app).get('/api/auth/me').set(auth(login.body.data.accessToken));
    assert.equal(me.status, 200);
    assert.equal(me.body.data.username, 'alice');
    assert.equal(me.body.data.password, undefined);

    // jsonwebtoken has one-second resolution: wait so the rotated token differs.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', loginCookie);
    assert.equal(refreshed.status, 200);
    const rotatedCookie = cookieFrom(refreshed);
    assert.notEqual(rotatedCookie, loginCookie);

    // A concurrent request still holding the previous token gets a grace pass.
    const raced = await request(app).post('/api/auth/refresh').set('Cookie', loginCookie);
    assert.equal(raced.status, 200);

    const logout = await request(app).post('/api/auth/logout').set('Cookie', rotatedCookie);
    assert.equal(logout.status, 200);

    const afterLogout = await request(app).post('/api/auth/refresh').set('Cookie', rotatedCookie);
    assert.equal(afterLogout.status, 401);
  });

  test('refresh without a session cookie reports no session without an error', async () => {
    const res = await request(app).post('/api/auth/refresh');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.accessToken, null);
  });

  test('protected routes require a token', async () => {
    const res = await request(app).get('/api/talks');
    assert.equal(res.status, 401);
  });
});

describe('profiles', () => {
  test('profile update validates and password change needs the current password', async () => {
    const { token } = await register('bob');

    const update = await request(app).put('/api/users/profile').set(auth(token))
      .send({ displayName: 'Bob B.', bio: 'Argues in good faith.' });
    assert.equal(update.status, 200);
    assert.equal(update.body.data.profile.displayName, 'Bob B.');

    const noCurrent = await request(app).put('/api/users/profile').set(auth(token)).send({ password: 'new-password-1' });
    assert.equal(noCurrent.status, 400);

    const changed = await request(app).put('/api/users/profile').set(auth(token))
      .send({ password: 'new-password-1', currentPassword: password });
    assert.equal(changed.status, 200);

    const login = await request(app).post('/api/auth/login').send({ username: 'bob', password: 'new-password-1' });
    assert.equal(login.status, 200);
  });

  test('public profiles hide email and report follow state', async () => {
    const carol = await register('carol');
    const dave = await register('dave');

    const follow = await request(app).post(`/api/users/${carol.id}/follow`).set(auth(dave.token));
    assert.equal(follow.status, 200);
    assert.equal(follow.body.data.followerCount, 1);

    const again = await request(app).post(`/api/users/${carol.id}/follow`).set(auth(dave.token));
    assert.equal(again.body.data.followerCount, 1, 'following twice is idempotent');

    const profile = await request(app).get('/api/users/carol').set(auth(dave.token));
    assert.equal(profile.status, 200);
    assert.equal(profile.body.data.email, undefined);
    assert.equal(profile.body.data.isFollowing, true);

    const notifications = await request(app).get('/api/notifications').set(auth(carol.token));
    assert.equal(notifications.body.data.notifications[0].type, 'follow');
    assert.equal(notifications.body.data.unreadCount, 1);
  });
});

describe('talks', () => {
  test('create, react, bookmark, comment and delete', async () => {
    const erin = await register('erin');
    const frank = await register('frank');

    const empty = await request(app).post('/api/talks').set(auth(erin.token)).send({ content: '   ' });
    assert.equal(empty.status, 400);

    const created = await request(app).post('/api/talks').set(auth(erin.token))
      .send({ content: 'Like counts reward outrage. #Attention' });
    assert.equal(created.status, 201);
    const talkId = created.body.data._id;
    assert.deepEqual(created.body.data.hashtags, ['#attention']);
    assert.equal(created.body.data.author.email, undefined, 'author email is never exposed');

    const agree = await request(app).post(`/api/talks/${talkId}/reactions`).set(auth(frank.token)).send({ type: 'agree' });
    assert.equal(agree.body.data.reactionsCount.agree, 1);
    assert.equal(agree.body.data.userReaction, 'agree');

    const switched = await request(app).post(`/api/talks/${talkId}/reactions`).set(auth(frank.token)).send({ type: 'disagree' });
    assert.equal(switched.body.data.reactionsCount.agree, 0);
    assert.equal(switched.body.data.reactionsCount.disagree, 1);

    const feed = await request(app).get('/api/talks').set(auth(frank.token));
    const inFeed = feed.body.data.talks.find((t) => t._id === talkId);
    assert.equal(inFeed.userReaction, 'disagree', 'feed includes the viewer reaction');

    const bookmark = await request(app).post(`/api/talks/${talkId}/bookmarks`).set(auth(frank.token));
    assert.equal(bookmark.body.data.isBookmarked, true);
    assert.equal(bookmark.body.data.bookmarksCount, 1);

    const comment = await request(app).post(`/api/talks/${talkId}/comments`).set(auth(frank.token))
      .send({ content: 'Then hide the counts and see what happens.' });
    assert.equal(comment.status, 201);

    const forbidden = await request(app).put(`/api/talks/${talkId}`).set(auth(frank.token)).send({ content: 'hijack' });
    assert.equal(forbidden.status, 403);

    const notes = await request(app).get('/api/notifications').set(auth(erin.token));
    const types = notes.body.data.notifications.map((n) => n.type).sort();
    assert.deepEqual(types, ['comment', 'reaction']);

    const removed = await request(app).delete(`/api/talks/${talkId}/comments/${comment.body.data._id}`).set(auth(erin.token));
    assert.equal(removed.status, 200, 'talk owners can moderate comments');

    const single = await request(app).get(`/api/talks/${talkId}`).set(auth(erin.token));
    assert.equal(single.body.data.commentsCount, 0);

    const del = await request(app).delete(`/api/talks/${talkId}`).set(auth(erin.token));
    assert.equal(del.status, 200);
  });

  test('cursor pagination returns each talk once', async () => {
    const gina = await register('gina');
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/talks').set(auth(gina.token)).send({ content: `Point number ${i}` });
    }
    const first = await request(app).get('/api/talks').query({ author: 'gina', limit: 3 }).set(auth(gina.token));
    assert.equal(first.body.data.talks.length, 3);
    assert.equal(first.body.data.hasMore, true);
    const second = await request(app).get('/api/talks')
      .query({ author: 'gina', limit: 3, cursor: first.body.data.nextCursor })
      .set(auth(gina.token));
    assert.equal(second.body.data.talks.length, 2);
    assert.equal(second.body.data.hasMore, false);
  });
});

describe('debates', () => {
  let hank;
  let ivy;
  let debate;

  before(async () => {
    hank = await register('hank');
    ivy = await register('ivy');
  });

  test('creation is validated', async () => {
    const res = await request(app).post('/api/debates').set(auth(hank.token)).send({
      title: 'Too short?', description: 'x', category: 'Technology', options: [{ label: 'Only one' }],
    });
    assert.equal(res.status, 400);
  });

  test('create, vote, switch vote and see the viewer vote', async () => {
    const res = await request(app).post('/api/debates').set(auth(hank.token)).send({
      title: 'Should platforms hide public like counts?',
      description: 'Counts shape what people say. Do they help or hurt honest conversation?',
      category: 'Technology',
      durationMinutes: 1440,
      options: [{ label: 'Hide them' }, { label: 'Keep them' }],
      evidenceRequired: true,
    });
    assert.equal(res.status, 201);
    debate = res.body.data;
    const [hide, keep] = debate.options;

    const vote = await request(app).post(`/api/debates/${debate._id}/vote`).set(auth(ivy.token)).send({ optionId: hide._id });
    assert.equal(vote.status, 200);
    assert.equal(vote.body.data.stats.totalVotes, 1);
    assert.equal(vote.body.data.stats.participantCount, 1);

    const switched = await request(app).post(`/api/debates/${debate._id}/vote`).set(auth(ivy.token)).send({ optionId: keep._id });
    const votes = Object.fromEntries(switched.body.data.options.map((o) => [o.label, o.votes]));
    assert.deepEqual(votes, { 'Hide them': 0, 'Keep them': 1 });
    assert.equal(switched.body.data.stats.totalVotes, 1);

    const view = await request(app).get(`/api/debates/${debate._id}`).set(auth(ivy.token));
    assert.equal(view.body.data.userVote, keep._id);
    assert.equal(view.body.data.creator.username, 'hank');
    assert.equal(view.body.data.aiAnalysis, undefined, 'placeholder AI fields are not exposed');
  });

  test('arguments require evidence here, sanitize links, support replies and endorsements', async () => {
    const [hide] = debate.options;

    const noSource = await request(app).post(`/api/debates/${debate._id}/comments`).set(auth(ivy.token))
      .send({ content: 'Counts create herd behaviour.', optionId: hide._id });
    assert.equal(noSource.status, 400);

    const unsafe = await request(app).post(`/api/debates/${debate._id}/comments`).set(auth(ivy.token))
      .send({ content: 'Counts create herd behaviour.', optionId: hide._id, referenceUrl: 'javascript:alert(1)' });
    assert.equal(unsafe.status, 400, 'javascript: links are not accepted as evidence');

    const arg = await request(app).post(`/api/debates/${debate._id}/comments`).set(auth(ivy.token))
      .send({ content: 'Counts create herd behaviour.', optionId: hide._id, referenceUrl: 'https://www.example.org/study' });
    assert.equal(arg.status, 201);
    assert.equal(arg.body.data.references[0].title, 'example.org');

    const ownEndorse = await request(app).post(`/api/debates/${debate._id}/comments/${arg.body.data._id}/endorse`).set(auth(ivy.token));
    assert.equal(ownEndorse.status, 400);

    const endorse = await request(app).post(`/api/debates/${debate._id}/comments/${arg.body.data._id}/endorse`).set(auth(hank.token));
    assert.equal(endorse.body.data.endorsements, 1);

    const reply = await request(app).post(`/api/debates/${debate._id}/comments`).set(auth(hank.token))
      .send({ content: 'Herding happens without counts too.', parentComment: arg.body.data._id });
    assert.equal(reply.status, 201, 'replies do not need their own source');

    const list = await request(app).get(`/api/debates/${debate._id}/comments`).set(auth(hank.token));
    assert.equal(list.body.data.comments.length, 1, 'replies are not listed as top-level arguments');
    assert.equal(list.body.data.comments[0].repliesCount, 1);
    assert.equal(list.body.data.comments[0].isEndorsed, true);

    const view = await request(app).get(`/api/debates/${debate._id}`);
    assert.equal(view.body.data.pulse.totalArguments, 1);
    assert.equal(view.body.data.pulse.evidenceBacked, 1);
    assert.equal(view.body.data.stats.totalComments, 2);
    assert.equal(view.body.data.stats.participantCount, 2);

    const del = await request(app).delete(`/api/debates/${debate._id}/comments/${arg.body.data._id}`).set(auth(ivy.token));
    assert.equal(del.body.data.removed, 2);
  });

  test('debate lists sync lifecycles and flag debates that are ending soon', async () => {
    const Debate = require('../models/Debate');
    const { syncAllDebates } = require('../services/debateLifecycle');
    // 30 minutes left of a 24-hour debate: inside the one-hour "ending soon" window.
    await Debate.updateOne({ _id: debate._id }, { 'lifecycle.endsAt': new Date(Date.now() + 30 * 60 * 1000) });
    await syncAllDebates({ force: true });

    const list = await request(app).get('/api/debates').query({ sort: 'ending_soon' });
    assert.equal(list.status, 200);
    const listed = list.body.data.debates.find((d) => d._id === debate._id);
    assert.equal(listed.status, 'ending_soon');
    assert.equal(listed.creator.username, 'hank');
    assert.equal(listed.timeline, undefined, 'lists omit the timeline payload');
  });

  test('expired debates close with an honest verdict and reject votes', async () => {
    const Debate = require('../models/Debate');
    await Debate.updateOne({ _id: debate._id }, { 'lifecycle.endsAt': new Date(Date.now() - 1000) });

    const view = await request(app).get(`/api/debates/${debate._id}`);
    assert.equal(view.body.data.status, 'finished');
    assert.match(view.body.data.finalVerdict.communityVerdict, /Keep them/);

    const late = await request(app).post(`/api/debates/${debate._id}/vote`).set(auth(hank.token))
      .send({ optionId: debate.options[0]._id });
    assert.equal(late.status, 400);

    const notes = await request(app).get('/api/notifications').set(auth(hank.token));
    assert.ok(notes.body.data.notifications.some((n) => n.type === 'debateFinished'));
  });

  test('only the creator can delete a debate', async () => {
    const forbidden = await request(app).delete(`/api/debates/${debate._id}`).set(auth(ivy.token));
    assert.equal(forbidden.status, 403);
    const ok = await request(app).delete(`/api/debates/${debate._id}`).set(auth(hank.token));
    assert.equal(ok.status, 200);
  });
});

describe('messages', () => {
  test('send, list with unread count and read', async () => {
    const jay = await register('jay');
    const kim = await register('kim');

    const self = await request(app).post('/api/messages').set(auth(jay.token)).send({ recipientId: jay.id, content: 'hi me' });
    assert.equal(self.status, 400);

    const sent = await request(app).post('/api/messages').set(auth(jay.token)).send({ recipientId: kim.id, content: 'Prove it.' });
    assert.equal(sent.status, 201);

    const convs = await request(app).get('/api/messages/conversations').set(auth(kim.token));
    assert.equal(convs.body.data.length, 1);
    assert.equal(convs.body.data[0].unread, 1);

    const msgs = await request(app).get(`/api/messages/${convs.body.data[0]._id}`).set(auth(kim.token));
    assert.equal(msgs.body.data.messages[0].content, 'Prove it.');

    const after = await request(app).get('/api/messages/conversations').set(auth(kim.token));
    assert.equal(after.body.data[0].unread, 0);

    const outsider = await register('lee');
    const peek = await request(app).get(`/api/messages/${convs.body.data[0]._id}`).set(auth(outsider.token));
    assert.equal(peek.status, 403);
  });
});
