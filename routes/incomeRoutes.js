/**
 * routes/incomeRoutes.js – all income endpoints (protected)
 */
const express = require('express');
const ctrl = require('../controllers/incomeController');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/income', auth, ctrl.createIncome);
router.get('/income', auth, ctrl.getAllIncome);
router.get('/income/:id', auth, ctrl.getIncomeById);
router.put('/income/:id', auth, ctrl.updateIncome);
router.delete('/income/:id', auth, ctrl.deleteIncome);

module.exports = router;
