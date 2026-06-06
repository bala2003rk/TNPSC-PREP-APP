const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const { protect } = require('../middlewares/error.middleware');

// Razorpay only initialises when keys are present
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  const Razorpay = require('razorpay');
  razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Guard middleware — blocks payment routes if keys not configured
const requireRazorpay = (req, res, next) => {
  if (!razorpay) {
    return res.status(503).json({
      success: false,
      message: 'Payment gateway not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env',
    });
  }
  next();
};

// ── POST /api/payments/create-order ──────────────────────────────────────────
router.post('/create-order', protect, requireRazorpay, async (req, res, next) => {
  try {
    const { plan } = req.body;
    const amounts  = { premium: 49900, 'test-series': 19900 };
    const order    = await razorpay.orders.create({
      amount:   amounts[plan] || 49900,
      currency: 'INR',
      receipt:  `order_${req.user._id}_${Date.now()}`,
      notes:    { userId: req.user._id.toString(), plan },
    });
    res.json({ success: true, order });
  } catch (err) { next(err); }
});

// ── POST /api/payments/verify ─────────────────────────────────────────────────
router.post('/verify', protect, requireRazorpay, async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature)
      return res.status(400).json({ success: false, message: 'Invalid signature' });

    const User = require('../models/User.model');
    const end  = new Date(Date.now() + 365 * 86400000);

    await User.findByIdAndUpdate(req.user._id, {
      'subscription.plan':            plan,
      'subscription.isActive':        true,
      'subscription.startDate':       new Date(),
      'subscription.endDate':         end,
      'subscription.razorpayOrderId': razorpay_order_id,
    });

    res.json({ success: true, message: 'Subscription activated', validTill: end });
  } catch (err) { next(err); }
});

module.exports = router;