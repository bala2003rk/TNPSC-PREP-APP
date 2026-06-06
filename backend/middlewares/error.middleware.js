const jwt  = require('jsonwebtoken');
const User = require('../models/User.model');

// ── Custom error class ───────────────────────────────────────────────────────
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── JWT protect middleware ───────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer '))
      token = req.headers.authorization.split(' ')[1];

    if (!token) return next(new AppError('Not authenticated', 401));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);

    if (!user)         return next(new AppError('User not found', 401));
    if (!user.isActive) return next(new AppError('Account deactivated', 403));

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new AppError('Token expired', 401));
    if (err.name === 'JsonWebTokenError') return next(new AppError('Invalid token', 401));
    next(err);
  }
};

// ── Role-based access control ────────────────────────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return next(new AppError(`Role '${req.user.role}' not authorised`, 403));
  next();
};

// ── Premium subscription gate ────────────────────────────────────────────────
const requirePremium = (req, res, next) => {
  if (!req.user.hasActiveSubscription())
    return next(new AppError('Active subscription required', 403));
  next();
};

// ── Global error handler ─────────────────────────────────────────────────────
const errorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      stack:   err.stack,
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }
  // Duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.isOperational ? err.message : 'Internal server error',
  });
};

module.exports = { protect, authorize, requirePremium, errorHandler, AppError };
