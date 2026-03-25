/**
 * services/dashboardService.js – Aggregated stats for the dashboard
 */
const db = require('../config/db');

/**
 * Build all dashboard stats in a single call.
 * @param {{ from?: string, to?: string }} filters  optional date range
 */
const getDashboardStats = async ({ from, to } = {}) => {
    const dateFilter = (alias) => {
        const parts = [];
        const params = [];
        if (from) { parts.push(`${alias}.date_created >= ?`); params.push(from); }
        if (to) { parts.push(`${alias}.date_created <= ?`); params.push(to); }
        return { clause: parts.length ? 'AND ' + parts.join(' AND ') : '', params };
    };

    // ── Balance ────────────────────────────────────────────────────────────────
    const [[liveBalance]] = await db.query(
        "SELECT amount_balance, total_income, total_expense FROM balance WHERE snapshot_type = 'live' LIMIT 1"
    );

    // ── Income totals + breakdown ──────────────────────────────────────────────
    const { clause: iClause, params: iParams } = dateFilter('i');
    const [[incomeTotal]] = await db.query(
        `SELECT COALESCE(SUM(i.amount), 0) AS total FROM income i WHERE 1=1 ${iClause}`,
        iParams
    );
    const [incomeByType] = await db.query(
        `SELECT it.name, COALESCE(SUM(i.amount), 0) AS total
     FROM income_type it
     LEFT JOIN income i ON i.income_type_id = it.id ${iClause ? 'AND ' + iClause.replace('AND ', '') : ''}
     GROUP BY it.id, it.name
     ORDER BY total DESC`,
        iParams
    );

    // ── Expense totals + breakdown ─────────────────────────────────────────────
    const { clause: eClause, params: eParams } = dateFilter('e');
    const [[expenseTotal]] = await db.query(
        `SELECT COALESCE(SUM(e.amount_expenditure), 0) AS total FROM expense e WHERE 1=1 ${eClause}`,
        eParams
    );
    const [expenseByType] = await db.query(
        `SELECT et.name, COALESCE(SUM(e.amount_expenditure), 0) AS total
     FROM expense_type et
     LEFT JOIN expense e ON e.id_expense = et.id_expense ${eClause ? 'AND ' + eClause.replace('AND ', '') : ''}
     GROUP BY et.id_expense, et.name
     ORDER BY total DESC`,
        eParams
    );

    // ── Balance trend (last 30 daily snapshots) ────────────────────────────────
    const [trend] = await db.query(
        `SELECT DATE_FORMAT(date_created, '%Y-%m-%d') AS date, amount_balance
     FROM balance
     WHERE snapshot_type = 'daily'
     ORDER BY date_created DESC LIMIT 30`
    );

    return {
        balance: liveBalance ?? { amount_balance: 0, total_income: 0, total_expense: 0 },
        totalIncome: Number(incomeTotal.total),
        totalExpense: Number(expenseTotal.total),
        incomeBreakdown: incomeByType.map(r => ({ name: r.name, total: Number(r.total) })),
        expenseBreakdown: expenseByType.map(r => ({ name: r.name, total: Number(r.total) })),
        trend: trend.reverse().map(r => ({ date: r.date, amount_balance: Number(r.amount_balance) })),
    };
};

module.exports = { getDashboardStats };
