/**
 * routes/dashboardRoutes.js
 */
const express = require('express');
const { getDashboard } = require('../controllers/dashboardController');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', auth, getDashboard);

module.exports = router;
