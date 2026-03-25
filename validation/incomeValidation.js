/**
 * validation/incomeValidation.js – Joi schemas for income endpoints
 *
 * KEY CONCEPT – Why validate inputs?
 *
 * Without validation a student could call:
 *   POST /api/income   with body: { "amount": -999, "income_type_id": "banana" }
 *
 * That would either crash the server or store corrupt data.
 * Joi lets us declare the RULES for valid data in one place:
 *   • what fields are required vs optional
 *   • what types they must be (number, string, date …)
 *   • what range they must be in (positive, min, max …)
 *   • what format dates must use (ISO 8601: "YYYY-MM-DD")
 *
 * The controller then does ONE call:
 *   const { error, value } = schema.validate(req.body);
 *   if (error) return badRequest(res, 'Validation failed', error.details);
 *
 * KEY CONCEPT – abortEarly: false
 * By default Joi stops at the FIRST error.
 * Passing { abortEarly: false } collects ALL errors so the user sees
 * every problem at once instead of fixing them one by one.
 *
 * DOCS: https://joi.dev/api
 */
const Joi = require('joi');

// ── Schema for POST /api/income (create) ─────────────────────────────────────
const createIncomeSchema = Joi.object({
    // Joi.number() — must be a number (or a numeric string, Joi auto-converts)
    // .positive()  — must be > 0 (negative income makes no sense)
    // .required()  — this field MUST be in the request body
    amount: Joi.number().positive().required().messages({
        'number.positive': 'Amount must be a positive number.',
        'any.required': 'Amount is required.',
    }),

    // .integer()   — no decimals (it's a foreign key / ID)
    // .positive()  — IDs are always >= 1
    income_type_id: Joi.number().integer().positive().required().messages({
        'any.required': 'income_type_id is required.',
    }),

    // Joi.date().iso() — must be ISO 8601 format: "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss"
    // .optional()     — if not provided, the model uses CURDATE() (today)
    date_created: Joi.date().iso().optional(),
});

// ── Schema for PUT /api/income/:id (update) ───────────────────────────────────
// All fields are optional (partial update — only send what changed).
// .min(1) on the Joi.object means at least ONE field must be present.
// You can't send an empty {} — that would be a pointless update.
const updateIncomeSchema = Joi.object({
    amount:         Joi.number().positive().optional(),
    income_type_id: Joi.number().integer().positive().optional(),
    date_created:   Joi.date().iso().optional(),
}).min(1); // ← enforce that at least one field is being updated

// ── Schema for GET /api/income?type_id=&from=&to= (filters) ──────────────────
// These come from query-string parameters, all optional.
// e.g. GET /api/income?from=2026-01-01&to=2026-03-31
const incomeFilterSchema = Joi.object({
    type_id: Joi.number().integer().positive().optional(),
    from:    Joi.date().iso().optional(),
    to:      Joi.date().iso().optional(),
});

module.exports = { createIncomeSchema, updateIncomeSchema, incomeFilterSchema };
