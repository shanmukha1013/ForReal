// Strips MongoDB operator keys ($gt, $where, ...) and dotted paths from
// user-supplied objects to prevent NoSQL injection. express-mongo-sanitize is
// incompatible with Express 5 (req.query became a read-only getter), so the
// body and route params are cleaned here and controllers coerce query values
// to strings before using them.

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !Buffer.isBuffer(value);

const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (!isPlainObject(value)) return value;

  return Object.keys(value).reduce((acc, key) => {
    if (key.startsWith('$') || key.includes('.')) return acc;
    acc[key] = clean(value[key]);
    return acc;
  }, {});
};

const sanitizeRequest = (req, res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.params) req.params = clean(req.params);
  next();
};

module.exports = { sanitizeRequest, clean };
