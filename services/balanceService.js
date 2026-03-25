/**
 * services/balanceService.js – Centralised balance recalculation
 *
 * recalculateBalance() must be called after every income/expense
 * create, update, or delete operation to keep the live row accurate.
 *
 * Formula:
 *   amount_balance = SUM(income.amount) - SUM(expense.amount_expenditure)
 */
const Income = require('../models/incomeModel');
const Expense = require('../models/expenseModel');
const Balance = require('../models/balanceModel');

/**
 * Aggregate totals from the DB, then upsert the LIVE balance row.
 * Returns the updated balance object { amount_balance, total_income, total_expense }.
 */
const recalculateBalance = async () => {
    const [[{ total: total_income }]] = await Income.sumAll();
    const [[{ total: total_expense }]] = await Expense.sumAll();
    const amount_balance = Number(total_income) - Number(total_expense);

    await Balance.upsertLive(amount_balance, total_income, total_expense);

    return {
        amount_balance: Number(amount_balance),
        total_income: Number(total_income),
        total_expense: Number(total_expense),
    };
};

module.exports = { recalculateBalance };
