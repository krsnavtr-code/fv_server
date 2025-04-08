const express = require('express');
const router = express.Router();
const userPaymentController = require('../controllers/userPaymentController');
const { protect } = require('../middleware/auth');

// All routes are protected and require user authentication
router.use(protect);

// Payment processing
router.post('/process', userPaymentController.processPayment);
router.get('/history', userPaymentController.getPaymentHistory);
router.get('/details/:id', userPaymentController.getPaymentDetails);
router.post('/verify-bank-transfer', userPaymentController.verifyBankTransfer);

// Saved payment methods
router.get('/methods', userPaymentController.getSavedPaymentMethods);
router.post('/methods', userPaymentController.addPaymentMethod);
router.delete('/methods/:id', userPaymentController.removePaymentMethod);

// Subscription management
router.get('/subscriptions', userPaymentController.getUserSubscriptions);
router.put('/subscriptions/:id', userPaymentController.updateSubscription);

// Refund requests
router.post('/refund-request', userPaymentController.requestRefund);
router.get('/refund-status/:id', userPaymentController.getRefundStatus);

module.exports = router;
