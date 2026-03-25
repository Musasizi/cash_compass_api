/**
 * controllers/balanceController.js
 * GET /api/balance         – current live balance
 * GET /api/balance/trend   – daily snapshot history
 */
const Balance = require('../models/balanceModel');
const { ok, serverError } = require('../utils/response');

const getLiveBalance = async (req, res) => {
    try {
        const [rows] = await Balance.getLive();
        const balance = rows[0] ?? { amount_balance: 0, total_income: 0, total_expense: 0 };
        return ok(res, balance, 'Live balance retrieved');
    } catch (err) {
        return serverError(res, err);
    }
};

const getBalanceTrend = async (req, res) => {
    const limit = Math.min(Number.parseInt(req.query.days, 10) || 30, 365);
    try {
        const [rows] = await Balance.getDailySnapshots(limit);
        return ok(res, rows.reverse(), 'Balance trend retrieved');
    } catch (err) {
        return serverError(res, err);
    }
};

module.exports = { getLiveBalance, getBalanceTrend };
