/**
 * models/referenceDataModel.js – income_type and expense_type queries
 */
const db = require('../config/db');

const ReferenceData = {
    /** Return all income types */
    getAllIncomeTypes: () =>
        db.query('SELECT * FROM income_type ORDER BY id'),

    /** Return all expense types */
    getAllExpenseTypes: () =>
        db.query('SELECT * FROM expense_type ORDER BY id_expense'),

    /** Create an income type */
    createIncomeType: (name, description) =>
        db.query('INSERT INTO income_type (name, description) VALUES (?, ?)', [name, description || '']),

    /** Create an expense type */
    createExpenseType: (name, description) =>
        db.query('INSERT INTO expense_type (name, description) VALUES (?, ?)', [name, description || '']),
};

module.exports = ReferenceData;
