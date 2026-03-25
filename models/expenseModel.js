/**
 * models/expenseModel.js – Data access layer for expense
 */
const db = require('../config/db');

const Expense = {
    /**
     * Insert a new expense record.
     * @param {string} name_expense
     * @param {number} amount           – budgeted amount
     * @param {number} amount_expenditure – actual spend (used for balance)
     * @param {number} id_expense       – FK → expense_type.id_expense
     * @param {string|null} date_created
     */
    create: (name_expense, amount, amount_expenditure, id_expense, date_created = null) => {
        const sql = `
      INSERT INTO expense (name_expense, amount, amount_expenditure, id_expense, date_created)
      VALUES (?, ?, ?, ?, COALESCE(?, CURDATE()))
    `;
        return db.query(sql, [name_expense, amount, amount_expenditure, id_expense, date_created]);
    },

    /**
     * Return all expense records joined with their type label.
     * Supports optional filters: type_id, from (date), to (date).
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
        if (type_id) { sql += ' AND e.id_expense = ?'; params.push(type_id); }
        if (from) { sql += ' AND e.date_created >= ?'; params.push(from); }
        if (to) { sql += ' AND e.date_created <= ?'; params.push(to); }
        sql += ' ORDER BY e.date_created DESC, e.id DESC';
        return db.query(sql, params);
    },

    /** Return a single expense record by id */
    getById: (id) =>
        db.query(`
      SELECT e.id, e.name_expense, e.amount, e.amount_expenditure,
             e.date_created, e.id_expense, et.name AS expense_type_name
      FROM   expense e
      JOIN   expense_type et ON et.id_expense = e.id_expense
      WHERE  e.id = ?
    `, [id]),

    /** Partial update */
    update: (id, fields) => {
        const allowed = ['name_expense', 'amount', 'amount_expenditure', 'id_expense', 'date_created'];
        const sets = [];
        const params = [];
        for (const key of allowed) {
            if (fields[key] !== undefined) {
                sets.push(`${key} = ?`);
                params.push(fields[key]);
            }
        }
        params.push(id);
        return db.query(`UPDATE expense SET ${sets.join(', ')} WHERE id = ?`, params);
    },

    /** Delete an expense record */
    delete: (id) =>
        db.query('DELETE FROM expense WHERE id = ?', [id]),

    /** Sum all expenditure (used by balance service) */
    sumAll: () =>
        db.query('SELECT COALESCE(SUM(amount_expenditure), 0) AS total FROM expense'),
};

module.exports = Expense;
