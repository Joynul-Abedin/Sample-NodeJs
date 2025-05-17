const { body, param, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Validate user creation/update input
const validateUserInput = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
        .escape(),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail()
        .isLength({ max: 100 }).withMessage('Email must be less than 100 characters'),
    body('age')
        .optional()
        .isInt({ min: 0, max: 120 }).withMessage('Age must be a number between 0 and 120'),
    handleValidationErrors
];

// Validate expense report creation/update input
const validateExpenseInput = [
    body('header')
        .notEmpty().withMessage('Header information is required'),
    body('header.report_header_id')
        .notEmpty().withMessage('Report header ID is required')
        .isNumeric().withMessage('Report header ID must be a number'),
    body('header.employee_id')
        .optional()
        .isNumeric().withMessage('Employee ID must be a number'),
    body('header.week_end_date')
        .notEmpty().withMessage('Week end date is required')
        .isISO8601().withMessage('Week end date must be a valid date'),
    body('header.created_by')
        .notEmpty().withMessage('Created by is required')
        .isNumeric().withMessage('Created by must be a number'),
    body('header.last_updated_by')
        .notEmpty().withMessage('Last updated by is required')
        .isNumeric().withMessage('Last updated by must be a number'),
    body('header.vouchno')
        .notEmpty().withMessage('Voucher number is required')
        .isNumeric().withMessage('Voucher number must be a number'),
    body('header.total')
        .notEmpty().withMessage('Total is required')
        .isNumeric().withMessage('Total must be a number'),
    body('header.default_currency_code')
        .notEmpty().withMessage('Default currency code is required')
        .isLength({ max: 15 }).withMessage('Default currency code must be less than 15 characters'),
    body('lines')
        .optional()
        .isArray().withMessage('Lines must be an array'),
    body('lines.*.item_description')
        .notEmpty().withMessage('Item description is required'),
    body('lines.*.set_of_books_id')
        .notEmpty().withMessage('Set of books ID is required')
        .isNumeric().withMessage('Set of books ID must be a number'),
    body('lines.*.amount')
        .notEmpty().withMessage('Amount is required')
        .isNumeric().withMessage('Amount must be a number'),
    body('lines.*.currency_code')
        .optional()
        .isLength({ max: 15 }).withMessage('Currency code must be less than 15 characters'),
    handleValidationErrors
];

// Validate ID parameter
const validateIdParam = [
    param('id')
        .notEmpty().withMessage('ID is required')
        .isInt().withMessage('ID must be an integer'),
    handleValidationErrors
];

module.exports = {
    validateUserInput,
    validateIdParam,
    validateExpenseInput
}; 