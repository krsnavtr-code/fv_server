const express = require('express');
const router = express.Router();
const pool = require('../app');

// Add a new student
router.post('/', async (req, res) => {
    try {
        const { name, email, mobile, course } = req.body;
        
        // Validate required fields
        if (!name || !email || !mobile || !course) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Insert student into database
        const [result] = await pool.query(
            'INSERT INTO students (name, email, mobile, course) VALUES (?, ?, ?, ?)',
            [name, email, mobile, course]
        );

        res.status(201).json({
            message: 'Student added successfully',
            studentId: result.insertId
        });
    } catch (error) {
        console.error('Error adding student:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
