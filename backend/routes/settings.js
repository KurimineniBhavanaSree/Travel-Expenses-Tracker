const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all settings routes
router.use(authMiddleware);

// Update email
router.put('/email', settingsController.updateEmail);

// Update password
router.put('/password', settingsController.updatePassword);

module.exports = router;