/**
 * services/dashboardService.js – Aggregated statistics for the dashboard
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS FILE TEACHES:
 *  • Running multiple SQL queries from one service function
 *  • SQL aggregation: SUM(), COALESCE(), GROUP BY
 *  • LEFT JOIN vs INNER JOIN
 *  • Parameterised queries to prevent SQL injection
 *  • Dynamic WHERE clause construction
 *  • Mapping raw DB rows to clean API response objects
 * ─────────────────────────────────────────────────────────────────────────────
 */
const db = require('../config/db');

/**
 * Build all dashboard statistics in a single service call.
 *
 * This is called by GET /api/dashboard and returns everything the
 * dashboard page needs in one round trip:
 *   • Live balance (current total)
 *   • Total income / total expense (for the period, if filters given)
 *   • Income breakdown by category (for the donut chart)
 *   • Expense breakdown by category (for the donut chart)
 *   • 30-day balance trend (for the area chart)
 *
 * WHY ONE BIG FUNCTION?
 *   The frontend only needs to make one API call to load the entire dashboard.
 *   Fewer network round-trips = faster page loads. This is a common pattern
 *   in real-world APIs called a "BFF" — Backend For Frontend.
 *
 * @param {{ from?: string, to?: string }} filters  – optional date range (YYYY-MM-DD)
 */
