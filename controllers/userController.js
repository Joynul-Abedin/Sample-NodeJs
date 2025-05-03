const db = require('../config/database');

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

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { id: result.outBinds.id[0], name, email, age }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating user',
            error: error.message
        });
    } finally {
        if (connection) {
            await db.closeConnection(connection);
        }
    }
};

// Get all users
const getAllUsers = async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        const result = await connection.execute(
            'SELECT * FROM users ORDER BY id'
        );

        res.status(200).json({
            success: true,
            data: result.rows.map(row => ({
                id: row[0],
                name: row[1],
                email: row[2],
                age: row[3]
            }))
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message
        });
    } finally {
        if (connection) {
            await db.closeConnection(connection);
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
            'SELECT * FROM users WHERE id = :id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = result.rows[0];
        res.status(200).json({
            success: true,
            data: {
                id: user[0],
                name: user[1],
                email: user[2],
                age: user[3]
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message
        });
    } finally {
        if (connection) {
            await db.closeConnection(connection);
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
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: { id, name, email, age }
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user',
            error: error.message
        });
    } finally {
        if (connection) {
            await db.closeConnection(connection);
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
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user',
            error: error.message
        });
    } finally {
        if (connection) {
            await db.closeConnection(connection);
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