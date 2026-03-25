/**
 * services/incomeService.js – Business logic for income operations
 * Each mutating operation calls recalculateBalance() afterwards.
 */
const Income = require('../models/incomeModel');
const { recalculateBalance } = require('./balanceService');
const { toMysqlDate } = require('../utils/formatters');

const createIncome = async ({ amount, income_type_id, date_created }) => {
    const dateStr = date_created ? toMysqlDate(date_created) : null;
    const [result] = await Income.create(amount, income_type_id, dateStr);
    const balance = await recalculateBalance();
    return { insertId: result.insertId, balance };
};

const getAllIncome = async (filters = {}) => {
    const [rows] = await Income.getAll(filters);
    return rows;
};

const getIncomeById = async (id) => {
    const [rows] = await Income.getById(id);
    return rows[0] ?? null;
};

const updateIncome = async (id, fields) => {
    if (fields.date_created) fields.date_created = toMysqlDate(fields.date_created);
    await Income.update(id, fields);
    const balance = await recalculateBalance();
    return { balance };
};

const deleteIncome = async (id) => {
    await Income.delete(id);
    const balance = await recalculateBalance();
    return { balance };
};

module.exports = { createIncome, getAllIncome, getIncomeById, updateIncome, deleteIncome };
