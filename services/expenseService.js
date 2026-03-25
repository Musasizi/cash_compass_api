/**
 * services/expenseService.js – Business logic for expense operations
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS THE SERVICE LAYER?
 * ─────────────────────────────────────────────────────────────────────────────
 * In MVC architecture there are three layers between the HTTP request and the DB:
 *
 *   Controller  →  Service  →  Model  →  Database
 *
 *   Controller: Parses request, validates input, sends HTTP response.
 *   Service:    Orchestrates business logic (this file).
 *   Model:      Executes raw SQL queries (expenseModel.js).
 *
 * WHY NOT PUT THE LOGIC IN THE CONTROLLER?
 *   If you ever add a mobile app, a CLI tool, or automated tests, you'd
 *   want to reuse the business logic without going through HTTP.
 *   Services make that possible — they are just plain async functions.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * KEY RULE: EVERY MUTATION RECALCULATES THE BALANCE
 * ─────────────────────────────────────────────────────────────────────────────
 * After create, update, or delete, this service always calls:
 *   const balance = await recalculateBalance();
 *
 * This keeps the live balance row in sync with reality.
 * The recalculated balance is returned in the API response so the UI can
 * update immediately without a second request.
 *
 * Compare with incomeService.js — the pattern is identical. That's intentional:
 * consistency makes the codebase easier to learn and maintain.
 */
const Expense = require('../models/expenseModel');
const { recalculateBalance } = require('./balanceService');
const { toMysqlDate } = require('../utils/formatters');

/**
 * Create a new expense record, then refresh the balance.
 *
 * DESTRUCTURING PARAMETERS:
 *   Instead of (data) then data.name_expense, we destructure directly:
 *   ({ name_expense, amount, amount_expenditure, id_expense, date_created })
 *   This makes the function signature self-documenting — you can see at a
 *   glance exactly which fields the function needs.
 *
 * DATE HANDLING:
 *   date_created is optional — the user may or may not send it.
 *   • If sent: toMysqlDate() converts "2025-03-25T00:00:00Z" → "2025-03-25"
 *   • If omitted: we pass null to the model, which then uses CURDATE() in SQL
 *
 * @param {object} data  – { name_expense, amount, amount_expenditure, id_expense, date_created? }
 * @returns {Promise<object>}  – { insertId: number, balance: object }
 */
const createExpense = async ({ name_expense, amount, amount_expenditure, id_expense, date_created }) => {
    const dateStr = date_created ? toMysqlDate(date_created) : null;
    const [result] = await Expense.create(name_expense, amount, amount_expenditure, id_expense, dateStr);
    const balance = await recalculateBalance(); // Always recalculate after a mutation
    return { insertId: result.insertId, balance };
};

/**
 * Return all expense records, optionally filtered.
 *
 * This is a READ operation — no balance recalculation needed.
 * The filters object is forwarded directly to the model's getAll() method,
 * which builds a dynamic WHERE clause from the filters.
 *
 * @param {{ type_id?, from?, to? }} filters  – all optional
 * @returns {Array}  – array of expense row objects
 */
const getAllExpenses = async (filters = {}) => {
    const [rows] = await Expense.getAll(filters);
    return rows;
};

/**
 * Return a single expense by its primary key.
 *
 * Returns null if no record is found (rows[0] is undefined).
 * The ?? operator is the "nullish coalescing" operator:
 *   rows[0] ?? null   means "use rows[0] if it is not null/undefined, else null"
 *
 * @param {number} id
 * @returns {object|null}
 */
const getExpenseById = async (id) => {
    const [rows] = await Expense.getById(id);
    return rows[0] ?? null; // null means "not found" — the controller returns 404
};

/**
 * Update one or more fields on an expense record.
 *
 * The controller validates the body with updateExpenseSchema (Joi) first,
 * so by the time we get here we know at least one valid field was sent.
 *
 * DATE MUTATION:
 *   If the caller is changing date_created, we normalise it to YYYY-MM-DD.
 *   We mutate the fields object directly (fields.date_created = ...) because
 *   the model's update() function iterates over the fields object — it needs
 *   the normalised value inside it.
 *
 * @param {number} id
 * @param {object} fields  – partial object of fields to update
 * @returns {{ balance: object }}
 */
const updateExpense = async (id, fields) => {
    if (fields.date_created) fields.date_created = toMysqlDate(fields.date_created);
    await Expense.update(id, fields);
    const balance = await recalculateBalance(); // Amount changed → balance changed
    return { balance };
};

/**
 * Delete an expense record and recalculate the balance.
 *
 * After deletion, the balance will increase (one less expense to subtract).
 * The updated balance is returned in the response body.
 *
 * @param {number} id
 * @returns {{ balance: object }}
 */
const deleteExpense = async (id) => {
    await Expense.delete(id);
    const balance = await recalculateBalance(); // Fewer expenses → balance goes up
    return { balance };
};

module.exports = { createExpense, getAllExpenses, getExpenseById, updateExpense, deleteExpense };
