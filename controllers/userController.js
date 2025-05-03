const db = require('../config/database');
const oracledb = require('oracledb');
const logger = require('../utils/logger');

// Create a new user
const createUser = async (req, res) => {
    let connection;
    try {
        const { name, email, age } = req.body;
        connection = await db.getConnection();

        const result = await connection.execute(
            `INSERT INTO users (name, email, age) 
             VALUES (:name, :email, :age) 
             RETURNING id INTO :id`,
            {
                name,
                email,
                age,
                id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            },
            { autoCommit: true }
        );

        logger.info(`User created successfully with ID: ${result.outBinds.id[0]}`);
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { id: result.outBinds.id[0], name, email, age }
        });
    } catch (error) {
        logger.error(`Error creating user: ${error.message}`, { error, body: req.body });
        
        // Check for unique constraint violation (ORA-00001)
        if (error.message && error.message.includes('ORA-00001')) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists',
                error: 'Duplicate email address'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error creating user',
            error: 'Internal server error'
        });
    } finally {
        if (connection) {
            try {
                await db.closeConnection(connection);
            } catch (err) {
                logger.error(`Error closing connection: ${err.message}`);
            }
        }
    }
};

// Get all users
const getAllUsers = async (req, res) => {
    let connection;
    try {
        // Add pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;
        
        connection = await db.getConnection();
        
        // Count total users
        const countResult = await connection.execute(
            'SELECT COUNT(*) FROM users'
        );
        const totalUsers = countResult.rows[0][0];
        
        // Fetch paginated users
        const result = await connection.execute(
            'SELECT id, name, email, age, created_at, updated_at FROM users ORDER BY id OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY',
            { offset, limit },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        // Set total count in headers
        res.setHeader('X-Total-Count', totalUsers);
        
        res.status(200).json({
            success: true,
            data: result.rows,
            pagination: {
                page,
                limit,
                total: totalUsers,
                pages: Math.ceil(totalUsers / limit)
            }
        });
    } catch (error) {
        logger.error(`Error fetching users: ${error.message}`, { error });
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: 'Internal server error'
        });
    } finally {
        if (connection) {
            try {
                await db.closeConnection(connection);
            } catch (err) {
                logger.error(`Error closing connection: ${err.message}`);
            }
        }
    }
};

// Get user by ID
const getUserById = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        connection = await db.getConnection();

        const result = await connection.execute(
            'SELECT id, name, email, age, created_at, updated_at FROM users WHERE id = :id',
            [id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (result.rows.length === 0) {
            logger.info(`User not found: ID ${id}`);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        logger.error(`Error fetching user: ${error.message}`, { error, params: req.params });
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: 'Internal server error'
        });
    } finally {
        if (connection) {
            try {
                await db.closeConnection(connection);
            } catch (err) {
                logger.error(`Error closing connection: ${err.message}`);
            }
        }
    }
};

// Update user
const updateUser = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { name, email, age } = req.body;
        connection = await db.getConnection();

        const result = await connection.execute(
            `UPDATE users 
             SET name = :name, email = :email, age = :age 
             WHERE id = :id`,
            { name, email, age, id },
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            logger.info(`Update failed, user not found: ID ${id}`);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        logger.info(`User updated successfully: ID ${id}`);
        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: { id, name, email, age }
        });
    } catch (error) {
        logger.error(`Error updating user: ${error.message}`, { error, body: req.body, params: req.params });
        
        // Check for unique constraint violation (ORA-00001)
        if (error.message && error.message.includes('ORA-00001')) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists',
                error: 'Duplicate email address'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: 'Internal server error'
        });
    } finally {
        if (connection) {
            try {
                await db.closeConnection(connection);
            } catch (err) {
                logger.error(`Error closing connection: ${err.message}`);
            }
        }
    }
};

// Delete user
const deleteUser = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        connection = await db.getConnection();

        const result = await connection.execute(
            'DELETE FROM users WHERE id = :id',
            [id],
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            logger.info(`Delete failed, user not found: ID ${id}`);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        logger.info(`User deleted successfully: ID ${id}`);
        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        logger.error(`Error deleting user: ${error.message}`, { error, params: req.params });
        res.status(500).json({
            success: false,
            message: 'Error deleting user',
            error: 'Internal server error'
        });
    } finally {
        if (connection) {
            try {
                await db.closeConnection(connection);
            } catch (err) {
                logger.error(`Error closing connection: ${err.message}`);
            }
        }
    }
};

module.exports = {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
}; 