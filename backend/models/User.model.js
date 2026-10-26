const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const progressTrackerSchema = new mongoose.Schema({
  subject:     { type: String, required: true },
  unit:        { type: String, required: true },
  chapter:     { type: String },
  completedAt: { type: Date, default: Date.now },
  confidence:  { type: Number, min: 1, max: 5, default: 3 }, // self-rated
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  plan:       { type: String, enum: ['free', 'premium', 'test-series'], default: 'free' },
  startDate:  { type: Date },
  endDate:    { type: Date },
  razorpaySubscriptionId: String,
  razorpayOrderId:        String,
  isActive:   { type: Boolean, default: false },
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String, required: true, unique: true,
      lowercase: true, trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    phone:    { type: String, trim: true, match: [/^\d{10}$/, 'Invalid phone'] },
    password: { type: String, minlength: 6, select: false },

    // Auth providers
    firebaseUid: { type: String, unique: true, sparse: true },

    role: { type: String, enum: ['student', 'admin', 'moderator'], default: 'student' },

    // TNPSC-specific fields
    targetExams: [{
      type: String,
      enum: ['GROUP_1', 'GROUP_2', 'GROUP_2A', 'GROUP_4', 'VAO', 'TNTET', 'CESE'],
    }],
    languagePreference: { type: String, enum: ['en', 'ta'], default: 'en' },

    // Subscription
    subscription: { type: subscriptionSchema, default: () => ({}) },

    // Detailed progress
    progressTracker: [progressTrackerSchema],

    // Aggregated stats (denormalised for fast reads)
    stats: {
      totalTestsTaken:  { type: Number, default: 0 },
      totalQuestionsAttempted: { type: Number, default: 0 },
      averageAccuracy:  { type: Number, default: 0 },
      currentStreak:    { type: Number, default: 0 },
      longestStreak:    { type: Number, default: 0 },
      lastActiveDate:   Date,
    },

    profileImage: String,
    isVerified:   { type: Boolean, default: false },
    isActive:     { type: Boolean, default: true },
    refreshToken: { type: String, select: false },
    avatar:           { type: String, default: '' },
    avatarPublicId:   { type: String, default: '' },

    // Password reset OTP fields
    passwordResetOtp:            String,
    passwordResetOtpExpires:     Date,
    passwordResetToken:          String,
    passwordResetTokenExpires:   Date,
  },

  { timestamps: true }
);

// ── Indexes ─────────────────────────────────────────────────────────────────
// userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'subscription.plan': 1, 'subscription.isActive': 1 });

// ── Pre-save password hash ───────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Instance methods ─────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.hasActiveSubscription = function () {
  return (
    this.subscription.isActive &&
    this.subscription.endDate &&
    new Date(this.subscription.endDate) > new Date()
  );
};

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
