const mongoose = require('mongoose');

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Thrown errors carry an HTTP status that the error middleware respects.
const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isObjectId = (value) =>
  typeof value === 'string' && mongoose.Types.ObjectId.isValid(value) && /^[a-f0-9]{24}$/i.test(value);

const asString = (value) => (typeof value === 'string' ? value : '');

const asTrimmed = (value) => asString(value).trim();

// Parses a positive integer query parameter and clamps it into [min, max].
const clampInt = (value, { fallback, min = 1, max }) => {
  const parsed = Number.parseInt(asString(value), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const normalizeUsername = (value) => asTrimmed(value).toLowerCase();

const validateUsername = (username) => {
  if (!USERNAME_PATTERN.test(username)) {
    throw httpError(400, 'Username must be 3-20 characters: lowercase letters, numbers or underscores.');
  }
};

const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    throw httpError(400, 'Password must be at least 8 characters.');
  }
  if (password.length > 128) {
    throw httpError(400, 'Password must be at most 128 characters.');
  }
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Only http(s) links are accepted as evidence so a stored URL can never become
// a javascript: or data: link when rendered.
const normalizeReferenceUrl = (value) => {
  const raw = asTrimmed(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
};

module.exports = {
  EMAIL_PATTERN,
  httpError,
  isObjectId,
  asString,
  asTrimmed,
  clampInt,
  normalizeUsername,
  validateUsername,
  validatePassword,
  escapeRegex,
  normalizeReferenceUrl,
};
