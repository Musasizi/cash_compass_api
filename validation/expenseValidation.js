/**
 * validation/expenseValidation.js – Joi schemas for expense endpoints
 */
const Joi = require('joi');

const createExpenseSchema = Joi.object({
    name_expense: Joi.string().trim().min(1).max(200).required().messages({
        'any.required': 'name_expense is required.',
    }),
    amount: Joi.number().positive().required().messages({
        'number.positive': 'amount must be a positive number.',
        'any.required': 'amount is required.',
    }),
    amount_expenditure: Joi.number().positive().required().messages({
        'number.positive': 'amount_expenditure must be a positive number.',
        'any.required': 'amount_expenditure is required.',
    }),
    id_expense: Joi.number().integer().positive().required().messages({
        'any.required': 'id_expense (expense_type id) is required.',
    }),
    date_created: Joi.date().iso().optional(),
});

const updateExpenseSchema = Joi.object({
    name_expense: Joi.string().trim().min(1).max(200).optional(),
    amount: Joi.number().positive().optional(),
    amount_expenditure: Joi.number().positive().optional(),
    id_expense: Joi.number().integer().positive().optional(),
    date_created: Joi.date().iso().optional(),
}).min(1);

const expenseFilterSchema = Joi.object({
    type_id: Joi.number().integer().positive().optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
});

module.exports = { createExpenseSchema, updateExpenseSchema, expenseFilterSchema };
