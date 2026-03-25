/**
 * routes/balanceRoutes.js
 */
const express = require('express');
const { getLiveBalance, getBalanceTrend } = require('../controllers/balanceController');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/balance', auth, getLiveBalance);
router.get('/balance/trend', auth, getBalanceTrend);

module.exports = router;
