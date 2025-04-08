const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const guestTeacherController = require('../controllers/guestTeacherController');

// Protect all routes
router.use(protect, admin);

// Get all guest teachers
router.get('/', guestTeacherController.getAllGuestTeachers);

// Add new guest teacher
router.post('/', guestTeacherController.addGuestTeacher);

// Update guest teacher status
router.put('/:id/status', guestTeacherController.updateGuestTeacherStatus);

// Delete guest teacher
router.delete('/:id', guestTeacherController.deleteGuestTeacher);

module.exports = router;
