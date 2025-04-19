const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');

// Get all programs
router.get('/', async (req, res) => {
  const query = 'SELECT * FROM programs';
  
  req.app.get('db').query(query, (err, results) => {
    if (err) {
      console.error('Error fetching programs:', err);
      return res.status(500).json({ message: 'Error fetching programs' });
    }
    res.json(results);
  });
});

// Get single program
router.get('/:id', async (req, res) => {
  const query = 'SELECT * FROM programs WHERE id = ?';
  
  req.app.get('db').query(query, [req.params.id], (err, results) => {
    if (err) {
      console.error('Error fetching program:', err);
      return res.status(500).json({ message: 'Error fetching program' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Program not found' });
    }
    res.json(results[0]);
  });
});

// Create program (Admin only)
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, duration, price } = req.body;
  const query = 'INSERT INTO programs (title, description, duration, price) VALUES (?, ?, ?, ?)';
  
  req.app.get('db').query(query, [title, description, duration, price], (err, results) => {
    if (err) {
      console.error('Error creating program:', err);
      return res.status(500).json({ message: 'Error creating program' });
    }
    res.status(201).json({ id: results.insertId, ...req.body });
  });
});

// Update program (Admin only)
router.put('/:id', authMiddleware, async (req, res) => {
  const { title, description, duration, price } = req.body;
  const query = 'UPDATE programs SET title = ?, description = ?, duration = ?, price = ? WHERE id = ?';
  
  req.app.get('db').query(query, [title, description, duration, price, req.params.id], (err, results) => {
    if (err) {
      console.error('Error updating program:', err);
      return res.status(500).json({ message: 'Error updating program' });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Program not found' });
    }
    res.json({ id: req.params.id, ...req.body });
  });
});

// Delete program (Admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  const query = 'DELETE FROM programs WHERE id = ?';
  
  req.app.get('db').query(query, [req.params.id], (err, results) => {
    if (err) {
      console.error('Error deleting program:', err);
      return res.status(500).json({ message: 'Error deleting program' });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Program not found' });
    }
    res.json({ message: 'Program deleted successfully' });
  });
});

module.exports = router;
