const winston = require('winston');
const { format, transports } = winston;

// Define custom format for development (colored, readable)
const devFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

// Define custom format for production (structured JSON)
const prodFormat = format.combine(
  format.timestamp(),
  format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
    // In production, we might add file transports or external loggers here
  ],
});

module.exports = logger;
