/**
 * models/incomeModel.js – Data access layer for income
 */
const db = require('../config/db');

const Income = {
    /**
     * Insert a new income record.
     * @param {number} amount
     * @param {number} income_type_id
     * @param {string|null} date_created  YYYY-MM-DD; defaults to today if null
     */
    create: (amount, income_type_id, date_created = null) => {
        const sql = `
      INSERT INTO income (amount, income_type_id, date_created)
      VALUES (?, ?, COALESCE(?, CURDATE()))
    `;
        return db.query(sql, [amount, income_type_id, date_created]);
    },

    /**
     * Return all income records joined with their type label.
     * Supports optional filters: type_id, from (date), to (date).
     */
    getAll: ({ type_id, from, to } = {}) => {
        let sql = `
      SELECT
        i.id,
        i.amount,
        i.date_created,
        i.income_type_id,
        it.name  AS income_type_name
      FROM income i
      JOIN income_type it ON it.id = i.income_type_id
      WHERE 1=1
    `;
        const params = [];
        if (type_id) { sql += ' AND i.income_type_id = ?'; params.push(type_id); }
        if (from) { sql += ' AND i.date_created >= ?'; params.push(from); }
        if (to) { sql += ' AND i.date_created <= ?'; params.push(to); }
        sql += ' ORDER BY i.date_created DESC, i.id DESC';
        return db.query(sql, params);
    },

    /** Return a single income record by id */
    getById: (id) =>
        db.query(`
      SELECT i.id, i.amount, i.date_created, i.income_type_id, it.name AS income_type_name
      FROM   income i
      JOIN   income_type it ON it.id = i.income_type_id
      WHERE  i.id = ?
    `, [id]),

    /**
     * Update an income record (partial update — only provided fields change).
     */
    update: (id, fields) => {
        const allowed = ['amount', 'income_type_id', 'date_created'];
        const sets = [];
        const params = [];
        for (const key of allowed) {
            if (fields[key] !== undefined) {
                sets.push(`${key} = ?`);
                params.push(fields[key]);
            }
        }
        params.push(id);
        return db.query(`UPDATE income SET ${sets.join(', ')} WHERE id = ?`, params);
    },

    /** Delete an income record */
    delete: (id) =>
        db.query('DELETE FROM income WHERE id = ?', [id]),

    /** Sum all income (used by balance service) */
    sumAll: () =>
        db.query('SELECT COALESCE(SUM(amount), 0) AS total FROM income'),
};

module.exports = Income;
