const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/searchController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.route('/').get(optionalAuth, globalSearch);

module.exports = router;
