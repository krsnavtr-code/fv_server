const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const dbConfig = require('../config/db');

const pool = mysql.createPool(dbConfig);

// Protect routes - verify JWT token and add user to request
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const connection = await pool.getConnection();

      try {
        const [users] = await connection.execute(
          'SELECT id, name, email FROM users WHERE id = ?',
          [decoded.id]
        );

        if (users.length === 0) {
          return res.status(401).json({ message: 'User not found' });
        }

        req.user = users[0];
        next();
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error in auth middleware' });
  }
};

// Admin middleware - restrict to admin users only
exports.admin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, no user found' });
    }

    const connection = await pool.getConnection();
    try {
      const [roles] = await connection.execute(
        'SELECT role FROM users WHERE id = ?',
        [req.user.id]
      );

      if (roles.length === 0 || roles[0].role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized as admin' });
      }

      next();
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Server error in admin middleware' });
  }
};

// Restrict to specific roles
exports.restrictTo = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, no user found' });
      }

      const connection = await pool.getConnection();
      try {
        const [userRoles] = await connection.execute(
          'SELECT role FROM users WHERE id = ?',
          [req.user.id]
        );

        if (userRoles.length === 0 || !roles.includes(userRoles[0].role)) {
          return res.status(403).json({ message: 'Not authorized for this action' });
        }

        next();
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Role restriction middleware error:', error);
      res.status(500).json({ message: 'Server error in role middleware' });
    }
  };
};
