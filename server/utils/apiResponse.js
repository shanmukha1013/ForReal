/**
 * Standardized API Response structure
 * { success, message, data, errors, timestamp }
 */

const successResponse = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    errors: null,
    timestamp: new Date().toISOString(),
  });
};

const errorResponse = (res, statusCode, message, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Returns a plain response object (for use in res.json(apiResponse(...)))
 * @param {boolean} success - Whether the operation succeeded
 * @param {string} message - Response message
 * @param {*} data - Response payload
 * @param {Array} errors - Error details (optional)
 * @returns {Object} - Formatted response object
 */
const apiResponse = (success, message, data = null, errors = null) => {
  return {
    success,
    message,
    data,
    errors,
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  successResponse,
  errorResponse,
  apiResponse,
};