const getDashboardStats = async ({ from, to } = {}) => {

    // ── HELPER: Build the date range WHERE clause ──────────────────────────────
    //
    // This inner function generates a SQL fragment + params array for date filtering.
    // It takes an alias (like 'i' for income, 'e' for expense) so we can write
    // i.date_created or e.date_created in the correct query.
    //
    // WHY PARAMETERISED QUERIES?
    //   NEVER concatenate user input directly into SQL strings:
    //     sql += ` AND date_created >= '${from}'`    ← DANGEROUS (SQL injection)
    //
    //   Instead, use ? placeholders and pass values as an array:
    //     sql += ` AND date_created >= ?`
    //     params.push(from)
    //
    //   MySQL replaces ? safely, preventing SQL injection attacks.
    //   See: https://en.wikipedia.org/wiki/SQL_injection
    //
    // RETURNS:
    //   clause – a string like "AND i.date_created >= ? AND i.date_created <= ?"
    //   params – the matching values array  ["2025-01-01", "2025-03-31"]
    const dateFilter = (alias) => {
        const parts = [];
        const params = [];
        if (from) { parts.push(`${alias}.date_created >= ?`); params.push(from); }
        if (to)   { parts.push(`${alias}.date_created <= ?`); params.push(to);   }
        return { clause: parts.length ? 'AND ' + parts.join(' AND ') : '', params };
    };

    // ── 1. Live Balance ────────────────────────────────────────────────────────
    //
    // The balance table always has one row with snapshot_type = 'live'.
    // This row is updated every time income/expense is added, edited, or deleted.
    // It is NOT filtered by date — it always shows the current total.
    //
    // db.query() returns a Promise resolving to [rows, fields].
    // We only need rows, so we destructure: const [[liveBalance]] = await db.query(...)
    //   Outer [] → unwrap [rows, fields] → rows
    //   Inner [] → unwrap the rows array → first row object
    const [[liveBalance]] = await db.query(
        "SELECT amount_balance, total_income, total_expense FROM balance WHERE snapshot_type = 'live' LIMIT 1"
    );

    // ── 2. Income total for the selected period ────────────────────────────────
    //
    // COALESCE(SUM(i.amount), 0):
    //   SUM() returns NULL when there are no rows (e.g. no income this month).
    //   COALESCE(value, 0) replaces NULL with 0 — safe for arithmetic on the JS side.
    const { clause: iClause, params: iParams } = dateFilter('i');
    const [[incomeTotal]] = await db.query(
        `SELECT COALESCE(SUM(i.amount), 0) AS total FROM income i WHERE 1=1 ${iClause}`,
        iParams
    );

    // ── 3. Income breakdown by category ───────────────────────────────────────
    //
    // LEFT JOIN vs INNER JOIN — this is important:
    //
    //   INNER JOIN: Only returns rows where BOTH tables have a match.
    //     → If "Investment" income type has 0 records, it would disappear from the chart.
    //
    //   LEFT JOIN: Returns ALL rows from the LEFT table (income_type), even if there
    //     are no matching rows in the right table (income).
    //     → "Investment" appears in the chart with total = 0.
    //
    // We use LEFT JOIN so every category always shows up in the donut chart,
    // making it easier for users to see which categories they haven't used yet.
    //
    // GROUP BY it.id, it.name — aggregate rows per category
    // ORDER BY total DESC     — biggest category first in the chart
    const [incomeByType] = await db.query(
        `SELECT it.name, COALESCE(SUM(i.amount), 0) AS total
         FROM income_type it
         LEFT JOIN income i ON i.income_type_id = it.id ${iClause ? 'AND ' + iClause.replace('AND ', '') : ''}
         GROUP BY it.id, it.name
         ORDER BY total DESC`,
        iParams
    );

    // ── 4. Expense total for the selected period ───────────────────────────────
    //
    // Note: we use amount_expenditure (actual spend), NOT amount (budgeted).
    // The balance formula is:  balance = income - amount_expenditure
    const { clause: eClause, params: eParams } = dateFilter('e');
    const [[expenseTotal]] = await db.query(
        `SELECT COALESCE(SUM(e.amount_expenditure), 0) AS total FROM expense e WHERE 1=1 ${eClause}`,
        eParams
    );

    // ── 5. Expense breakdown by category ──────────────────────────────────────
    //
    // Same LEFT JOIN pattern as income — so zero-spend categories still appear.
    const [expenseByType] = await db.query(
        `SELECT et.name, COALESCE(SUM(e.amount_expenditure), 0) AS total
         FROM expense_type et
         LEFT JOIN expense e ON e.id_expense = et.id_expense ${eClause ? 'AND ' + eClause.replace('AND ', '') : ''}
         GROUP BY et.id_expense, et.name
         ORDER BY total DESC`,
        eParams
    );

    // ── 6. Balance trend (last 30 daily snapshots) ────────────────────────────
    //
    // The cron job in jobs/dailyBalanceSnapshot.js creates one row per day
    // with snapshot_type = 'daily'. Here we fetch the 30 most recent and
    // reverse them so the chart reads left-to-right (oldest → newest).
    //
    // DATE_FORMAT(date_created, '%Y-%m-%d') converts the full DATETIME to just
    // the date string "2025-06-15" for cleaner chart axis labels.
    const [trend] = await db.query(
        `SELECT DATE_FORMAT(date_created, '%Y-%m-%d') AS date, amount_balance
         FROM balance
         WHERE snapshot_type = 'daily'
         ORDER BY date_created DESC LIMIT 30`
    );

    // ── 7. Compose and return the response object ──────────────────────────────
    //
    // .map(r => ({ name: r.name, total: Number(r.total) }))
    //   MySQL returns decimal values as strings: "1500000.00"
    //   Number() converts them to JS numbers: 1500000
    //   This prevents issues in the UI when doing arithmetic or rendering charts.
    //
    // trend.reverse() — we fetched DESC (newest first) for the LIMIT to work,
    //   then reverse in JS so the chart goes chronologically left-to-right.
    return {
        balance: liveBalance ?? { amount_balance: 0, total_income: 0, total_expense: 0 },
        totalIncome:      Number(incomeTotal.total),
        totalExpense:     Number(expenseTotal.total),
        incomeBreakdown:  incomeByType.map(r  => ({ name: r.name,  total: Number(r.total) })),
        expenseBreakdown: expenseByType.map(r => ({ name: r.name, total: Number(r.total) })),
        trend: trend.reverse().map(r => ({ date: r.date, amount_balance: Number(r.amount_balance) })),
    };
};

module.exports = { getDashboardStats };
