const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/auth');

// All routes are protected and require admin access
router.use(protect, admin);

// Get transactions, subscriptions, and payouts
router.get('/transactions', paymentController.getTransactions);
router.get('/subscriptions', paymentController.getSubscriptions);
router.get('/payouts', paymentController.getPayouts);

// Process refunds and payouts
router.post('/refund/:id', paymentController.processRefund);
router.post('/process-payout/:id', paymentController.processPayout);

// Update subscription status
router.put('/subscription/:id', paymentController.updateSubscription);

// Get payment analytics
router.get('/analytics', paymentController.getPaymentAnalytics);

module.exports = router;
