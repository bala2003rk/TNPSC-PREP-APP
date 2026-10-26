const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const User   = require('../models/User.model');
const { AppError } = require('../middlewares/error.middleware');
const { sendOtpEmail, sendWelcomeEmail } = require('../utils/email');
// ── Token helpers ────────────────────────────────────────────────────────────
const signAccess = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

const signRefresh = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });

const sendTokens = async (user, statusCode, res) => {
  const accessToken  = signAccess(user._id);
  const refreshToken = signRefresh(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
    user: user.toPublicJSON(),
  });
};

// ── POST /api/auth/register ──────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, languagePreference, targetExams } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return next(new AppError('Email already registered', 409));

    const user = await User.create({
      name, email, password, phone,
      languagePreference: languagePreference || 'en',
      targetExams: targetExams || [],
    });
    sendWelcomeEmail({
    to:          user.email,
    name:        user.name,
    targetExams: user.targetExams || [],
}).catch(err => console.warn('Welcome email failed:', err.message));

    await sendTokens(user, 201, res);
  } catch (err) { next(err); }
};

// ── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return next(new AppError('Email and password required', 400));

    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user || !(await user.comparePassword(password)))
      return next(new AppError('Invalid credentials', 401));

    if (!user.isActive) return next(new AppError('Account deactivated', 403));

    // Update streak
    const today = new Date().toDateString();
    const last  = user.stats.lastActiveDate ? new Date(user.stats.lastActiveDate).toDateString() : null;
    if (last !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      user.stats.currentStreak = last === yesterday ? user.stats.currentStreak + 1 : 1;
      user.stats.longestStreak = Math.max(user.stats.currentStreak, user.stats.longestStreak);
      user.stats.lastActiveDate = new Date();
    }
    const freshUser = await User.findById(user._id);
    await sendTokens(freshUser, 200, res);
    // await sendTokens(user, 200, res);
  } catch (err) { next(err); }
};

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return next(new AppError('No refresh token', 401));

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user    = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken)
      return next(new AppError('Invalid refresh token', 401));

    const newAccess  = signAccess(user._id);
    const newRefresh = signRefresh(user._id);
    user.refreshToken = newRefresh;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return next(new AppError('Invalid token', 401));
    next(err);
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) { next(err); }
};

// ── PATCH /api/auth/update-profile ───────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'languagePreference', 'targetExams', 'profileImage'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) { next(err); }
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
// Sends a 6-digit OTP to the user's email
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return next(new AppError('Email is required', 400));

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always return success even if user not found (security best practice)
    if (!user) {
      return res.json({
        success: true,
        message: 'If that email exists, an OTP has been sent.',
      });
    }

    const otp     = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store hashed OTP on user document
    user.passwordResetOtp        = crypto.createHash('sha256').update(otp).digest('hex');
    user.passwordResetOtpExpires = expires;
    await user.save({ validateBeforeSave: false });

    // Send email
    await sendOtpEmail({ to: user.email, name: user.name, otp, purpose: 'reset' });

    res.json({
      success: true,
      message: 'OTP sent to your email address.',
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
// Verifies OTP and returns a short-lived reset token
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return next(new AppError('Email and OTP are required', 400));

    const hashedOtp = crypto.createHash('sha256').update(otp.toString()).digest('hex');

    const user = await User.findOne({
      email:                       email.toLowerCase().trim(),
      passwordResetOtp:            hashedOtp,
      passwordResetOtpExpires:     { $gt: new Date() },
    });

    if (!user) return next(new AppError('Invalid or expired OTP', 400));

    // Generate a short-lived reset token (valid 15 min)
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken        = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
    // Clear OTP fields
    user.passwordResetOtp          = undefined;
    user.passwordResetOtpExpires   = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({
      success:    true,
      resetToken, // sent to frontend, used in next step
      message:    'OTP verified. Proceed to reset your password.',
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/auth/reset-password ────────────────────────────────────────────
// Resets password using the reset token from verifyOtp
exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken, password } = req.body;
    if (!resetToken || !password) {
      return next(new AppError('Reset token and new password are required', 400));
    }
    if (password.length < 8) {
      return next(new AppError('Password must be at least 8 characters', 400));
    }

    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.findOne({
      passwordResetToken:        hashedToken,
      passwordResetTokenExpires: { $gt: new Date() },
    });

    if (!user) return next(new AppError('Reset token is invalid or has expired', 400));

    user.password                  = password; // pre-save hook will hash it
    user.passwordResetToken        = undefined;
    user.passwordResetTokenExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful. Please log in.' });
  } catch (err) {
    next(err);
  }
};
