const express = require('express');
const router = express.Router();
const db = require('../config/database');
const userController = require('../controllers/userController');
const { validateUserInput, validateIdParam } = require('../middleware/validator');

// Create a new user
router.post('/', validateUserInput, userController.createUser);

// Get all users
router.get('/', userController.getAllUsers);

// Get user by ID
router.get('/:id', validateIdParam, userController.getUserById);

// Update user
router.put('/:id', validateIdParam, validateUserInput, userController.updateUser);

// Delete user
router.delete('/:id', validateIdParam, userController.deleteUser);

module.exports = router; 