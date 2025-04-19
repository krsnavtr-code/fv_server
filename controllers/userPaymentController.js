const db = require('../config/db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Process a payment for course enrollment
const processPayment = async (req, res) => {
    try {
        const { courseId, amount, paymentMethod, cardDetails } = req.body;
        const userId = req.user.id;

        // In a real application, we would use Stripe to process the payment
        // For demo purposes, we'll simulate a successful payment

        // Generate a transaction ID
        const transactionId = `TXN${Math.floor(Math.random() * 1000000)}`;

        // Insert payment record into database
        const [result] = await db.execute(
            `INSERT INTO payments 
             (user_id, course_id, transaction_id, amount, payment_method, status, created_at)
             VALUES (?, ?, ?, ?, ?, 'completed', NOW())`,
            [userId, courseId, transactionId, amount, paymentMethod]
        );

        // If card details were provided and user wants to save the card
        if (paymentMethod === 'card' && cardDetails && cardDetails.saveCard) {
            await db.execute(
                `INSERT INTO saved_payment_methods 
                 (user_id, type, last4, expiry_date, created_at)
                 VALUES (?, 'card', ?, ?, NOW())`,
                [userId, cardDetails.last4, cardDetails.expiryDate]
            );
        }

        // Enroll user in the course
        await db.execute(
            `INSERT INTO enrollments 
             (user_id, course_id, enrollment_date, payment_id, status)
             VALUES (?, ?, NOW(), ?, 'active')`,
            [userId, courseId, result.insertId]
        );

        res.status(200).json({
            success: true,
            message: 'Payment processed successfully',
            data: {
                transactionId,
                courseId,
                amount,
                status: 'completed'
            }
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({ message: 'Payment processing failed' });
    }
};

// Get user's payment history
const getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [payments] = await db.execute(`
            SELECT p.id, p.transaction_id as transactionId, p.amount, p.status, 
                   p.payment_method as paymentMethod, p.created_at as date,
                   c.title as course
            FROM payments p
            JOIN courses c ON p.course_id = c.id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
        `, [userId]);
        
        res.json(payments);
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({ message: 'Failed to fetch payment history' });
    }
};

// Get details of a specific payment
const getPaymentDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const [payments] = await db.execute(`
            SELECT p.id, p.transaction_id as transactionId, p.amount, p.status, 
                   p.payment_method as paymentMethod, p.created_at as date,
                   c.title as course, c.id as courseId, u.name as userName,
                   u.email as userEmail
            FROM payments p
            JOIN courses c ON p.course_id = c.id
            JOIN users u ON p.user_id = u.id
            WHERE p.id = ? AND p.user_id = ?
        `, [id, userId]);
        
        if (payments.length === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        
        res.json(payments[0]);
    } catch (error) {
        console.error('Error fetching payment details:', error);
        res.status(500).json({ message: 'Failed to fetch payment details' });
    }
};

// Verify a bank transfer payment
const verifyBankTransfer = async (req, res) => {
    try {
        const { courseId, transferReference } = req.body;
        const userId = req.user.id;
        
        // In a real application, we would verify the bank transfer with the bank's API
        // For demo purposes, we'll simulate a pending payment
        
        // Generate a transaction ID
        const transactionId = `TXN${Math.floor(Math.random() * 1000000)}`;
        
        // Insert payment record into database
        const [result] = await db.execute(
            `INSERT INTO payments 
             (user_id, course_id, transaction_id, amount, payment_method, status, reference, created_at)
             VALUES (?, ?, ?, (SELECT price FROM courses WHERE id = ?), 'bank_transfer', 'pending', ?, NOW())`,
            [userId, courseId, transactionId, courseId, transferReference]
        );
        
        res.status(200).json({
            success: true,
            message: 'Bank transfer verification submitted. Your enrollment will be activated once payment is confirmed.',
            data: {
                transactionId,
                courseId,
                status: 'pending'
            }
        });
    } catch (error) {
        console.error('Error verifying bank transfer:', error);
        res.status(500).json({ message: 'Bank transfer verification failed' });
    }
};

// Get user's saved payment methods
const getSavedPaymentMethods = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [methods] = await db.execute(`
            SELECT id, type, last4, expiry_date as expiryDate, created_at as createdAt
            FROM saved_payment_methods
            WHERE user_id = ?
            ORDER BY created_at DESC
        `, [userId]);
        
        res.json(methods);
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ message: 'Failed to fetch payment methods' });
    }
};

