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

// Helper function to run a SQL script file
async function runSqlScript(connection, scriptPath) {
    try {
        const sql = fs.readFileSync(scriptPath, 'utf8');
        // Split by forward slash followed by a newline character (Oracle SQL delimiter)
        const statements = sql.split(/\/\r?\n/).filter(stmt => stmt.trim() !== '');
        
        for (const statement of statements) {
            const trimmedStatement = statement.trim();
            if (trimmedStatement) {
                try {
                    await connection.execute(trimmedStatement);
                    logger.info(`Executed SQL statement successfully`);
                } catch (err) {
                    logger.error(`Error executing SQL statement: ${err.message}`, { 
                        error: err,
                        statement: trimmedStatement.substring(0, 100) + '...' // Log only first 100 chars
                    });
                    // Continue with next statement if there's an error
                }
            }
        }
        
        logger.info(`SQL script executed successfully: ${scriptPath}`);
    } catch (err) {
        logger.error(`Error running SQL script: ${err.message}`, { error: err, scriptPath });
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
        
        // Run database setup script
        const setupScriptPath = path.join(__dirname, '../database/setup.sql');
        if (fs.existsSync(setupScriptPath)) {
            await runSqlScript(connection, setupScriptPath);
            logger.info('Database setup completed successfully');
        } else {
            logger.warn(`Setup script not found at ${setupScriptPath}`);
        }
        
        // Test the connection with the new table
        try {
            const result = await connection.execute('SELECT COUNT(*) FROM USERS');
            logger.info(`Database table test successful, user count: ${result.rows[0][0]}`);
        } catch (err) {
            logger.error(`Database table test failed: ${err.message}`, { error: err });
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