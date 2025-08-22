const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all expense routes
router.use(authMiddleware);

// Create new expense
router.post('/', expenseController.createExpense);

// Get expenses (optionally filtered by trip_id)
router.get('/', expenseController.getExpenses);

// Get expense summary
router.get('/summary', expenseController.getExpenseSummary);

// Delete expense
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;