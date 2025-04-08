const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');

// Get all users (Admin only)
router.get('/', authMiddleware, async (req, res) => {
  const query = 'SELECT id, name, email, created_at FROM users';
  
  req.app.get('db').query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ message: 'Error fetching users' });
    }
    res.json(results);
  });
});

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  const query = 'SELECT id, name, email, created_at FROM users WHERE id = ?';
  
  req.app.get('db').query(query, [req.user.id], (err, results) => {
    if (err) {
      console.error('Error fetching user profile:', err);
      return res.status(500).json({ message: 'Error fetching user profile' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(results[0]);
  });
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  const { name, email } = req.body;
  const query = 'UPDATE users SET name = ?, email = ? WHERE id = ?';
  
  req.app.get('db').query(query, [name, email, req.user.id], (err, results) => {
    if (err) {
      console.error('Error updating user profile:', err);
      return res.status(500).json({ message: 'Error updating user profile' });
    }
    res.json({ message: 'Profile updated successfully' });
  });
});

// Delete user (Admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }

  const query = 'DELETE FROM users WHERE id = ?';
  
  req.app.get('db').query(query, [req.params.id], (err, results) => {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).json({ message: 'Error deleting user' });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  });
});

module.exports = router;
