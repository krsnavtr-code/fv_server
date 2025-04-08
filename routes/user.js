const express = require('express');
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

// Middleware to handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get user profile
router.get('/profile', auth, userController.getProfile);

// Update user profile with validation
router.put(
  '/profile',
  [
    auth,
    check('name').trim().notEmpty().withMessage('Name is required')
  ],
  validate,
  userController.updateProfile
);

// Get user history
router.get('/history', auth, userController.getUserHistory);

// Restore user data from history
router.post('/restore/:historyId', auth, userController.restoreUserData);

// Upload profile picture
router.post('/profile-picture', auth, userController.uploadProfilePicture);

// Delete profile picture
router.delete('/profile-picture', auth, userController.deleteProfilePicture);

module.exports = router;
