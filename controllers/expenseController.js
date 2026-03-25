/**
 * controllers/expenseController.js
 * POST   /api/expense
 * GET    /api/expense
 * GET    /api/expense/:id
 * PUT    /api/expense/:id
 * DELETE /api/expense/:id
 */
const expenseService = require('../services/expenseService');
const { createExpenseSchema, updateExpenseSchema, expenseFilterSchema } = require('../validation/expenseValidation');
const { ok, created, badRequest, notFound, serverError } = require('../utils/response');

const createExpense = async (req, res) => {
    const { error, value } = createExpenseSchema.validate(req.body, { abortEarly: false });
    if (error) return badRequest(res, 'Validation failed', error.details.map(d => d.message));

    try {
        const result = await expenseService.createExpense(value);
        return created(res, result, 'Expense recorded successfully');
    } catch (err) {
        return serverError(res, err);
    }
};

const getAllExpenses = async (req, res) => {
    const { error, value } = expenseFilterSchema.validate(req.query);
    if (error) return badRequest(res, 'Invalid filter params', error.details.map(d => d.message));

    try {
        const rows = await expenseService.getAllExpenses(value);
        return ok(res, rows, 'Expense records retrieved');
    } catch (err) {
        return serverError(res, err);
    }
};

const getExpenseById = async (req, res) => {
    try {
        const record = await expenseService.getExpenseById(req.params.id);
        if (!record) return notFound(res, 'Expense record not found');
        return ok(res, record);
    } catch (err) {
        return serverError(res, err);
    }
};

const updateExpense = async (req, res) => {
    const { error, value } = updateExpenseSchema.validate(req.body, { abortEarly: false });
    if (error) return badRequest(res, 'Validation failed', error.details.map(d => d.message));

    try {
        const existing = await expenseService.getExpenseById(req.params.id);
        if (!existing) return notFound(res, 'Expense record not found');

        const result = await expenseService.updateExpense(req.params.id, value);
        return ok(res, result, 'Expense updated successfully');
    } catch (err) {
        return serverError(res, err);
    }
};

const deleteExpense = async (req, res) => {
    try {
        const existing = await expenseService.getExpenseById(req.params.id);
        if (!existing) return notFound(res, 'Expense record not found');

        const result = await expenseService.deleteExpense(req.params.id);
        return ok(res, result, 'Expense deleted successfully');
    } catch (err) {
        return serverError(res, err);
    }
};

module.exports = { createExpense, getAllExpenses, getExpenseById, updateExpense, deleteExpense };
