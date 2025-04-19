const express = require('express');
const router = express.Router();
const verifyToken = require('../authMiddleware');
const logger = console;

// Database middleware
router.use((req, res, next) => {
  req.db = req.app.get('db');
  if (!req.db) {
    return res.status(500).json({ error: 'Database connection not available' });
  }
  next();
});

// Create employee
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, email, role } = req.body;

    // Validate input
    if (!name || !email || !role) {
      return res.status(400).json({ message: 'Name, email, and role are required' });
    }

    // Check if email already exists
    const [existingEmployee] = await req.db.query(
      'SELECT id FROM employees WHERE email = ?',
      [email]
    );

    if (existingEmployee.length > 0) {
      return res.status(400).json({ message: 'Employee with this email already exists' });
    }

    // Insert new employee
    const [result] = await req.db.query(
      'INSERT INTO employees (name, email, role) VALUES (?, ?, ?)',
      [name, email, role]
    );

    res.status(201).json({
      message: 'Employee created successfully',
      employee: {
        id: result.insertId,
        name,
        email,
        role
      }
    });
  } catch (error) {
    logger.error('Error creating employee:', error);
    res.status(500).json({ message: 'Error creating employee', error: error.message });
  }
});

// Get all employees
router.get('/', verifyToken, async (req, res) => {
  try {
    const [employees] = await req.db.query('SELECT * FROM employees');
    res.json(employees);
  } catch (error) {
    logger.error('Error fetching employees:', error);
    res.status(500).json({ message: 'Error fetching employees', error: error.message });
  }
});

// Get employee by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [employee] = await req.db.query(
      'SELECT * FROM employees WHERE id = ?',
      [req.params.id]
    );

    if (employee.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(employee[0]);
  } catch (error) {
    logger.error('Error fetching employee:', error);
    res.status(500).json({ message: 'Error fetching employee', error: error.message });
  }
});

// Update employee
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const employeeId = req.params.id;

    // Validate input
    if (!name || !email || !role) {
      return res.status(400).json({ message: 'Name, email, and role are required' });
    }

    // Check if employee exists
    const [existingEmployee] = await req.db.query(
      'SELECT id FROM employees WHERE id = ?',
      [employeeId]
    );

    if (existingEmployee.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Update employee
    await req.db.query(
      'UPDATE employees SET name = ?, email = ?, role = ? WHERE id = ?',
      [name, email, role, employeeId]
    );

    res.json({
      message: 'Employee updated successfully',
      employee: { id: employeeId, name, email, role }
    });
  } catch (error) {
    logger.error('Error updating employee:', error);
    res.status(500).json({ message: 'Error updating employee', error: error.message });
  }
});

// Delete employee
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const employeeId = req.params.id;

    // Check if employee exists
    const [existingEmployee] = await req.db.query(
      'SELECT id FROM employees WHERE id = ?',
      [employeeId]
    );

    if (existingEmployee.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Delete employee
    await req.db.query('DELETE FROM employees WHERE id = ?', [employeeId]);

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    logger.error('Error deleting employee:', error);
    res.status(500).json({ message: 'Error deleting employee', error: error.message });
  }
});

module.exports = router;
