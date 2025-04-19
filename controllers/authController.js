const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/db');
const { sendVerificationEmail } = require('../utils/email');
const connection = require("../config/db");

// Admin Login Controller
exports.adminLogin = async (req, res) => {
  try {
    console.log('Admin login attempt:', req.body);
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    // First check if admin exists
    const [rows] = await db.query("SELECT * FROM admin_users WHERE username = ?", [username]);

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid username or password" });
    }

    const admin = rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid username or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ 
      id: admin.id, 
      username: admin.username,
      role: "admin" 
    }, process.env.JWT_SECRET, { 
      expiresIn: "24h" 
    });

    // Return only the raw JWT string (no 'Bearer ' prefix) for frontend compatibility
    console.log('Admin login successful for:', username);

    // Return success response with all necessary data
    res.json({ 
      success: true,
      token, // Only the raw JWT string
      message: "Admin login successful",
      admin: {
        id: admin.id,
        username: admin.username,
        role: "admin"
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Helper function to generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// Helper function to handle validation errors
const handleValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw { status: 400, errors: errors.array() };
  }
};

// Helper function to handle database errors
const handleDBError = (error) => {
  console.error('Database Error:', error);
  throw { status: 500, message: 'Database error occurred' };
};

// Auth Controller Methods
exports.signup = async (req, res) => {
  try {
    handleValidationErrors(req);
    const { name, email, password } = req.body;

    // Check if user exists
    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user and verification token
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword]
      );

      await connection.query(
        'INSERT INTO verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [result.insertId, otp, otpExpiry]
      );

      await connection.commit();

      // Send verification email
      await sendVerificationEmail(email, name, otp);

      res.status(201).json({
        success: true,
        userId: result.insertId,
        email,
        message: 'Registration successful! Please check your email for verification.'
      });
    } catch (error) {
      await connection.rollback();
      handleDBError(error);
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error',
      errors: error.errors
    });
  }
};

