const { errorResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // If Mongoose not found error, set to 404 and change message
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Log error using Winston instead of console.error
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.error(err.stack);
  }

  // Use standardized error response
  return errorResponse(
    res,
    statusCode,
    message,
    process.env.NODE_ENV === 'production' ? null : err.stack
  );
};

module.exports = { notFound, errorHandler };
