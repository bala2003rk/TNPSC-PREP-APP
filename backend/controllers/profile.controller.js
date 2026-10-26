const User       = require('../models/User.model');
const { AppError } = require('../middlewares/error.middleware');
const { uploadImage, deleteImage } = require('../utils/cloudinary');

// ── GET /api/profile  ─────────────────────────────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -passwordResetOtp -passwordResetOtpExpires -passwordResetToken -passwordResetTokenExpires -__v')
      .lean();

    if (!user) return next(new AppError('User not found', 404));

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/profile  ───────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, targetExams, languagePreference } = req.body;

    // Only allow safe fields — never allow role/password via this route
    const updates = {};
    if (name               !== undefined) updates.name               = name.trim();
    if (phone              !== undefined) updates.phone              = phone.trim();
    if (targetExams        !== undefined) updates.targetExams        = targetExams;
    if (languagePreference !== undefined) updates.languagePreference = languagePreference;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -__v').lean();

    res.json({ success: true, data: user, message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/profile/avatar  ────────────────────────────────────────────────
// Accepts base64 image string in req.body.avatar
exports.uploadAvatar = async (req, res, next) => {
  try {
    const { avatar } = req.body; // base64 data URI: "data:image/jpeg;base64,..."

    if (!avatar) return next(new AppError('No image provided', 400));

    // Validate it's an image
    if (!avatar.startsWith('data:image/')) {
      return next(new AppError('Invalid image format', 400));
    }

    // Check size (base64 is ~33% larger than binary; limit ~5MB binary = ~6.7MB base64)
    const base64Size = Buffer.byteLength(avatar, 'utf8');
    if (base64Size > 7 * 1024 * 1024) {
      return next(new AppError('Image too large. Maximum size is 5MB', 400));
    }

    // Delete old avatar from Cloudinary if exists
    const existingUser = await User.findById(req.user._id).select('avatarPublicId').lean();
    if (existingUser?.avatarPublicId) {
      await deleteImage(existingUser.avatarPublicId).catch(console.warn);
    }

    // Upload new avatar
    const { url, publicId } = await uploadImage(avatar, 'tnpsc-avatars');

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { avatar: url, avatarPublicId: publicId } },
      { new: true }
    ).select('-password -__v').lean();

    res.json({ success: true, data: { avatar: url }, message: 'Avatar updated successfully' });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/profile/change-password  ──────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new AppError('Current and new password are required', 400));
    }
    if (newPassword.length < 8) {
      return next(new AppError('New password must be at least 8 characters', 400));
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return next(new AppError('Current password is incorrect', 401));

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};
