const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = console; // assuming console is used for logging

// Database middleware
router.use((req, res, next) => {
  req.db = req.app.get('db');
  if (!req.db) {
    return res.status(500).json({ error: 'Database connection not available' });
  }
  next();
});

// Admin login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      logger.error('Admin login error: Username and password are required');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    logger.info('Checking admin user:', { username });
    const [rows] = await req.db.query(
      'SELECT * FROM admin_users WHERE username = ?',
      [username]
    );

    logger.info('Query results:', { rowsCount: rows.length });

    if (rows.length === 0) {
      logger.error('Admin login error: User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    logger.info('Found admin user:', { id: admin.id, username: admin.username });
    
    // Compare password
    logger.info('Comparing passwords');
    const isValidPassword = await bcrypt.compare(password, admin.password);
    logger.info('Password comparison result:', { isValid: isValidPassword });
    
    if (!isValidPassword) {
      logger.error('Admin login error: Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info('Admin login successful');
    res.json({ 
      message: "Login successful",
      token,
      admin: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

module.exports = router;
