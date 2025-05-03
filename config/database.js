const oracledb = require('oracledb');
const logger = require('../utils/logger');
require('dotenv').config();

// Database configuration with settings from the image
const dbConfig = {
    user: process.env.DB_USER || 'sys',
    password: process.env.DB_PASSWORD || 'password',
    connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/FREEPDB1',
    privilege: oracledb.SYSDBA // Add SYSDBA privilege as shown in the image
};

// Initialize connection pool with configurable pool parameters
async function initialize() {
    try {
        // Set auto-commit to true by default
        oracledb.autoCommit = true;
        
        // Set connection timeouts and limits
        oracledb.queueTimeout = 60000; // 60 seconds
        oracledb.poolTimeout = 60;     // 60 seconds
        oracledb.fetchArraySize = 100; // Optimize fetch size
        
        await oracledb.createPool({
            ...dbConfig,
            poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
            poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
            poolIncrement: parseInt(process.env.DB_POOL_INCREMENT || '1', 10),
            poolTimeout: 60,
            stmtCacheSize: 30
        });
        logger.info('Connection pool created successfully');
    } catch (err) {
        logger.error(`Error creating connection pool: ${err.message}`, { error: err });
        throw err;
    }
}

// Get connection from pool with timeout handling
async function getConnection() {
    try {
        return await Promise.race([
            oracledb.getConnection(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Connection timeout')), 30000) // 30 seconds
            )
        ]);
    } catch (err) {
        logger.error(`Error getting connection from pool: ${err.message}`, { error: err });
        throw err;
    }
}

// Close connection with error handling
async function closeConnection(connection) {
    if (!connection) return;
    
    try {
        await connection.close();
    } catch (err) {
        logger.error(`Error closing connection: ${err.message}`, { error: err });
        throw err;
    }
}

// Close pool with timeout handling
async function closePool() {
    try {
        const pool = oracledb.getPool();
        if (pool) {
            await Promise.race([
                pool.close(10), // Wait for 10 seconds for connections to close
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Pool close timeout')), 12000)
                )
            ]);
            logger.info('Connection pool closed');
        }
    } catch (err) {
        logger.error(`Error closing connection pool: ${err.message}`, { error: err });
        throw err;
    }
}

// Execute a query with automatic connection handling
async function executeQuery(sql, binds = {}, options = {}) {
    let connection;
    try {
        connection = await getConnection();
        
        // Add default options
        const queryOptions = {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            autoCommit: true,
            ...options
        };
        
        return await connection.execute(sql, binds, queryOptions);
    } catch (err) {
        logger.error(`Error executing query: ${err.message}`, { 
            error: err, 
            sql, 
            binds: JSON.stringify(binds) 
        });
        throw err;
    } finally {
        if (connection) {
            await closeConnection(connection);
        }
    }
}

module.exports = {
    initialize,
    getConnection,
    closeConnection,
    closePool,
    executeQuery
}; 