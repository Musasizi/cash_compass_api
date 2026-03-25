/**
 * models/balanceModel.js – Data access layer for balance snapshots
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BALANCE TABLE HAS TWO KINDS OF ROWS:
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   snapshot_type = 'live'
 *     Exactly ONE row of this type ever exists.
 *     Updated every time income or expense changes.
 *     Represents the current real-time balance.
 *     Think of it like a scoreboard that always shows the latest total.
 *
 *   snapshot_type = 'daily'
 *     One new row is INSERTED each night by the cron job.
 *     These rows are never updated — they are a historical record.
 *     Used to power the "Balance Over Time" trend chart.
 *     Think of it like a journal: one entry per day, never erased.
 *
 * WHY KEEP BOTH?
 *   • The live row gives instant answers: "What is my balance right now?"
 *   • The daily rows give history:       "How has my balance changed over time?"
 *   You need both for a useful personal finance app.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE UPSERT PATTERN (INSERT … ON DUPLICATE KEY UPDATE)
 * ─────────────────────────────────────────────────────────────────────────────
 * A normal INSERT would fail on the second call (duplicate snapshot_type='live').
 * A normal UPDATE would fail on the first call (no row exists yet).
 * Upsert handles both cases in one SQL statement:
 *   • If the row does NOT exist → INSERT it (first time the app runs)
 *   • If the row DOES exist     → UPDATE it (every subsequent recalculation)
 *
 * This requires a UNIQUE constraint on snapshot_type in the schema.
 * See scripts/seed.js — the balance table CREATE includes UNIQUE(snapshot_type) for 'live'.
 */
const db = require('../config/db');

const Balance = {

    /**
     * Fetch the current LIVE balance row.
     *
     * There will always be exactly one row with snapshot_type = 'live' after
     * the first income or expense record is created.
     * LIMIT 1 is a safety net — it ensures we never accidentally get duplicates.
     *
     * @returns {Promise}  – rows[0] contains the live balance object, or undefined
     */
    getLive: () =>
        db.query("SELECT * FROM balance WHERE snapshot_type = 'live' LIMIT 1"),

    /**
     * Upsert the live balance row.
     *
     * UPSERT EXPLAINED:
     *   INSERT INTO balance (...) VALUES (?)       ← try to insert first
     *   ON DUPLICATE KEY UPDATE                    ← if unique constraint fires...
     *     amount_balance = VALUES(amount_balance)  ← ...update these columns instead
     *
     *   VALUES(column_name) inside ON DUPLICATE KEY UPDATE refers to the value
     *   that was in the attempted INSERT — a MySQL shorthand to avoid repeating params.
     *
     * WHY UPDATE date_created?
     *   We reset it to CURRENT_TIMESTAMP on every recalculation so we can always
     *   see when the balance was last refreshed (useful for debugging).
     *
     * @param {number} amount_balance  – income total minus expense total
     * @param {number} total_income    – sum of all income
     * @param {number} total_expense   – sum of all expenditure
     * @returns {Promise}
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
     *
     * Called once per night by the cron job in jobs/dailyBalanceSnapshot.js.
     * This is a plain INSERT (not upsert) — we want a new row each day.
     * The date_created column defaults to CURRENT_TIMESTAMP in MySQL.
     *
     * @param {number} amount_balance
     * @param {number} total_income
     * @param {number} total_expense
     * @returns {Promise}
     */
    insertDailySnapshot: (amount_balance, total_income, total_expense) => {
        const sql = `
      INSERT INTO balance (amount_balance, total_income, total_expense, snapshot_type)
      VALUES (?, ?, ?, 'daily')
    `;
        return db.query(sql, [amount_balance, total_income, total_expense]);
    },

    /**
     * Return the most recent daily snapshots, ordered oldest-to-newest.
     *
     * ORDERING TRICK:
     *   We want the last `limit` days, ordered chronologically (for a chart).
     *   But "give me the last 30 rows" with ASC order would give the OLDEST 30.
     *   The trick: fetch DESC (newest first) with LIMIT, then reverse in JavaScript.
     *   See dashboardService.js: trend.reverse()
     *
     * @param {number} limit  – number of past days to return (default 30)
     * @returns {Promise}
     */
    getDailySnapshots: (limit = 30) =>
        db.query(
            "SELECT * FROM balance WHERE snapshot_type = 'daily' ORDER BY date_created DESC LIMIT ?",
            [limit]
        ),
};

module.exports = Balance;
