const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load server/.env regardless of the directory the process was started from.
// Fall back to the repository-root .env for older local setups. Variables that
// are already set (e.g. by Render or CI) always win over file values.
const candidates = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '.env'),
];
const envFile = candidates.find((file) => fs.existsSync(file));
if (envFile) {
  dotenv.config({ path: envFile, quiet: true });
}

const requiredVariables = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL'];

const validateEnv = () => {
  const missingVariables = requiredVariables.filter((variable) => !process.env[variable]);

  if (missingVariables.length > 0) {
    console.error('\nCRITICAL ERROR: Missing required environment variables:');
    missingVariables.forEach((variable) => console.error(`   - ${variable}`));
    console.error('\nCopy server/.env.example to server/.env and fill in the values.\n');
    process.exit(1); // Fail fast
  }

  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
    console.warn('\nWARNING: JWT_SECRET is shorter than 32 characters. Use a long random value in production.\n');
  }
};

module.exports = validateEnv;
