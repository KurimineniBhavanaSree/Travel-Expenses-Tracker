const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');  // import middleware

// Register new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Get user data — protect this route with authMiddleware
router.get('/user', authMiddleware, authController.getUser);

module.exports = router;
