// Feature flags for future functionality
// These can be toggled without changing core business logic.

const features = {
  enableDebates: process.env.FEATURE_DEBATES === 'true' || false,
  enableMessaging: process.env.FEATURE_MESSAGING === 'true' || false,
  enableNotifications: process.env.FEATURE_NOTIFICATIONS === 'true' || false,
  enableRegistration: process.env.FEATURE_REGISTRATION !== 'false', // Default true
};

module.exports = features;
