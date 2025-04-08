const express = require('express');
const categoryController = require('../controllers/categoryController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', categoryController.getAllCategories);

// Admin routes
router.post('/', protect, admin, categoryController.createCategory);

module.exports = router;