// Add a new payment method
const addPaymentMethod = async (req, res) => {
    try {
        const { type, last4, expiryDate } = req.body;
        const userId = req.user.id;
        
        // In a real application, we would use Stripe to tokenize and store the card
        // For demo purposes, we'll just store the last 4 digits and expiry date
        
        const [result] = await db.execute(
            `INSERT INTO saved_payment_methods 
             (user_id, type, last4, expiry_date, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [userId, type, last4, expiryDate]
        );
        
        res.status(201).json({
            success: true,
            message: 'Payment method added successfully',
            data: {
                id: result.insertId,
                type,
                last4,
                expiryDate
            }
        });
    } catch (error) {
        console.error('Error adding payment method:', error);
        res.status(500).json({ message: 'Failed to add payment method' });
    }
};

// Remove a payment method
const removePaymentMethod = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        await db.execute(
            'DELETE FROM saved_payment_methods WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        res.json({ message: 'Payment method removed successfully' });
    } catch (error) {
        console.error('Error removing payment method:', error);
        res.status(500).json({ message: 'Failed to remove payment method' });
    }
};

// Get user's subscriptions
const getUserSubscriptions = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [subscriptions] = await db.execute(`
            SELECT s.id, s.plan_name as planName, s.amount, s.billing_cycle as billingCycle,
                   s.next_billing_date as nextBillingDate, s.status, s.created_at as startDate
            FROM subscriptions s
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC
        `, [userId]);
        
        res.json(subscriptions);
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ message: 'Failed to fetch subscriptions' });
    }
};

// Update subscription status (cancel, pause, resume)
const updateSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;
        const userId = req.user.id;
        
        let newStatus;
        switch (action) {
            case 'cancel':
                newStatus = 'cancelled';
                break;
            case 'pause':
                newStatus = 'paused';
                break;
            case 'resume':
                newStatus = 'active';
                break;
            default:
                return res.status(400).json({ message: 'Invalid action' });
        }
        
        await db.execute(
            'UPDATE subscriptions SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
            [newStatus, id, userId]
        );
        
        res.json({ 
            message: `Subscription ${action}ed successfully`,
            status: newStatus
        });
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ message: 'Failed to update subscription' });
    }
};

// Request a refund
const requestRefund = async (req, res) => {
    try {
        const { paymentId, reason } = req.body;
        const userId = req.user.id;
        
        // Check if payment exists and belongs to user
        const [payments] = await db.execute(
            'SELECT * FROM payments WHERE id = ? AND user_id = ?',
            [paymentId, userId]
        );
        
        if (payments.length === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        
        // Check if payment is eligible for refund (e.g., within 30 days)
        const payment = payments[0];
        const paymentDate = new Date(payment.created_at);
        const now = new Date();
        const daysSincePayment = Math.floor((now - paymentDate) / (1000 * 60 * 60 * 24));
        
        if (daysSincePayment > 30) {
            return res.status(400).json({ message: 'Refund period has expired (30 days)' });
        }
        
        // Create refund request
        const [result] = await db.execute(
            `INSERT INTO refund_requests 
             (payment_id, user_id, reason, status, created_at)
             VALUES (?, ?, ?, 'pending', NOW())`,
            [paymentId, userId, reason]
        );
        
        res.status(201).json({
            success: true,
            message: 'Refund request submitted successfully',
            data: {
                id: result.insertId,
                status: 'pending'
            }
        });
    } catch (error) {
        console.error('Error requesting refund:', error);
        res.status(500).json({ message: 'Failed to request refund' });
    }
};

// Get refund status
const getRefundStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const [requests] = await db.execute(`
            SELECT r.id, r.status, r.reason, r.created_at as requestDate,
                   r.processed_at as processedDate, r.admin_notes as notes,
                   p.transaction_id as transactionId, p.amount
            FROM refund_requests r
            JOIN payments p ON r.payment_id = p.id
            WHERE r.id = ? AND r.user_id = ?
        `, [id, userId]);
        
        if (requests.length === 0) {
            return res.status(404).json({ message: 'Refund request not found' });
        }
        
        res.json(requests[0]);
    } catch (error) {
        console.error('Error fetching refund status:', error);
        res.status(500).json({ message: 'Failed to fetch refund status' });
    }
};

module.exports = {
    processPayment,
    getPaymentHistory,
    getPaymentDetails,
    verifyBankTransfer,
    getSavedPaymentMethods,
    addPaymentMethod,
    removePaymentMethod,
    getUserSubscriptions,
    updateSubscription,
    requestRefund,
    getRefundStatus
};
