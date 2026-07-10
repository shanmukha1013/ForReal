const dotenv = require('dotenv');
// Load environment variables before validation
dotenv.config({ path: '../.env' });

const requiredVariables = [
  'PORT',
  'NODE_ENV',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'CLIENT_URL'
];

const validateEnv = () => {
  const missingVariables = [];

  requiredVariables.forEach((variable) => {
    if (!process.env[variable]) {
      missingVariables.push(variable);
    }
  });

  if (missingVariables.length > 0) {
    console.error(`\n🚨 CRITICAL ERROR: Missing required environment variables:`);
    missingVariables.forEach((variable) => {
      console.error(`   - ${variable}`);
    });
    console.error(`\nPlease check your .env file. Exiting process...\n`);
    process.exit(1); // Fail fast
  }
};

module.exports = validateEnv;
