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
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      const errorMsg = `Admin login error: Missing credentials. Email: ${email ? 'provided' : 'missing'}, Password: ${password ? 'provided' : 'missing'}`;
      logger.error(errorMsg);
      return res.status(400).json({ error: 'Email and password are required' });
    }

    logger.info('Checking admin user with email:', { email });
    const [rows] = await req.db.query(
      'SELECT * FROM admin_users WHERE email = ?',
      [email]
    );

    logger.info('Query results:', { rowsCount: rows.length });

    if (rows.length === 0) {
      logger.error('Admin login error: User not found with email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    logger.info('Found admin user:', { id: admin.id, email: admin.email });
    
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
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: 'admin',
        isAdmin: true
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
