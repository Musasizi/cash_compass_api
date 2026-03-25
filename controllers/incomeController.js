/**
 * controllers/incomeController.js
 * POST   /api/income
 * GET    /api/income
 * GET    /api/income/:id
 * PUT    /api/income/:id
 * DELETE /api/income/:id
 */
const incomeService = require('../services/incomeService');
const { createIncomeSchema, updateIncomeSchema, incomeFilterSchema } = require('../validation/incomeValidation');
const { ok, created, badRequest, notFound, serverError } = require('../utils/response');

const createIncome = async (req, res) => {
    const { error, value } = createIncomeSchema.validate(req.body, { abortEarly: false });
    if (error) return badRequest(res, 'Validation failed', error.details.map(d => d.message));

    try {
        const result = await incomeService.createIncome(value);
        return created(res, result, 'Income recorded successfully');
    } catch (err) {
        return serverError(res, err);
    }
};

const getAllIncome = async (req, res) => {
    const { error, value } = incomeFilterSchema.validate(req.query);
    if (error) return badRequest(res, 'Invalid filter params', error.details.map(d => d.message));

    try {
        const rows = await incomeService.getAllIncome(value);
        return ok(res, rows, 'Income records retrieved');
    } catch (err) {
        return serverError(res, err);
    }
};

const getIncomeById = async (req, res) => {
    try {
        const record = await incomeService.getIncomeById(req.params.id);
        if (!record) return notFound(res, 'Income record not found');
        return ok(res, record);
    } catch (err) {
        return serverError(res, err);
    }
};

const updateIncome = async (req, res) => {
    const { error, value } = updateIncomeSchema.validate(req.body, { abortEarly: false });
    if (error) return badRequest(res, 'Validation failed', error.details.map(d => d.message));

    try {
        // Verify record exists first
        const existing = await incomeService.getIncomeById(req.params.id);
        if (!existing) return notFound(res, 'Income record not found');

        const result = await incomeService.updateIncome(req.params.id, value);
        return ok(res, result, 'Income updated successfully');
    } catch (err) {
        return serverError(res, err);
    }
};

const deleteIncome = async (req, res) => {
    try {
        const existing = await incomeService.getIncomeById(req.params.id);
        if (!existing) return notFound(res, 'Income record not found');

        const result = await incomeService.deleteIncome(req.params.id);
        return ok(res, result, 'Income deleted successfully');
    } catch (err) {
        return serverError(res, err);
    }
};

module.exports = { createIncome, getAllIncome, getIncomeById, updateIncome, deleteIncome };
