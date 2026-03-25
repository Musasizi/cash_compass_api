/**
 * controllers/referenceDataController.js
 * GET  /api/reference-data/income-types
 * GET  /api/reference-data/expense-types
 */
const ReferenceData = require('../models/referenceDataModel');
const { ok, serverError } = require('../utils/response');

const getIncomeTypes = async (req, res) => {
    try {
        const [rows] = await ReferenceData.getAllIncomeTypes();
        return ok(res, rows, 'Income types retrieved');
    } catch (err) {
        return serverError(res, err);
    }
};

const getExpenseTypes = async (req, res) => {
    try {
        const [rows] = await ReferenceData.getAllExpenseTypes();
        return ok(res, rows, 'Expense types retrieved');
    } catch (err) {
        return serverError(res, err);
    }
};

module.exports = { getIncomeTypes, getExpenseTypes };
