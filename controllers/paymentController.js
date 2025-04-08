const db = require('../config/db');
// Initialize Stripe with a placeholder key if environment variable is not set
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Get all transactions with optional date filtering
const getTransactions = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let query = `
            SELECT p.id, p.transaction_id as transactionId, p.amount, p.status, p.payment_method as paymentMethod,
                   p.created_at as date, u.name as student, c.title as course
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN courses c ON p.course_id = c.id
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        if (startDate && endDate) {
            query += ` AND p.created_at BETWEEN ? AND ?`;
            queryParams.push(startDate, endDate);
        }
        
        query += ` ORDER BY p.created_at DESC`;
        
        const [transactions] = await db.execute(query, queryParams);
        
        // Get items for each transaction
        for (let transaction of transactions) {
            const [items] = await db.execute(`
                SELECT i.name, i.price
                FROM payment_items i
                WHERE i.payment_id = ?
            `, [transaction.id]);
            
            transaction.items = items;
        }
        
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all subscriptions with optional date filtering
const getSubscriptions = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let query = `
            SELECT s.id, s.subscription_id as subscriptionId, s.amount, s.status,
                   s.created_at as startDate, s.next_billing_date as nextBillingDate,
                   u.name as student, p.name as plan
            FROM subscriptions s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN subscription_plans p ON s.plan_id = p.id
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        if (startDate && endDate) {
            query += ` AND s.created_at BETWEEN ? AND ?`;
            queryParams.push(startDate, endDate);
        }
        
        query += ` ORDER BY s.next_billing_date ASC`;
        
        const [subscriptions] = await db.execute(query, queryParams);
        
        res.json(subscriptions);
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get all instructor payouts with optional date filtering
const getPayouts = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let query = `
            SELECT p.id, p.payout_id as payoutId, p.amount, p.status, p.payment_method as paymentMethod,
                   p.created_at as date, i.name as instructor,
                   (SELECT COUNT(*) FROM payout_courses pc WHERE pc.payout_id = p.id) as courseCount
            FROM instructor_payouts p
            LEFT JOIN instructors i ON p.instructor_id = i.id
            WHERE 1=1
        `;
        
        const queryParams = [];
        
        if (startDate && endDate) {
            query += ` AND p.created_at BETWEEN ? AND ?`;
            queryParams.push(startDate, endDate);
        }
        
        query += ` ORDER BY p.created_at DESC`;
        
        const [payouts] = await db.execute(query, queryParams);
        
        // Get courses for each payout
        for (let payout of payouts) {
            const [courses] = await db.execute(`
                SELECT pc.course_id, c.title, pc.students, pc.revenue, pc.payout
                FROM payout_courses pc
                LEFT JOIN courses c ON pc.course_id = c.id
                WHERE pc.payout_id = ?
            `, [payout.id]);
            
            payout.courses = courses;
        }
        
        res.json(payouts);
    } catch (error) {
        console.error('Error fetching payouts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Process a refund for a transaction
const processRefund = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get payment details
        const [payment] = await db.execute(
            'SELECT * FROM payments WHERE id = ?',
            [id]
        );
        
        if (payment.length === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        
        const paymentData = payment[0];
        
        if (paymentData.status !== 'completed') {
            return res.status(400).json({ message: 'Only completed payments can be refunded' });
        }
        
        // Process refund through Stripe if payment was made through Stripe
        if (paymentData.payment_method === 'stripe' && paymentData.stripe_payment_id) {
            const refund = await stripe.refunds.create({
                payment_intent: paymentData.stripe_payment_id,
            });
            
            // Update payment status in database
            await db.execute(
                'UPDATE payments SET status = ?, refund_id = ?, updated_at = NOW() WHERE id = ?',
                ['refunded', refund.id, id]
            );
        } else {
            // For other payment methods, just update the status
            await db.execute(
                'UPDATE payments SET status = ?, updated_at = NOW() WHERE id = ?',
                ['refunded', id]
            );
        }
        
        // If this was a course purchase, update the enrollment status
        if (paymentData.course_id) {
            await db.execute(
                'UPDATE course_enrollments SET status = ? WHERE user_id = ? AND course_id = ?',
                ['refunded', paymentData.user_id, paymentData.course_id]
            );
        }
        
        res.json({ message: 'Refund processed successfully' });
    } catch (error) {
        console.error('Error processing refund:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Process an instructor payout
const processPayout = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get payout details
        const [payout] = await db.execute(
            'SELECT * FROM instructor_payouts WHERE id = ?',
            [id]
        );
        
        if (payout.length === 0) {
            return res.status(404).json({ message: 'Payout not found' });
        }
        
        const payoutData = payout[0];
        
        if (payoutData.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending payouts can be processed' });
        }
        
        // Get instructor payment details
        const [instructor] = await db.execute(
            'SELECT * FROM instructors WHERE id = ?',
            [payoutData.instructor_id]
        );
        
        if (instructor.length === 0) {
            return res.status(404).json({ message: 'Instructor not found' });
        }
        
        // Process payout through Stripe if instructor has Stripe account
        if (instructor[0].stripe_account_id) {
            const transfer = await stripe.transfers.create({
                amount: Math.round(payoutData.amount * 100), // Convert to cents
                currency: 'usd',
                destination: instructor[0].stripe_account_id,
                description: `Payout for instructor ${instructor[0].name}`,
            });
            
            // Update payout status in database
            await db.execute(
                'UPDATE instructor_payouts SET status = ?, stripe_transfer_id = ?, updated_at = NOW() WHERE id = ?',
                ['completed', transfer.id, id]
            );
        } else {
            // For instructors without Stripe accounts, mark as manual payout
            await db.execute(
                'UPDATE instructor_payouts SET status = ?, notes = ?, updated_at = NOW() WHERE id = ?',
                ['completed', 'Manual payout required', id]
            );
        }
        
        res.json({ message: 'Payout processed successfully' });
    } catch (error) {
        console.error('Error processing payout:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Update subscription status (activate, pause, cancel)
const updateSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Get subscription details
        const [subscription] = await db.execute(
            'SELECT * FROM subscriptions WHERE id = ?',
            [id]
        );
        
        if (subscription.length === 0) {
            return res.status(404).json({ message: 'Subscription not found' });
        }
        
        const subscriptionData = subscription[0];
        
        // Update subscription in Stripe if it's a Stripe subscription
        if (subscriptionData.stripe_subscription_id) {
            if (status === 'active') {
                await stripe.subscriptions.resume(subscriptionData.stripe_subscription_id);
            } else if (status === 'paused') {
                await stripe.subscriptions.pause(subscriptionData.stripe_subscription_id);
            } else if (status === 'cancelled') {
                await stripe.subscriptions.cancel(subscriptionData.stripe_subscription_id);
            }
        }
        
        // Update subscription status in database
        await db.execute(
            'UPDATE subscriptions SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, id]
        );
        
        res.json({ message: 'Subscription updated successfully' });
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get payment analytics
const getPaymentAnalytics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Default to last 30 days if no dates provided
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];
        
        // Get total revenue
        const [revenue] = await db.execute(`
            SELECT SUM(amount) as total
            FROM payments
            WHERE status = 'completed'
            AND created_at BETWEEN ? AND ?
        `, [start, end]);
        
        // Get total refunds
        const [refunds] = await db.execute(`
            SELECT SUM(amount) as total
            FROM payments
            WHERE status = 'refunded'
            AND created_at BETWEEN ? AND ?
        `, [start, end]);
        
        // Get total payouts
        const [payouts] = await db.execute(`
            SELECT SUM(amount) as total
            FROM instructor_payouts
            WHERE status = 'completed'
            AND created_at BETWEEN ? AND ?
        `, [start, end]);
        
        // Get active subscriptions
        const [subscriptions] = await db.execute(`
            SELECT COUNT(*) as count
            FROM subscriptions
            WHERE status = 'active'
        `);
        
        // Get daily revenue for chart
        const [dailyRevenue] = await db.execute(`
            SELECT DATE(created_at) as date, SUM(amount) as amount
            FROM payments
            WHERE status = 'completed'
            AND created_at BETWEEN ? AND ?
            GROUP BY DATE(created_at)
            ORDER BY date
        `, [start, end]);
        
        // Get top selling courses
        const [topCourses] = await db.execute(`
            SELECT c.id, c.title, COUNT(p.id) as sales, SUM(p.amount) as revenue
            FROM payments p
            JOIN courses c ON p.course_id = c.id
            WHERE p.status = 'completed'
            AND p.created_at BETWEEN ? AND ?
            GROUP BY c.id
            ORDER BY sales DESC
            LIMIT 5
        `, [start, end]);
        
        res.json({
            totalRevenue: revenue[0].total || 0,
            totalRefunds: refunds[0].total || 0,
            totalPayouts: payouts[0].total || 0,
            activeSubscriptions: subscriptions[0].count,
            dailyRevenue,
            topCourses
        });
    } catch (error) {
        console.error('Error fetching payment analytics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getTransactions,
    getSubscriptions,
    getPayouts,
    processRefund,
    processPayout,
    updateSubscription,
    getPaymentAnalytics
};
