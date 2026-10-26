const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const {
  isFirebaseAdminConfigured,
  verifyFirebaseToken,
} = require('../config/firebase.admin');
const { AppError } = require('../middlewares/error.middleware');
const { sendWelcomeEmail } = require('../utils/email');

const generateTokens = (user) => ({
  accessToken: jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  ),
  refreshToken: jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  ),
});

exports.firebaseLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (typeof idToken !== 'string' || !idToken) {
      return next(new AppError('Firebase ID token is required', 400));
    }
    if (!isFirebaseAdminConfigured) {
      return next(new AppError('Firebase Admin is not configured on the server', 503));
    }

    let decoded;
    try {
      decoded = await verifyFirebaseToken(idToken);
    } catch {
      return next(new AppError('Invalid or expired Firebase token', 401));
    }

    const email = decoded.email?.trim().toLowerCase();
    if (!decoded.uid || !email || decoded.email_verified !== true) {
      return next(new AppError('A verified email is required for Google sign-in', 401));
    }

    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) user = await User.findOne({ email });

    if (user && user.isActive === false) {
      return next(new AppError('Account deactivated', 403));
    }

    if (user?.firebaseUid && user.firebaseUid !== decoded.uid) {
      return next(new AppError('This email is linked to a different Firebase account', 409));
    }

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      user = await User.create({
        name: decoded.name || email.split('@')[0],
        email,
        password: crypto.randomBytes(32).toString('hex'),
        firebaseUid: decoded.uid,
        avatar: decoded.picture || '',
        isVerified: true,
        languagePreference: 'en',
        targetExams: [],
      });
    } else {
      let changed = false;
      if (!user.firebaseUid) {
        user.firebaseUid = decoded.uid;
        changed = true;
      }
      if (!user.avatar && decoded.picture) {
        user.avatar = decoded.picture;
        changed = true;
      }
      if (!user.isVerified) {
        user.isVerified = true;
        changed = true;
      }
      if (changed) await user.save({ validateBeforeSave: false });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    if (isNewUser) {
      sendWelcomeEmail({
        to: user.email,
        name: user.name,
        targetExams: user.targetExams || [],
      }).catch((err) => console.warn('Welcome email failed:', err.message));
    }

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    next(err);
  }
};
