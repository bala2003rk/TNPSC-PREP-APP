const nodemailer = require('nodemailer');

// ── Transporter ───────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ''),
  },
});

// ── Base HTML wrapper ─────────────────────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>TNPSC Prep</title>
  <style>
    body { margin:0; padding:0; background:#f4f4f7; font-family:'Segoe UI',Arial,sans-serif; }
    .wrapper { max-width:560px; margin:40px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#FF6B35,#FFB627); padding:32px 40px; text-align:center; }
    .header h1 { margin:0; color:#ffffff; font-size:24px; font-weight:900; letter-spacing:-0.5px; }
    .header p  { margin:4px 0 0; color:rgba(255,255,255,0.85); font-size:13px; }
    .body { padding:36px 40px; }
    .body h2 { margin:0 0 12px; color:#1A1A2E; font-size:20px; font-weight:700; }
    .body p  { margin:0 0 16px; color:#555; font-size:15px; line-height:1.6; }
    .otp-box { background:#f0f4ff; border:2px dashed #FF6B35; border-radius:12px; padding:24px; text-align:center; margin:24px 0; }
    .otp-box span { font-size:40px; font-weight:900; color:#FF6B35; letter-spacing:12px; }
    .otp-box p { margin:8px 0 0; color:#888; font-size:13px; }
    .btn { display:inline-block; background:linear-gradient(135deg,#FF6B35,#FFB627); color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:10px; font-weight:700; font-size:15px; margin:8px 0; }
    .footer { background:#f9f9f9; padding:20px 40px; text-align:center; border-top:1px solid #eee; }
    .footer p { margin:0; color:#aaa; font-size:12px; }
    .badge { display:inline-block; background:#2D6A4F; color:#fff; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; margin-bottom:16px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>TNPSC Prep</h1>
      <p>Your path to government service</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} TNPSC Prep. All rights reserved.</p>
      <p style="margin-top:4px;">This is an automated email — please do not reply.</p>
    </div>
  </div>
</body>
</html>
`;

// ── Send OTP Email ────────────────────────────────────────────────────────────
exports.sendOtpEmail = async ({ to, name, otp, purpose = 'reset' }) => {
  const subject = purpose === 'reset'
    ? 'Password Reset OTP — TNPSC Prep'
    : 'Verify Your Email — TNPSC Prep';

  const content = `
    <span class="badge">🔐 Security Code</span>
    <h2>Hello, ${name || 'there'}!</h2>
    <p>${
      purpose === 'reset'
        ? 'You requested to reset your password. Use the OTP below to proceed.'
        : 'Please verify your email address using the OTP below.'
    }</p>
    <div class="otp-box">
      <span>${otp}</span>
      <p>This OTP expires in <strong>10 minutes</strong></p>
    </div>
    <p style="color:#e74c3c;font-size:13px;">⚠️ Never share this OTP with anyone. Our team will never ask for it.</p>
    <p>If you did not request this, please ignore this email — your account is safe.</p>
  `;

  await transporter.sendMail({
    from: `"TNPSC Prep" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html: baseTemplate(content),
  });
};

// ── Send Welcome Email ────────────────────────────────────────────────────────
exports.sendWelcomeEmail = async ({ to, name, targetExams = [] }) => {
  const examList = targetExams.length > 0
    ? targetExams.join(', ')
    : 'TNPSC exams';

  const content = `
    <span class="badge">🎉 Welcome</span>
    <h2>Welcome aboard, ${name}!</h2>
    <p>Your TNPSC Prep account has been created successfully. You're now ready to start preparing for <strong>${examList}</strong>.</p>
    <p>Here's what you can do:</p>
    <ul style="color:#555;font-size:15px;line-height:2;">
      <li>📝 Take <strong>Mock Tests</strong> and Previous Year Papers</li>
      <li>📊 Track your progress with <strong>Analytics</strong></li>
      <li>📚 Access <strong>Study Materials</strong> and Notes</li>
      <li>📋 Follow the <strong>Syllabus Tracker</strong></li>
      <li>🏆 Compete on the <strong>Leaderboard</strong></li>
    </ul>
    <p style="text-align:center;margin-top:24px;">
      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard" class="btn">
        Start Preparing →
      </a>
    </p>
    <p style="color:#888;font-size:13px;">Best of luck with your preparation! 🙏</p>
  `;

  await transporter.sendMail({
    from: `"TNPSC Prep" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Welcome to TNPSC Prep, ${name}! 🎉`,
    html: baseTemplate(content),
  });
};

// ── Verify transporter on startup (optional) ──────────────────────────────────
exports.verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log('✅  Email transporter ready');
  } catch (err) {
    console.warn('⚠️  Email transporter not configured:', err.message);
  }
};
