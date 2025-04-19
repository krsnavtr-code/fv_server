const express = require('express');
const router = express.Router();
const adminCourseController = require('../controllers/adminCourseController');
const { protect, admin } = require('../middleware/authMiddleware');

// Debug middleware to log all requests
router.use((req, res, next) => {
    console.log(`Admin course route accessed: ${req.method} ${req.originalUrl}`);
    next();
});

// Apply authentication middleware to all routes
// Temporarily disable authentication for testing
// router.use(protect);
// router.use(admin);

// Admin course routes
router.get('/', adminCourseController.getAllCourses);
router.post('/', adminCourseController.createCourse);
router.get('/categories', adminCourseController.getAllCategories);
router.put('/:id', adminCourseController.updateCourse);
router.delete('/:id', adminCourseController.deleteCourse);
router.put('/:id/publish', adminCourseController.publishCourse);
router.get('/:id', adminCourseController.getCourseById);

module.exports = router;
