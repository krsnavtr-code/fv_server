const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { protect, admin } = require('../middleware/auth');

// All routes are protected and require admin access
router.use(protect, admin);

// Support Tickets
router.get('/support-tickets', supportController.getSupportTickets);
router.put('/support-tickets/:id/status', supportController.updateTicketStatus);
router.post('/support-tickets/:id/reply', supportController.replyToTicket);

// Q&A Forum
router.get('/qa-threads', supportController.getQAThreads);
router.put('/qa-threads/:id/status', supportController.updateQAStatus);
router.post('/qa-threads/:id/reply', supportController.replyToQA);

// Mentorship
router.get('/mentorships', supportController.getMentorships);
router.put('/mentorships/:id/status', supportController.updateMentorshipStatus);
router.post('/mentorships/:id/feedback', supportController.addMentorshipFeedback);
router.post('/mentorships', supportController.createMentorship);

// Resource Library
router.get('/resources', supportController.getResources);
router.post('/resources', supportController.createResource);
router.put('/resources/:id', supportController.updateResource);
router.delete('/resources/:id', supportController.deleteResource);
router.put('/resources/:id/featured', supportController.toggleResourceFeatured);

module.exports = router;
