const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const cors = require('cors');
const xssMiddleware = require('./xssMiddleware');

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    }
});

// CORS options
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
    credentials: true,
    maxAge: 86400 // 24 hours
};

// Set security middleware
const setupSecurity = (app) => {
    // Helmet helps secure Express apps by setting HTTP response headers
    app.use(helmet());
    
    // Prevent Cross-Site Scripting (XSS) attacks using custom middleware
    app.use(xssMiddleware);
    
    // Prevent HTTP Parameter Pollution attacks
    app.use(hpp());
    
    // Implement CORS with options
    app.use(cors(corsOptions));
    
    // Apply rate limiting to all requests
    app.use('/api/', limiter);
    
    // Add security headers
    app.use((req, res, next) => {
        // Content Security Policy
        res.setHeader(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self'; object-src 'none'; img-src 'self' data:; style-src 'self'; font-src 'self';"
        );
        
        // No cache for API responses
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        
        next();
    });
};

module.exports = setupSecurity; 