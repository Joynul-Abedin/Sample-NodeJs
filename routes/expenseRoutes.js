const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { validateExpenseInput, validateIdParam } = require('../middleware/validator');

// Create a new expense report
router.post('/', validateExpenseInput, expenseController.createExpenseReport);

// Get all expense reports
router.get('/', expenseController.getAllExpenseReports);

// Get expense report by ID
router.get('/:id', validateIdParam, expenseController.getExpenseReportById);

// Update expense report
router.put('/:id', validateIdParam, validateExpenseInput, expenseController.updateExpenseReport);

// Delete expense report
router.delete('/:id', validateIdParam, expenseController.deleteExpenseReport);

module.exports = router; 