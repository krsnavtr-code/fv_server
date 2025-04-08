const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const courseController = require('../controllers/courseController');

// Debug middleware to log all requests
router.use((req, res, next) => {
    console.log(`Course route accessed: ${req.method} ${req.originalUrl}`);
    console.log('Headers:', req.headers);
    next();
});

// Public routes
router.get('/', courseController.getCourses);
router.get('/:id', courseController.getCourse);

// Admin routes
router.post('/admin', protect, courseController.createCourse);
router.get('/admin/:id', protect, courseController.getCourse);
router.put('/admin/:id', protect, courseController.updateCourse);
router.delete('/admin/:id', protect, courseController.deleteCourse);

// Default course creation route (used by both admin and instructors)
router.post('/', protect, courseController.createCourse);

// Instructor course creation route
router.post('/instructor', protect, courseController.createCourse);

// Purchase route
router.post('/:id/purchase', protect, courseController.purchaseCourse);

module.exports = router;
