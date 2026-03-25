/**
 * models/balanceModel.js – Data access layer for balance snapshots
 */
const db = require('../config/db');

const Balance = {
    /**
     * Get the current LIVE balance row.
     * There should always be exactly one row with snapshot_type = 'live'.
     */
    getLive: () =>
        db.query("SELECT * FROM balance WHERE snapshot_type = 'live' LIMIT 1"),

    /**
     * Upsert the live balance row.
     * Uses INSERT … ON DUPLICATE KEY UPDATE so first call creates it,
     * subsequent calls update it.
     */
    upsertLive: (amount_balance, total_income, total_expense) => {
        const sql = `
      INSERT INTO balance (amount_balance, total_income, total_expense, snapshot_type)
      VALUES (?, ?, ?, 'live')
      ON DUPLICATE KEY UPDATE
        amount_balance = VALUES(amount_balance),
        total_income   = VALUES(total_income),
        total_expense  = VALUES(total_expense),
        date_created   = CURRENT_TIMESTAMP
    `;
        return db.query(sql, [amount_balance, total_income, total_expense]);
    },

    /**
     * Insert a new daily snapshot row.
     */
    insertDailySnapshot: (amount_balance, total_income, total_expense) => {
        const sql = `
      INSERT INTO balance (amount_balance, total_income, total_expense, snapshot_type)
      VALUES (?, ?, ?, 'daily')
    `;
        return db.query(sql, [amount_balance, total_income, total_expense]);
    },

    /**
     * Return daily snapshots ordered by date (used for trend chart).
     * @param {number} limit  how many past days to return (default 30)
     */
    getDailySnapshots: (limit = 30) =>
        db.query(
            "SELECT * FROM balance WHERE snapshot_type = 'daily' ORDER BY date_created DESC LIMIT ?",
            [limit]
        ),
};

module.exports = Balance;
