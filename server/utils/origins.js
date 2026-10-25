const config = require('../config/config');

// CLIENT_URL may be a comma-separated list and may omit the protocol.
const configuredHosts = config.app.clientUrl
  .split(',')
  .map((url) => url.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredHosts.flatMap((host) => [`https://${host}`, `http://${host}`]),
  'http://localhost:5173',
  'http://localhost:4173',
]);

// Vercel preview deployments for this project share the production project
// name, e.g. forreal-git-feature-user.vercel.app.
const vercelProject = configuredHosts
  .map((host) => host.match(/^([a-z0-9-]+)\.vercel\.app$/i)?.[1])
  .find(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // same-origin requests, curl, server-to-server
  if (allowedOrigins.has(origin)) return true;
  if (vercelProject) {
    const host = origin.replace(/^https:\/\//, '');
    if (host.startsWith(`${vercelProject}-`) && host.endsWith('.vercel.app')) return true;
  }
  return false;
};

const corsOriginCallback = (origin, callback) => {
  if (isAllowedOrigin(origin)) return callback(null, true);
  return callback(new Error('Not allowed by CORS'));
};

module.exports = { isAllowedOrigin, corsOriginCallback };
