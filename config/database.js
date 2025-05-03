const oracledb = require('oracledb');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration with settings for Oracle connection
const dbConfig = {
    user: process.env.DB_USER || 'sys',
    password: process.env.DB_PASSWORD || 'password',
    connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/FREEPDB1',
    privilege: oracledb.SYSDBA // Add SYSDBA privilege for sys user
};

// Initialize database tables
async function setupDatabase(connection) {
    try {
        // Create USERS table if it doesn't exist
        const createTableSQL = `
        BEGIN
          EXECUTE IMMEDIATE 'CREATE TABLE USERS (
            id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            name VARCHAR2(100) NOT NULL,
            email VARCHAR2(100) NOT NULL UNIQUE,
            age NUMBER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )';
        EXCEPTION
          WHEN OTHERS THEN
            IF SQLCODE = -955 THEN
              NULL; -- Table already exists
            ELSE
              RAISE;
            END IF;
        END;`;
        
        await connection.execute(createTableSQL);
        logger.info('USERS table setup completed');
        
        // Create trigger for updated_at
        const createTriggerSQL = `
        BEGIN
          EXECUTE IMMEDIATE '
          CREATE OR REPLACE TRIGGER users_update_trigger
          BEFORE UPDATE ON USERS
          FOR EACH ROW
          BEGIN
            :NEW.updated_at := CURRENT_TIMESTAMP;
          END;';
        EXCEPTION
          WHEN OTHERS THEN
            NULL; -- Ignore errors with trigger
        END;`;
        
        await connection.execute(createTriggerSQL);
        logger.info('USERS trigger setup completed');
        
        return true;
    } catch (err) {
        logger.error(`Error setting up database: ${err.message}`, { error: err });
        throw err;
    }
}

// Initialize connection pool with configurable pool parameters
async function initialize() {
    try {
        // Set auto-commit to true by default
        oracledb.autoCommit = true;
        
        // Set connection timeouts and limits
        oracledb.queueTimeout = 60000; // 60 seconds
        oracledb.poolTimeout = 60;     // 60 seconds
        oracledb.fetchArraySize = 100; // Optimize fetch size
        
        // Log connection attempt
        logger.info(`Attempting to connect to Oracle DB with: ${JSON.stringify({
            user: dbConfig.user,
            connectString: dbConfig.connectString,
            privilege: dbConfig.privilege ? 'SYSDBA' : 'None'
        })}`);
        
        await oracledb.createPool({
            ...dbConfig,
            poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
            poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
            poolIncrement: parseInt(process.env.DB_POOL_INCREMENT || '1', 10),
            poolTimeout: 60,
            stmtCacheSize: 30
        });
        logger.info('Connection pool created successfully');
        
        // Get a connection for setup
        const connection = await oracledb.getConnection();
        
        // Set up database tables
        await setupDatabase(connection);
        
        // Test the connection with a simple query
        try {
            const result = await connection.execute('SELECT 1 FROM DUAL');
            logger.info('Database connection test successful');
        } catch (err) {
            logger.error(`Database connection test failed: ${err.message}`, { error: err });
        }
        
        await connection.close();
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