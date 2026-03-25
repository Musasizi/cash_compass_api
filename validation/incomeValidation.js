/**
 * validation/incomeValidation.js – Joi schemas for income endpoints
 */
const Joi = require('joi');

const createIncomeSchema = Joi.object({
    amount: Joi.number().positive().required().messages({
        'number.positive': 'Amount must be a positive number.',
        'any.required': 'Amount is required.',
    }),
    income_type_id: Joi.number().integer().positive().required().messages({
        'any.required': 'income_type_id is required.',
    }),
    date_created: Joi.date().iso().optional(),
});

const updateIncomeSchema = Joi.object({
    amount: Joi.number().positive().optional(),
    income_type_id: Joi.number().integer().positive().optional(),
    date_created: Joi.date().iso().optional(),
}).min(1); // at least one field required

const incomeFilterSchema = Joi.object({
    type_id: Joi.number().integer().positive().optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
});

module.exports = { createIncomeSchema, updateIncomeSchema, incomeFilterSchema };
