const oracledb = require('oracledb');
require('dotenv').config();

// Database configuration
const dbConfig = {
    user: process.env.DB_USER || 'system',
    password: process.env.DB_PASSWORD || 'oracle',
    connectString: process.env.DB_CONNECT_STRING || 'localhost:1521/XE'
};

// Initialize connection pool
async function initialize() {
    try {
        await oracledb.createPool({
            ...dbConfig,
            poolMin: 2,
            poolMax: 10,
            poolIncrement: 1
        });
        console.log('Connection pool created successfully');
    } catch (err) {
        console.error('Error creating connection pool:', err);
        throw err;
    }
}

// Get connection from pool
async function getConnection() {
    try {
        return await oracledb.getConnection();
    } catch (err) {
        console.error('Error getting connection from pool:', err);
        throw err;
    }
}

// Close connection
async function closeConnection(connection) {
    try {
        if (connection) {
            await connection.close();
        }
    } catch (err) {
        console.error('Error closing connection:', err);
        throw err;
    }
}

// Close pool
async function closePool() {
    try {
        await oracledb.getPool().close(0);
        console.log('Connection pool closed');
    } catch (err) {
        console.error('Error closing connection pool:', err);
        throw err;
    }
}

module.exports = {
    initialize,
    getConnection,
    closeConnection,
    closePool
}; 