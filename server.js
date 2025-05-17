const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const db = require('./config/database');
const userRoutes = require('./routes/userRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const setupSecurity = require('./middleware/security');
const logger = require('./utils/logger');
require('dotenv').config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Apply security middleware
setupSecurity(app);

// Request logging middleware
app.use(morgan('combined', { stream: logger.stream }));

// Basic Express middleware
app.use(helmet()); // Secure HTTP headers
app.use(compression()); // Compress responses
app.use(bodyParser.json({ limit: '1mb' })); // Limit JSON payload size
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date(),
        environment: NODE_ENV
    });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/expenses', expenseRoutes);

// 404 Handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Resource not found',
        path: req.originalUrl
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(`Unhandled application error: ${err.message}`, { 
        error: err,
        stack: err.stack,
        path: req.originalUrl,
        method: req.method
    });
    
    res.status(err.status || 500).json({
        success: false,
        message: NODE_ENV === 'production' ? 'Internal server error' : err.message,
        error: NODE_ENV === 'production' ? {} : {
            stack: err.stack ? err.stack.split('\n') : [],
            name: err.name
        }
    });
});

// Start server and initialize database
let server;
(async () => {
    try {
        // Initialize the Oracle connection pool
        await db.initialize();
        logger.info('Oracle database connection pool initialized');
        
        // Start the server
        server = app.listen(PORT, () => {
            logger.info(`Server is running in ${NODE_ENV} mode on port ${PORT}`);
        });
        
        // Implement graceful shutdown
        setupGracefulShutdown(server);
    } catch (error) {
        logger.error(`Failed to start server: ${error.message}`, { error });
        process.exit(1);
    }
})();

// Graceful Shutdown Function
function setupGracefulShutdown(server) {
    // Handle process termination signals
    const shutdown = async (signal) => {
        logger.info(`${signal} received, starting graceful shutdown`);
        
        // First close the HTTP server
        server.close(() => {
            logger.info('HTTP server closed');
            
            // Then close database connection pool
            db.closePool()
                .then(() => {
                    logger.info('Database connections closed');
                    process.exit(0);
                })
                .catch((err) => {
                    logger.error(`Error during database shutdown: ${err.message}`, { error: err });
                    process.exit(1);
                });
        });
        
        // Force close if graceful shutdown takes too long
        setTimeout(() => {
            logger.error('Forcing shutdown after timeout');
            process.exit(1);
        }, 30000); // 30 seconds
    };
    
    // Subscribe to termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
        logger.error(`Uncaught Exception: ${err.message}`, { error: err, stack: err.stack });
        shutdown('Uncaught Exception');
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Promise Rejection', { reason, promise });
        shutdown('Unhandled Promise Rejection');
    });
} 