exports.login = async (req, res) => {
  try {
    handleValidationErrors(req);
    const { email, password } = req.body;

    // Get user
    const [users] = await db.query(
      'SELECT id, name, email, password, is_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User not found. Please check your email'
      });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Check if email is verified
    if (!user.is_verified) {
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await db.query(
        'INSERT INTO verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, otp, otpExpiry]
      );

      await sendVerificationEmail(email, user.name, otp);

      return res.status(400).json({
        success: false,
        needsVerification: true,
        userId: user.id,
        email: user.email,
        message: 'Please verify your email first. A new verification code has been sent to your email'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Get user data without password
    const { password: _, ...userData } = user;

    // Update last login timestamp
    await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    res.json({
      success: true,
      token,
      user: userData,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // Handle specific database errors
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      return res.status(500).json({
        success: false,
        message: 'Database connection error. Please try again later'
      });
    }

    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error occurred. Please try again'
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    handleValidationErrors(req);
    const { userId, otp } = req.body;

    // Check if OTP exists and is valid
    const [tokens] = await db.query(
      'SELECT * FROM verification_tokens WHERE user_id = ? AND token = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [userId, otp]
    );

    if (tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Update user verification status
    await db.query('UPDATE users SET is_verified = true WHERE id = ?', [userId]);

    // Delete used token
    await db.query('DELETE FROM verification_tokens WHERE id = ?', [tokens[0].id]);

    res.json({
      success: true,
      message: 'Email verified successfully',
      redirectTo: '/login'
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error',
      errors: error.errors
    });
  }
};

exports.resendVerification = async (req, res) => {
  try {
    handleValidationErrors(req);
    const { userId } = req.body;

    // Get user
    const [users] = await db.query(
      'SELECT name, email FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Save new verification token
    await db.query(
      'INSERT INTO verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, otp, otpExpiry]
    );

    // Send verification email
    await sendVerificationEmail(user.email, user.name, otp);

    res.json({
      success: true,
      message: 'Verification code sent! Please check your email.'
    });
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error',
      errors: error.errors
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, mobile, course, created_at, updated_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    handleValidationErrors(req);
    const { name, mobile, course } = req.body;
    const userId = req.user.userId;

    // Start transaction
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Update user profile
      await connection.query(
        'UPDATE users SET name = ?, mobile = ?, course = ? WHERE id = ?',
        [name, mobile, course, userId]
      );

      // Save to history
      await connection.query(
        'INSERT INTO user_history (user_id, name, mobile, course, action_type) VALUES (?, ?, ?, ?, ?)',
        [userId, name, mobile, course, 'UPDATE']
      );

      await connection.commit();

      // Get updated user data
      const [users] = await connection.query(
        'SELECT id, name, email, mobile, course, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      );

      res.json({
        success: true,
        user: users[0],
        message: 'Profile updated successfully'
      });
    } catch (error) {
      await connection.rollback();
      handleDBError(error);
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error',
      errors: error.errors
    });
  }
};

exports.getUserHistory = async (req, res) => {
  try {
    const [history] = await db.query(
      'SELECT * FROM user_history WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    );

    res.json({
      success: true,
      history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

exports.restoreProfile = async (req, res) => {
  try {
    const { historyId } = req.body;
    const userId = req.user.userId;

    // Get history record
    const [history] = await db.query(
      'SELECT * FROM user_history WHERE id = ? AND user_id = ?',
      [historyId, userId]
    );

    if (history.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'History record not found'
      });
    }

    const historyRecord = history[0];

    // Start transaction
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Update user profile
      await connection.query(
        'UPDATE users SET name = ?, mobile = ?, course = ? WHERE id = ?',
        [historyRecord.name, historyRecord.mobile, historyRecord.course, userId]
      );

      // Save to history
      await connection.query(
        'INSERT INTO user_history (user_id, name, mobile, course, action_type) VALUES (?, ?, ?, ?, ?)',
        [userId, historyRecord.name, historyRecord.mobile, historyRecord.course, 'RESTORE']
      );

      await connection.commit();

      // Get updated user data
      const [users] = await connection.query(
        'SELECT id, name, email, mobile, course, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      );

      res.json({
        success: true,
        user: users[0],
        message: 'Profile restored successfully'
      });
    } catch (error) {
      await connection.rollback();
      handleDBError(error);
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get all users
exports.getAllUser = async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    
    const [rows] = await db.query(
      'SELECT id, name, email, mobile, course FROM users WHERE name LIKE ? OR email LIKE ? OR mobile LIKE ? OR course LIKE ?',
      [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data'
    });
  }
};

// Get user by ID
exports.getUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const [user] = await db.query('SELECT id, name, email, role, is_verified FROM users WHERE id = ?', [userId]);

    if (!user[0]) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user[0]
    });
  } catch (error) {
    handleDBError(error);
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, mobile, course } = req.body;

    const updates = [];
    const values = [];

    if (name) updates.push('name = ?'); values.push(name);
    if (mobile) updates.push('mobile = ?'); values.push(mobile);
    if (course) updates.push('course = ?'); values.push(course);

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    values.push(userId);

    await db.query(updateQuery, values);

    const [updatedUser] = await db.query('SELECT id, name, email, role, is_verified FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser[0]
    });
  } catch (error) {
    handleDBError(error);
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    handleDBError(error);
  }
};

// Get all instructors
exports.getAllInstructors = async (req, res) => {
  try {
    const [instructors] = await db.query('SELECT id, name, email, role, is_verified FROM users WHERE role IN (?, ?)', ['admin', 'instructor']);
    res.json({
      success: true,
      instructors
    });
  } catch (error) {
    handleDBError(error);
  }
};

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const [students] = await db.query('SELECT id, name, email, role, is_verified FROM users WHERE role = ?', ['student']);
    res.json({
      success: true,
      students
    });
  } catch (error) {
    handleDBError(error);
  }
};
