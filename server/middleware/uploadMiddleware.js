const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    // Derive the extension from the validated MIME type, never from the
    // user-supplied filename, so uploads cannot masquerade as other files.
    const ext = ALLOWED_TYPES[file.mimetype];
    const random = crypto.randomBytes(6).toString('hex');
    cb(null, `${req.user?._id || 'user'}_${Date.now()}_${random}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
  const error = new Error('Only JPG, PNG, WEBP or GIF images are allowed.');
  error.statusCode = 400;
  return cb(error);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 4 }, // 5MB each, max 4 files
  fileFilter,
});

module.exports = { upload, uploadDir };
