const express = require('express');
const router = express.Router();
const { globalSearch } = require('../controllers/searchController');

router.route('/').get(globalSearch);

module.exports = router;
