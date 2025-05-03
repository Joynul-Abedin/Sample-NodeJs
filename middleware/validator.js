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

// Validate ID parameter
const validateIdParam = [
    param('id')
        .notEmpty().withMessage('ID is required')
        .isInt().withMessage('ID must be an integer'),
    handleValidationErrors
];

module.exports = {
    validateUserInput,
    validateIdParam
}; 