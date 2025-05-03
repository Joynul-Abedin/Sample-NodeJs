const { sanitize } = require('express-validator');

/**
 * Custom XSS prevention middleware that sanitizes request body, query, and params
 */
const xssMiddleware = (req, res, next) => {
    // Function to recursively sanitize object properties
    const sanitizeObj = (obj) => {
        if (!obj) return obj;
        
        Object.keys(obj).forEach(key => {
            if (typeof obj[key] === 'string') {
                // Sanitize string values
                obj[key] = sanitizeString(obj[key]);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                // Recursively sanitize nested objects
                sanitizeObj(obj[key]);
            }
        });
        
        return obj;
    };
    
    // Function to sanitize string values
    const sanitizeString = (str) => {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/`/g, '&#96;');
    };
    
    // Sanitize request body
    if (req.body) {
        req.body = sanitizeObj(req.body);
    }
    
    // Sanitize query parameters (without setting the property directly)
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeString(req.query[key]);
            }
        });
    }
    
    // Sanitize route parameters
    if (req.params) {
        Object.keys(req.params).forEach(key => {
            if (typeof req.params[key] === 'string') {
                req.params[key] = sanitizeString(req.params[key]);
            }
        });
    }
    
    next();
};

module.exports = xssMiddleware; 