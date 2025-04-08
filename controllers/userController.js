const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/profile-pictures');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `profile-${req.user.userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const isValid = allowedTypes.test(file.mimetype) && allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg, and .jpeg formats are allowed!'));
    }
  }
}).single('profilePicture');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT id, name, email, role, profile_picture, created_at FROM users';
    let params = [];

    if (search) {
      query += ' WHERE name LIKE ? OR email LIKE ?';
      params = [`%${search}%`, `%${search}%`];
    }

    query += ' ORDER BY created_at DESC';

    const [users] = await db.execute(query, params);
    res.json({ data: users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify user exists
    const [rows] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// Get user profile
const getProfile = async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, name, email, role, profile_picture, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error getting profile' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Update user name
    await db.execute('UPDATE users SET name = ? WHERE id = ?', [name, req.user.userId]);

    // Log the change in history
    await db.execute(
      'INSERT INTO user_history (user_id, name, action_type, changed_by) VALUES (?, ?, ?, ?)',
      [req.user.userId, name, 'UPDATE', req.user.userId]
    );

    // Get updated user
    const [users] = await db.execute(
      'SELECT id, name, email, role, profile_picture, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    res.json({
      message: 'Profile updated successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// Get user history
const getUserHistory = async (req, res) => {
  try {
    const [history] = await db.execute(
      `SELECT 
        h.id,
        h.name,
        h.changed_at,
        h.action_type,
        COALESCE(u.name, 'System') AS changed_by_name
      FROM user_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.user_id = ?
      ORDER BY h.changed_at DESC`,
      [req.user.userId]
    );

    res.json({ success: true, history });
  } catch (error) {
    console.error('Get user history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user history' });
  }
};

// Restore user data from history
const restoreUserData = async (req, res) => {
  try {
    const { historyId } = req.params;

    // Get history record
    const [history] = await db.execute(
      'SELECT * FROM user_history WHERE id = ? AND user_id = ?',
      [historyId, req.user.userId]
    );

    if (history.length === 0) {
      return res.status(404).json({ success: false, message: 'History record not found' });
    }

    const historicalData = history[0];

    // Update user data
    await db.execute('UPDATE users SET name = ? WHERE id = ?', [historicalData.name, req.user.userId]);

    // Log the restoration in history
    await db.execute(
      'INSERT INTO user_history (user_id, name, action_type, changed_by) VALUES (?, ?, ?, ?)',
      [req.user.userId, historicalData.name, 'RESTORE', req.user.userId]
    );

    // Get updated user
    const [users] = await db.execute(
      'SELECT id, name, email, role, profile_picture, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    res.json({ success: true, message: 'User data restored successfully', user: users[0] });
  } catch (error) {
    console.error('Restore user data error:', error);
    res.status(500).json({ success: false, message: 'Failed to restore user data' });
  }
};

// Upload profile picture
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const profilePicturePath = `/uploads/profile-pictures/${req.file.filename}`;

    // Update user's profile picture in database
    await db.execute('UPDATE users SET profile_picture = ? WHERE id = ?', [profilePicturePath, req.user.userId]);

    res.json({ message: 'Profile picture uploaded successfully', profilePicture: profilePicturePath });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ message: 'Error uploading profile picture' });
  }
};

// Delete profile picture
const deleteProfilePicture = async (req, res) => {
  try {
    // Get the current profile picture
    const [user] = await db.execute('SELECT profile_picture FROM users WHERE id = ?', [req.user.userId]);

    if (user.length > 0 && user[0].profile_picture) {
      const filePath = path.join(__dirname, '..', user[0].profile_picture);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Update user's profile picture to NULL
    await db.execute('UPDATE users SET profile_picture = NULL WHERE id = ?', [req.user.userId]);

    res.json({ message: 'Profile picture removed successfully' });
  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({ message: 'Error removing profile picture' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getUserHistory,
  restoreUserData,
  uploadProfilePicture,
  deleteProfilePicture,
  getAllUsers,
  deleteUser
};
