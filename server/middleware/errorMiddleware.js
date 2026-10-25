const multer = require('multer');
const { errorResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Some libraries (and older multer filters) pass plain strings.
  const error = typeof err === 'string' ? new Error(err) : err;

  let statusCode = res.statusCode >= 400 ? res.statusCode : error.statusCode || 500;
  let message = error.message || 'Something went wrong';

  if (error.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${error.path || 'identifier'}`;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(error.errors || {})
      .map((e) => e.message)
      .join(' ') || 'Invalid input';
  } else if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyValue || {})[0];
    message = field ? `That ${field} is already in use.` : 'Duplicate value.';
  } else if (error instanceof multer.MulterError) {
    statusCode = 400;
    message = error.code === 'LIMIT_FILE_SIZE' ? 'Each image must be under 5MB.' : error.message;
  } else if (error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large.';
  } else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON body.';
  } else if (message === 'Not allowed by CORS') {
    statusCode = 403;
  }

  const isServerError = statusCode >= 500;
  if (isServerError) {
    logger.error(`${statusCode} - ${message} - ${req.method} ${req.originalUrl}`);
    if (process.env.NODE_ENV !== 'production' && error.stack) logger.error(error.stack);
  } else if (process.env.NODE_ENV === 'development') {
    logger.warn(`${statusCode} - ${message} - ${req.method} ${req.originalUrl}`);
  }

  // Never leak internal error details for unexpected failures in production.
  const publicMessage = isServerError && process.env.NODE_ENV === 'production'
    ? 'Something went wrong on our side. Please try again.'
    : message;

  return errorResponse(res, statusCode, publicMessage);
};

module.exports = { notFound, errorHandler };
