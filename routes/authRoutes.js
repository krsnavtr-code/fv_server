const express = require('express');
const router = express.Router();
const { check, body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect, admin, restrictTo } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Validation middleware
const loginValidation = [
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('password', 'Password is required').exists().trim()
];

const signupValidation = [
  check('name', 'Name is required').trim().not().isEmpty().escape(),
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('password', 'Please enter a password with 6 or more characters')
    .trim()
    .isLength({ min: 6 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const verifyEmailValidation = [
  check('userId', 'User ID is required').isInt(),
  check('otp', 'Valid OTP is required').isLength({ min: 6, max: 6 }).isNumeric()
];

const resendOtpValidation = [
  check('userId', 'User ID is required').isInt()
];

const validateProfile = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('mobile')
    .optional({ nullable: true })
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit mobile number'),
  body('course')
    .optional({ nullable: true })
    .isString()
    .withMessage('Course must be a valid string')
];

// Admin Login Validation
const adminLoginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').trim().notEmpty().withMessage('Password is required')
];

// Public routes
router.post('/signup', signupValidation, authController.signup);
router.post('/login', loginValidation, authController.login);
router.post('/verify-email', verifyEmailValidation, authController.verifyEmail);
router.post('/resend-otp', resendOtpValidation, authController.resendVerification);
router.post('/admin/login', adminLoginValidation, authController.adminLogin);
router.post('/refresh-token', authController.refreshToken);

// Protected routes (require authentication)
router.use(protect);

// User routes
router.get('/profile', authController.getProfile);
router.put('/profile', validateProfile, authController.updateProfile);
router.get('/history', authController.getUserHistory);
router.post('/restore', authController.restoreProfile);

// Admin routes (require admin role)
router.use('/admin', admin);
router.get('/admin/users', authController.getAllUser);
router.get('/admin/users/:userId', authController.getUser);
router.put('/admin/users/:userId', validateProfile, authController.updateUser);
router.delete('/admin/users/:userId', authController.deleteUser);

// Role-based routes
router.get('/instructors', restrictTo('admin', 'instructor'), authController.getAllInstructors);
router.get('/students', restrictTo('admin', 'instructor'), authController.getAllStudents);

module.exports = router;
