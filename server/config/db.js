import mongoose from 'mongoose';

// Robust MongoDB connection helper with retries and lifecycle hooks
const DEFAULT_RETRY = 5;
const RETRY_BASE_MS = 1000;

async function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function connectDB({ uri = process.env.MONGO_URI, retries = DEFAULT_RETRY } = {}) {
  if (!uri) {
    console.error('[db] Missing MONGO_URI environment variable');
    throw new Error('MONGO_URI is not set');
  }

  // Mongoose connection options are mostly sensible defaults in v6+,
  // but we keep explicit options for clarity and future tuning.
  const opts = {
    // useNewUrlParser: true, // Mongoose 6+ uses this by default
    // useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // how long to try selecting a server
    socketTimeoutMS: 45000,
  };

  let attempt = 0;
  while (attempt <= retries) {
    try {
      attempt += 1;
      await mongoose.connect(uri, opts);
      console.info('[db] MongoDB connected');

      // wire connection event listeners
      mongoose.connection.on('error', (err) => {
        console.error('[db] MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('[db] MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.info('[db] MongoDB reconnected');
      });

      // Graceful shutdown
      const graceful = async () => {
        try {
          await mongoose.connection.close(false);
          console.info('[db] MongoDB connection closed gracefully');
          process.exit(0);
        } catch (e) {
          console.error('[db] Error during graceful shutdown', e);
          process.exit(1);
        }
      };

      process.on('SIGINT', graceful);
      process.on('SIGTERM', graceful);

      return mongoose.connection;
    } catch (err) {
      console.error(`[db] MongoDB connect attempt ${attempt} failed:`, err.message || err);
      if (attempt > retries) {
        console.error('[db] All retry attempts exhausted. Exiting.');
        throw err;
      }
      const backoff = RETRY_BASE_MS * attempt;
      console.info(`[db] Retrying connection in ${backoff}ms...`);
      // exponential-ish backoff
      // eslint-disable-next-line no-await-in-loop
      await wait(backoff);
    }
  }
}

async function closeDB() {
  try {
    await mongoose.connection.close();
    console.info('[db] MongoDB connection closed');
  } catch (err) {
    console.error('[db] Error closing MongoDB connection', err);
  }
}

export default connectDB;
export { closeDB };