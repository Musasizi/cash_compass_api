/**
 * services/expenseService.js – Business logic for expense operations
 * Each mutating operation calls recalculateBalance() afterwards.
 */
const Expense = require('../models/expenseModel');
const { recalculateBalance } = require('./balanceService');
const { toMysqlDate } = require('../utils/formatters');

const createExpense = async ({ name_expense, amount, amount_expenditure, id_expense, date_created }) => {
    const dateStr = date_created ? toMysqlDate(date_created) : null;
    const [result] = await Expense.create(name_expense, amount, amount_expenditure, id_expense, dateStr);
    const balance = await recalculateBalance();
    return { insertId: result.insertId, balance };
};

const getAllExpenses = async (filters = {}) => {
    const [rows] = await Expense.getAll(filters);
    return rows;
};

const getExpenseById = async (id) => {
    const [rows] = await Expense.getById(id);
    return rows[0] ?? null;
};

const updateExpense = async (id, fields) => {
    if (fields.date_created) fields.date_created = toMysqlDate(fields.date_created);
    await Expense.update(id, fields);
    const balance = await recalculateBalance();
    return { balance };
};

const deleteExpense = async (id) => {
    await Expense.delete(id);
    const balance = await recalculateBalance();
    return { balance };
};

module.exports = { createExpense, getAllExpenses, getExpenseById, updateExpense, deleteExpense };
