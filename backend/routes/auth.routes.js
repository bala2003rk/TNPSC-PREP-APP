// ════════════════════════════════════════════════════════════════════════════
// routes/auth.routes.js
// ════════════════════════════════════════════════════════════════════════════
const express    = require('express');
const Joi        = require('joi');
const router     = express.Router();
const authCtrl   = require('../controllers/auth.controller');
const { firebaseLogin } = require('../controllers/firebaseAuth.controller');
const { protect }= require('../middlewares/error.middleware');
const {forgotPassword, verifyOtp, resetPassword} = require('../controllers/auth.controller.js');
// Joi validation middleware factory
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ success: false, message: error.details.map(d => d.message).join(', ') });
  next();
};

const registerSchema = Joi.object({
  name:               Joi.string().min(2).max(100).required(),
  email:              Joi.string().email().required(),
  password:           Joi.string().min(6).required(),
  phone:              Joi.string().pattern(/^\d{10}$/).allow('', null),
  languagePreference: Joi.string().valid('en', 'ta').default('en'),
  targetExams:        Joi.array().items(Joi.string()).default([]),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});


router.post('/register',       validate(registerSchema), authCtrl.register);
router.post('/login',          validate(loginSchema),    authCtrl.login);
router.post('/firebase',       firebaseLogin);
router.post('/refresh',        authCtrl.refreshToken);
router.post('/logout',         protect,                  authCtrl.logout);
router.get('/me',              protect,                  authCtrl.getMe);
router.patch('/update-profile',protect,                  authCtrl.updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp',      verifyOtp);
router.post('/reset-password',  resetPassword);

module.exports = router;
