/**
 * models/expenseModel.js – Data access layer for expense records
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS THE MODEL LAYER?
 * ─────────────────────────────────────────────────────────────────────────────
 * The model is the only place in the application that talks to the database.
 * Its job is simple: receive arguments → run SQL → return raw rows.
 *
 * The model does NOT:
 *   • Validate input (that's Joi in the validation/ folder)
 *   • Format output for the API (that's the controller)
 *   • Apply business rules (that's the service)
 *
 * This separation of concerns makes each layer independently testable.
 *
 * Compare this file with models/incomeModel.js — both follow the exact
 * same pattern. Learning one teaches you the other.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EXPENSE TABLE: TWO MONEY COLUMNS
 * ─────────────────────────────────────────────────────────────────────────────
 *   amount             – budgeted amount (how much you planned to spend)
 *   amount_expenditure – actual amount spent (used for balance calculation)
 *
 * Example: You budget UGX 200,000 for groceries but spend UGX 185,000.
 *   amount = 200000, amount_expenditure = 185000
 *   The balance service subtracts amount_expenditure, not amount.
 */
const db = require('../config/db');

const Expense = {

    /**
     * Insert a new expense record into the database.
     *
     * COALESCE(?, CURDATE()):
     *   If date_created is passed as null (the caller omitted it), MySQL
     *   automatically uses today's date via CURDATE().
     *   COALESCE returns the first non-NULL value in its argument list.
     *
     * @param {string}      name_expense
     * @param {number}      amount              – budgeted amount
     * @param {number}      amount_expenditure  – actual spend (affects balance)
     * @param {number}      id_expense          – FK → expense_type.id_expense
     * @param {string|null} date_created        – YYYY-MM-DD, or null for today
     * @returns {Promise}   – mysql2 result: [ResultSetHeader, FieldPacket[]]
     *                        Use result.insertId to get the new row's PK.
     */
    create: (name_expense, amount, amount_expenditure, id_expense, date_created = null) => {
        const sql = `
      INSERT INTO expense (name_expense, amount, amount_expenditure, id_expense, date_created)
      VALUES (?, ?, ?, ?, COALESCE(?, CURDATE()))
    `;
        return db.query(sql, [name_expense, amount, amount_expenditure, id_expense, date_created]);
    },

    /**
     * Return all expense records, joined with their expense_type name.
     *
     * DYNAMIC WHERE CLAUSE:
     *   WHERE 1=1  – always true, acts as an anchor so we can append
     *                "AND ..." conditions without worrying about the first one
     *                needing special treatment.
     *
     *   This pattern avoids messy logic like:
     *     if (firstCondition) sql += ' WHERE ...'
     *     else sql += ' AND ...'
     *
     * JOIN:
     *   We JOIN expense_type to include the human-readable category name
     *   (e.g. "Utilities") alongside the raw id_expense FK value.
     *
     * @param {object} filters – optional filter object
     * @param {number} [filters.type_id] – filter by expense category
     * @param {string} [filters.from]    – start date YYYY-MM-DD
     * @param {string} [filters.to]      – end date YYYY-MM-DD
     * @returns {Promise}
     */
    getAll: ({ type_id, from, to } = {}) => {
        let sql = `
      SELECT
        e.id,
        e.name_expense,
        e.amount,
        e.amount_expenditure,
        e.date_created,
        e.id_expense,
        et.name AS expense_type_name
      FROM expense e
      JOIN expense_type et ON et.id_expense = e.id_expense
      WHERE 1=1
    `;
        const params = [];
        // Each condition is only added if the filter value was provided
        if (type_id) { sql += ' AND e.id_expense = ?'; params.push(type_id); }
        if (from)    { sql += ' AND e.date_created >= ?'; params.push(from); }
        if (to)      { sql += ' AND e.date_created <= ?'; params.push(to); }
        sql += ' ORDER BY e.date_created DESC, e.id DESC';
        return db.query(sql, params);
    },

    /**
     * Return a single expense record by its primary key.
     * The JOIN fetches the category name alongside the record.
     *
     * @param {number} id
     * @returns {Promise}  – rows[0] is the record, or undefined if not found
     */
    getById: (id) =>
        db.query(`
      SELECT e.id, e.name_expense, e.amount, e.amount_expenditure,
             e.date_created, e.id_expense, et.name AS expense_type_name
      FROM   expense e
      JOIN   expense_type et ON et.id_expense = e.id_expense
      WHERE  e.id = ?
    `, [id]),

    /**
     * Partial update — only update fields that are explicitly provided.
     *
     * DYNAMIC SET CLAUSE:
     *   Instead of always updating every column (which would overwrite existing
     *   data with undefined/null), we only build SET clauses for fields
     *   that were actually passed in the request body.
     *
     *   Example: If only { amount_expenditure: 95000 } is sent, the SQL becomes:
     *     UPDATE expense SET amount_expenditure = ? WHERE id = ?
     *
     *   The `allowed` array acts as a whitelist — it prevents accidentally
     *   updating columns like `id` that the user shouldn't change.
     *
     * @param {number} id
     * @param {object} fields – partial object of field → new value
     * @returns {Promise}
     */
    update: (id, fields) => {
        // Whitelist: only these column names can be updated
        const allowed = ['name_expense', 'amount', 'amount_expenditure', 'id_expense', 'date_created'];
        const sets = [];
        const params = [];
        for (const key of allowed) {
            if (fields[key] !== undefined) {
                sets.push(`${key} = ?`);   // e.g. "amount_expenditure = ?"
                params.push(fields[key]);   // corresponding value for the ? placeholder
            }
        }
        params.push(id); // The WHERE id = ? value goes last
        return db.query(`UPDATE expense SET ${sets.join(', ')} WHERE id = ?`, params);
    },

    /**
     * Delete an expense record by its primary key.
     *
     * @param {number} id
     * @returns {Promise}
     */
    delete: (id) =>
        db.query('DELETE FROM expense WHERE id = ?', [id]),

    /**
     * Sum all expenditure amounts — used by balanceService.recalculateBalance().
     *
     * COALESCE(SUM(...), 0):
     *   SUM returns NULL when the table is empty. COALESCE ensures we always
     *   get 0 instead of NULL, so arithmetic in balanceService never breaks.
     *
     * @returns {Promise}  – rows[0][0].total is the sum as a string, e.g. "1311000.00"
     */
    sumAll: () =>
        db.query('SELECT COALESCE(SUM(amount_expenditure), 0) AS total FROM expense'),
};

module.exports = Expense;
