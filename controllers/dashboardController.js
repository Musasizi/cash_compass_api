/**
 * controllers/dashboardController.js
 * GET /api/dashboard  – aggregated stats (balance, income, expense, trend)
 * Accepts optional query params: from, to (ISO dates)
 */
const { getDashboardStats } = require('../services/dashboardService');
const { ok, serverError } = require('../utils/response');

const getDashboard = async (req, res) => {
    const { from, to } = req.query;
    try {
        const stats = await getDashboardStats({ from, to });
        return ok(res, stats, 'Dashboard stats retrieved');
    } catch (err) {
        return serverError(res, err);
    }
};

module.exports = { getDashboard };
