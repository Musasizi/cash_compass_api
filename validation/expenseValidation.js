/**
 * validation/expenseValidation.js – Joi schemas for expense endpoints
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY VALIDATE EXPENSE INPUT?
 * ─────────────────────────────────────────────────────────────────────────────
 * The expense table has TWO money columns that students often confuse:
 *
 *   amount             – the BUDGETED amount (how much you planned to spend)
 *   amount_expenditure – the ACTUAL amount spent (used for balance calculation)
 *
 * Without validation, a user could send:
 *   { amount_expenditure: -500 }   ← negative spend makes no sense
 *   { id_expense: "food" }         ← string instead of integer FK
 *   { date_created: "yesterday" }  ← not a valid ISO date
 *
 * Joi catches all of these before they reach the database.
 *
 * SEE ALSO: validation/incomeValidation.js for the income equivalent.
 * The patterns are identical — compare them to understand the shape of each table.
 *
 * Joi docs: https://joi.dev/api/
 */
const Joi = require('joi');

/**
 * Schema used when POSTing a new expense record.
 *
 * FIELD-BY-FIELD:
 *
 *  name_expense
 *    .string()   – must be text
 *    .trim()     – strip leading/trailing whitespace before validation
 *    .min(1)     – at least 1 character after trimming (prevents "   ")
 *    .max(200)   – matches the VARCHAR(200) column in MySQL
 *    .required() – must be present; Joi rejects the object if it's missing
 *
 *  amount  (budgeted)
 *    .number()   – must be numeric (string "500" is coerced to 500 automatically)
 *    .positive() – must be > 0 (0 and negatives are rejected)
 *    .required()
 *
 *  amount_expenditure  (actual spend — this is what affects the balance)
 *    Same rules as amount. Students: make sure you send BOTH fields.
 *    The balance formula uses amount_expenditure, not amount.
 *
 *  id_expense  (foreign key → expense_type.id_expense)
 *    .number().integer()  – must be a whole number (no 2.5)
 *    .positive()          – must be > 0 (valid PKs start at 1)
 *    .required()          – every expense must belong to a category
 *
 *  date_created
 *    .date().iso()  – must be a valid ISO 8601 string: "2025-03-25" or "2025-03-25T00:00:00Z"
 *    .optional()    – if omitted, the database uses CURDATE() as the default
 */
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
    // date_created is optional — omit it and the DB defaults to today
    date_created: Joi.date().iso().optional(),
});

/**
 * Schema used when PUTting (updating) an existing expense record.
 *
 * KEY DIFFERENCES from createExpenseSchema:
 *  1. All fields are .optional() — you only send what you want to change.
 *     A PATCH-style PUT: { amount_expenditure: 150000 } is perfectly valid.
 *  2. .min(1) on the object — you must send AT LEAST one field.
 *     An empty {} would be pointless; Joi rejects it with a helpful error.
 *
 * EXAMPLE:
 *   PATCH the description only:
 *     PUT /api/expense/5  { "name_expense": "Electricity bill Q2" }
 *
 *   PATCH the actual spend and date:
 *     PUT /api/expense/5  { "amount_expenditure": 95000, "date_created": "2025-06-30" }
 */
const updateExpenseSchema = Joi.object({
    name_expense: Joi.string().trim().min(1).max(200).optional(),
    amount: Joi.number().positive().optional(),
    amount_expenditure: Joi.number().positive().optional(),
    id_expense: Joi.number().integer().positive().optional(),
    date_created: Joi.date().iso().optional(),
}).min(1); // Reject empty update objects — at least one field must be changed

/**
 * Schema used for query-string filters on GET /api/expense.
 *
 * These are all optional — used to narrow the list of expenses returned:
 *   type_id  – filter by expense category  (e.g. only show "Rent" expenses)
 *   from     – only records on or after this date
 *   to       – only records on or before this date
 *
 * EXAMPLE requests:
 *   GET /api/expense                              → all expenses
 *   GET /api/expense?type_id=2                    → only type 2 (e.g. Utilities)
 *   GET /api/expense?from=2025-01-01&to=2025-03-31 → Q1 expenses only
 */
const expenseFilterSchema = Joi.object({
    type_id: Joi.number().integer().positive().optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
});

module.exports = { createExpenseSchema, updateExpenseSchema, expenseFilterSchema };
