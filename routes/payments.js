const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { sendEmail, emailTemplates } = require('../utils/email');
const {
  createPaymentIntent,
  createCustomer,
  createProduct,
  createPrice,
  createSubscription
} = require('../utils/stripe');

// Create payment intent for program enrollment
router.post('/program-enrollment', authMiddleware, async (req, res) => {
  const { programId, paymentType } = req.body;
  
  try {
    const query = 'SELECT * FROM programs WHERE id = ?';
    req.app.get('db').query(query, [programId], async (err, results) => {
      if (err) {
        console.error('Error fetching program:', err);
        return res.status(500).json({ message: 'Error processing payment' });
      }
      
      if (results.length === 0) {
        return res.status(404).json({ message: 'Program not found' });
      }

      const program = results[0];
      
      // Create or retrieve Stripe customer
      const customerQuery = 'SELECT stripe_customer_id FROM users WHERE id = ?';
      req.app.get('db').query(customerQuery, [req.user.id], async (err, customerResults) => {
        if (err) {
          console.error('Error fetching customer:', err);
          return res.status(500).json({ message: 'Error processing payment' });
        }

        let customerId = customerResults[0]?.stripe_customer_id;

        if (!customerId) {
          const userQuery = 'SELECT name, email FROM users WHERE id = ?';
          req.app.get('db').query(userQuery, [req.user.id], async (err, userResults) => {
            if (err) {
              console.error('Error fetching user:', err);
              return res.status(500).json({ message: 'Error processing payment' });
            }

            const customer = await createCustomer({
              email: userResults[0].email,
              name: userResults[0].name,
              metadata: { userId: req.user.id }
            });

            customerId = customer.id;

            // Update user with Stripe customer ID
            const updateQuery = 'UPDATE users SET stripe_customer_id = ? WHERE id = ?';
            req.app.get('db').query(updateQuery, [customerId, req.user.id]);
          });
        }

        // Create payment intent
        const paymentIntent = await createPaymentIntent({
          amount: program.price,
          currency: 'inr',
          metadata: {
            programId,
            userId: req.user.id,
            programName: program.title
          }
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
          amount: program.price,
          currency: 'inr'
        });
      });
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ message: 'Error processing payment' });
  }
});

// Create payment intent for corporate training
router.post('/corporate-training', authMiddleware, async (req, res) => {
  const { requestId } = req.body;

  try {
    const query = 'SELECT * FROM corporate_requests WHERE id = ?';
    req.app.get('db').query(query, [requestId], async (err, results) => {
      if (err) {
        console.error('Error fetching request:', err);
        return res.status(500).json({ message: 'Error processing payment' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Corporate training request not found' });
      }

      const request = results[0];
      
      // Calculate price based on employee count and program
      const programQuery = 'SELECT price FROM programs WHERE title = ?';
      req.app.get('db').query(programQuery, [request.preferred_program], async (err, programResults) => {
        if (err) {
          console.error('Error fetching program:', err);
          return res.status(500).json({ message: 'Error processing payment' });
        }

        const basePrice = programResults[0]?.price || 0;
        const totalAmount = basePrice * request.employee_count;

        // Create payment intent
        const paymentIntent = await createPaymentIntent({
          amount: totalAmount,
          currency: 'inr',
          metadata: {
            requestId,
            companyName: request.company_name,
            employeeCount: request.employee_count,
            programName: request.preferred_program
          }
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
          amount: totalAmount,
          currency: 'inr'
        });
      });
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ message: 'Error processing payment' });
  }
});

// Webhook to handle Stripe events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payments
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const { programId, userId, requestId } = paymentIntent.metadata;

    if (programId && userId) {
      // Handle program enrollment payment
      const query = `
        INSERT INTO enrollments (user_id, program_id, payment_status, payment_id)
        VALUES (?, ?, 'completed', ?)
      `;
      
      req.app.get('db').query(
        query,
        [userId, programId, paymentIntent.id],
        async (err) => {
          if (err) {
            console.error('Error creating enrollment:', err);
            return res.status(500).json({ message: 'Error creating enrollment' });
          }

          // Send confirmation email
          try {
            const userQuery = 'SELECT name, email FROM users WHERE id = ?';
            const programQuery = 'SELECT title FROM programs WHERE id = ?';

            req.app.get('db').query(userQuery, [userId], async (err, userResults) => {
              if (!err && userResults.length > 0) {
                req.app.get('db').query(programQuery, [programId], async (err, programResults) => {
                  if (!err && programResults.length > 0) {
                    await sendEmail({
                      to: userResults[0].email,
                      ...emailTemplates.enrollmentConfirmation(
                        userResults[0].name,
                        programResults[0].title
                      )
                    });
                  }
                });
              }
            });
          } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
          }
        }
      );
    } else if (requestId) {
      // Handle corporate training payment
      const query = `
        UPDATE corporate_requests
        SET payment_status = 'completed',
            payment_id = ?,
            status = 'approved'
        WHERE id = ?
      `;

      req.app.get('db').query(
        query,
        [paymentIntent.id, requestId],
        async (err) => {
          if (err) {
            console.error('Error updating corporate request:', err);
            return res.status(500).json({ message: 'Error updating request' });
          }

          // Send confirmation email
          try {
            const requestQuery = 'SELECT * FROM corporate_requests WHERE id = ?';
            req.app.get('db').query(requestQuery, [requestId], async (err, results) => {
              if (!err && results.length > 0) {
                const request = results[0];
                await sendEmail({
                  to: request.email,
                  subject: 'Corporate Training Payment Confirmed',
                  html: `
                    <h1>Payment Confirmed</h1>
                    <p>Dear ${request.contact_person},</p>
                    <p>Your payment for corporate training has been confirmed. Our team will contact you shortly to schedule the training sessions.</p>
                  `
                });
              }
            });
          } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
          }
        }
      );
    }
  }

  res.json({ received: true });
});

module.exports = router;
