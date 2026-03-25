/**
 * routes/referenceDataRoutes.js
 * Public endpoints – no auth required for read access to type lists
 */
const express = require('express');
const { getIncomeTypes, getExpenseTypes } = require('../controllers/referenceDataController');

const router = express.Router();

router.get('/reference-data/income-types', getIncomeTypes);
router.get('/reference-data/expense-types', getExpenseTypes);

module.exports = router;
