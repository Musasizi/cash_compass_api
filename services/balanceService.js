/**
 * services/balanceService.js – Centralised balance recalculation
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A SEPARATE BALANCE SERVICE?
 * ─────────────────────────────────────────────────────────────────────────────
 * The user's balance is derived data — it is never entered directly.
 * It is always computed from:
 *
 *   amount_balance = SUM(all income amounts) - SUM(all expense amounts)
 *
 * Any time an income or expense record is created, updated, or deleted,
 * the balance must be recalculated to stay accurate.
 *
 * Instead of repeating this logic in incomeService.js AND expenseService.js,
 * we extract it into a single function here — the DRY principle:
 *   DRY = Don't Repeat Yourself
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CALL CHAIN (every mutating operation ends here):
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   createIncome()  ──►  recalculateBalance()  ──►  Balance.upsertLive()
 *   updateIncome()  ──►  recalculateBalance()  ──►  Balance.upsertLive()
 *   deleteIncome()  ──►  recalculateBalance()  ──►  Balance.upsertLive()
 *   createExpense() ──►  recalculateBalance()  ──►  Balance.upsertLive()
 *   ... etc.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UPSERT PATTERN:
 * ─────────────────────────────────────────────────────────────────────────────
 * "Upsert" = INSERT if the row doesn't exist, UPDATE if it does.
 * The balance table always has exactly one row with snapshot_type = 'live'.
 * We never delete and re-insert — we just update it in place.
 * See balanceModel.js for the SQL:  INSERT … ON DUPLICATE KEY UPDATE
 */
const Income = require('../models/incomeModel');
const Expense = require('../models/expenseModel');
const Balance = require('../models/balanceModel');

/**
 * Aggregate totals from the DB, then upsert the LIVE balance row.
 *
 * STEP-BY-STEP:
 *   1. Ask incomeModel for the SUM of all income amounts.
 *   2. Ask expenseModel for the SUM of all expenditure amounts.
 *   3. Subtract: amount_balance = total_income - total_expense.
 *   4. Write the three numbers back to the balance table (upsert).
 *   5. Return them to the caller so the API response can show fresh data.
 *
 * DESTRUCTURING:
 *   Income.sumAll() returns a Promise that resolves to a mysql2 result array:
 *     [ [{ total: '3580000.00' }], <FieldPacket[]> ]
 *
 *   const [[{ total: total_income }]] = await Income.sumAll();
 *   ──────────────────────────────────────────────────────
 *   Outer [ ] → unwrap the mysql2 outer array  → [ [{ total: '3580000.00' }] ]
 *   Inner [ ] → unwrap the rows array          → [{ total: '3580000.00' }]
 *   { total: total_income } → destructure the object, renaming `total` to `total_income`
 *
 * @returns {Promise<{ amount_balance: number, total_income: number, total_expense: number }>}
 */
const recalculateBalance = async () => {
    // Step 1 & 2: Fetch SUM totals from both tables in parallel would be faster,
    // but sequential is simpler and the tables are small — either is fine here.
    const [[{ total: total_income }]] = await Income.sumAll();
    const [[{ total: total_expense }]] = await Expense.sumAll();

    // Step 3: The core formula. Number() converts MySQL decimal strings to JS numbers.
    // Without Number(), '3580000.00' - '1311000.00' would do string concatenation in
    // some edge cases, or produce NaN. Always convert before arithmetic.
    const amount_balance = Number(total_income) - Number(total_expense);

    // Step 4: Persist the result. One row with snapshot_type = 'live' is always kept.
    await Balance.upsertLive(amount_balance, total_income, total_expense);

    // Step 5: Return the fresh numbers so the API response reflects the update immediately.
    // The UI can show "New balance: UGX 2,269,000" right after the user adds income.
    return {
        amount_balance: Number(amount_balance),
        total_income: Number(total_income),
        total_expense: Number(total_expense),
    };
};

module.exports = { recalculateBalance };
