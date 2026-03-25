/**
 * routes/expenseRoutes.js – all expense endpoints (protected)
 */
const express = require('express');
const ctrl = require('../controllers/expenseController');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/expense', auth, ctrl.createExpense);
router.get('/expense', auth, ctrl.getAllExpenses);
router.get('/expense/:id', auth, ctrl.getExpenseById);
router.put('/expense/:id', auth, ctrl.updateExpense);
router.delete('/expense/:id', auth, ctrl.deleteExpense);

module.exports = router;
