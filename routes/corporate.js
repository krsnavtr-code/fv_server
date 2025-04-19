const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const upload = require('../utils/upload');
const { sendEmail, emailTemplates } = require('../utils/email');

// Submit corporate training request
router.post('/request', async (req, res) => {
  const {
    companyName,
    contactPerson,
    email,
    phone,
    employeeCount,
    preferredProgram,
    customRequirements,
    preferredDates
  } = req.body;

  const query = `
    INSERT INTO corporate_requests (
      company_name, contact_person, email, phone,
      employee_count, preferred_program, custom_requirements,
      preferred_dates, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `;

  try {
    req.app.get('db').query(
      query,
      [companyName, contactPerson, email, phone, employeeCount, 
       preferredProgram, customRequirements, preferredDates],
      async (err, results) => {
        if (err) {
          console.error('Error creating corporate request:', err);
          return res.status(500).json({ message: 'Error submitting request' });
        }

        // Send email notifications
        try {
          // Send confirmation to company
          await sendEmail({
            to: email,
            ...emailTemplates.corporateRequest(companyName, contactPerson, preferredProgram)
          });

          // Send notification to admin
          await sendEmail({
            to: process.env.ADMIN_EMAIL,
            ...emailTemplates.corporateRequest(companyName, contactPerson, preferredProgram)
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // Continue with the response even if email fails
        }

        res.status(201).json({
          message: 'Corporate training request submitted successfully',
          requestId: results.insertId
        });
      }
    );
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all corporate requests (Admin only)
router.get('/requests', authMiddleware, async (req, res) => {
  const query = 'SELECT * FROM corporate_requests ORDER BY created_at DESC';

  req.app.get('db').query(query, (err, results) => {
    if (err) {
      console.error('Error fetching corporate requests:', err);
      return res.status(500).json({ message: 'Error fetching requests' });
    }
    res.json(results);
  });
});

// Update corporate request status (Admin only)
router.put('/request/:id', authMiddleware, async (req, res) => {
  const { status, adminNotes } = req.body;
  const query = 'UPDATE corporate_requests SET status = ?, admin_notes = ? WHERE id = ?';

  req.app.get('db').query(query, [status, adminNotes, req.params.id], (err, results) => {
    if (err) {
      console.error('Error updating corporate request:', err);
      return res.status(500).json({ message: 'Error updating request' });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }
    res.json({ message: 'Request updated successfully' });
  });
});

// Admin Dashboard Route
router.get('/admin/dashboard', authMiddleware, (req, res) => {
    // Placeholder for admin dashboard
    res.json({ message: 'Welcome to the Admin Dashboard' });
});

module.exports = router;
