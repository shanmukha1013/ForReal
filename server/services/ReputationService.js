import User from '../models/User.js';
import Notification from '../models/Notification.js';

class ReputationService {
  /**
   * Add score points to a user's reputation fields.
   * @param {string} userId - User ID
   * @param {object} points - { credibility, logic, evidence } points to add
   */
  static async awardPoints(userId, { credibility = 0, logic = 0, evidence = 0 }) {
    const user = await User.findById(userId);
    if (!user) return;

    if (!user.reputation) {
      user.reputation = { credibilityScore: 1000, logicScore: 1000, evidenceScore: 1000 };
    }

    user.reputation.credibilityScore += credibility;
    user.reputation.logicScore += logic;
    user.reputation.evidenceScore += evidence;

    await this.checkAndAwardBadges(user);
    await user.save();
  }

  /**
   * Checks if user qualifies for new badges based on their reputation score.
   */
  static async checkAndAwardBadges(user) {
    const { credibilityScore, logicScore, evidenceScore } = user.reputation;
    const existingBadges = user.badges.map(b => b.name);
    const newBadges = [];

    const awardBadge = (name, icon) => {
      if (!existingBadges.includes(name)) {
        user.badges.push({ name, icon, awardedAt: new Date() });
        newBadges.push(name);
      }
    };

    if (credibilityScore >= 2000) awardBadge('Trusted Voice', 'Award');
    if (logicScore >= 2000) awardBadge('Master Logician', 'Brain');
    if (evidenceScore >= 2000) awardBadge('Fact Checker', 'ShieldCheck');
    if (credibilityScore >= 5000 && logicScore >= 5000 && evidenceScore >= 5000) {
      if (!user.expertStatus?.isExpert) {
        user.expertStatus = { isExpert: true, verifiedAt: new Date(), domain: 'General' };
        awardBadge('Verified Expert', 'CheckBadge');
      }
    }

    // Notify user of new badges
    for (const badge of newBadges) {
      const notification = new Notification({
        userId: user._id,
        type: 'system',
        text: `You earned the ${badge} badge!`,
        read: false
      });
      await notification.save();
    }
  }
}

export default ReputationService;
