const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async ({ amount, currency = 'inr', metadata = {}, payment_method_types = ['card'], setup_future_usage = null }) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata,
      payment_method_types,
      setup_future_usage,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

const createSubscription = async ({ customerId, priceId, metadata = {} }) => {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });
    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error;
  }
};

const createCustomer = async ({ email, name, metadata = {} }) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });
    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

const createProduct = async ({ name, description, metadata = {} }) => {
  try {
    const product = await stripe.products.create({
      name,
      description,
      metadata,
    });
    return product;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

const createPrice = async ({ productId, unitAmount, currency = 'inr', recurring = null }) => {
  try {
    const priceData = {
      product: productId,
      unit_amount: Math.round(unitAmount * 100),
      currency,
    };

    if (recurring) {
      priceData.recurring = recurring;
    }

    const price = await stripe.prices.create(priceData);
    return price;
  } catch (error) {
    console.error('Error creating price:', error);
    throw error;
  }
};

// New functions for enhanced payment features

const createRefund = async ({ paymentIntentId, amount = null, reason = null, metadata = {} }) => {
  try {
    const refundData = {
      payment_intent: paymentIntentId,
      metadata
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100);
    }
    if (reason) {
      refundData.reason = reason;
    }

    const refund = await stripe.refunds.create(refundData);
    return refund;
  } catch (error) {
    console.error('Error creating refund:', error);
    throw error;
  }
};

const createInstallmentPlan = async ({ amount, currency = 'inr', installments = 3, metadata = {} }) => {
  try {
    const installmentAmount = Math.ceil(amount / installments);
    const paymentIntents = [];

    for (let i = 0; i < installments; i++) {
      const isLastInstallment = i === installments - 1;
      // Adjust the last installment to account for rounding
      const currentAmount = isLastInstallment 
        ? amount - (installmentAmount * (installments - 1)) 
        : installmentAmount;

      const intent = await createPaymentIntent({
        amount: currentAmount,
        currency,
        metadata: {
          ...metadata,
          installment_number: i + 1,
          total_installments: installments,
          installment_plan_id: metadata.planId
        }
      });
      paymentIntents.push(intent);
    }

    return paymentIntents;
  } catch (error) {
    console.error('Error creating installment plan:', error);
    throw error;
  }
};

const createCoupon = async ({ name, duration = 'once', amountOff = null, percentOff = null, currency = 'inr', metadata = {} }) => {
  try {
    const couponData = {
      name,
      duration,
      metadata
    };

    if (amountOff) {
      couponData.amount_off = Math.round(amountOff * 100);
      couponData.currency = currency;
    } else if (percentOff) {
      couponData.percent_off = percentOff;
    }

    const coupon = await stripe.coupons.create(couponData);
    return coupon;
  } catch (error) {
    console.error('Error creating coupon:', error);
    throw error;
  }
};

const validateCoupon = async (couponId) => {
  try {
    const coupon = await stripe.coupons.retrieve(couponId);
    return {
      valid: !coupon.deleted,
      coupon
    };
  } catch (error) {
    console.error('Error validating coupon:', error);
    return {
      valid: false,
      error: error.message
    };
  }
};

module.exports = {
  createPaymentIntent,
  createSubscription,
  createCustomer,
  createProduct,
  createPrice,
  createRefund,
  createInstallmentPlan,
  createCoupon,
  validateCoupon
};
