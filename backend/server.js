const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes       = require('./routes/auth.routes');
const testRoutes       = require('./routes/test.routes');
const questionRoutes   = require('./routes/question.routes');
const analyticsRoutes  = require('./routes/analytics.routes');
const adminRoutes      = require('./routes/admin.routes');
const paymentRoutes    = require('./routes/payment.routes');
const syllabusRoutes   = require('./routes/syllabus.routes');
const materialRoutes = require('./routes/studyMaterial.routes');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

// ── Security & Utilities ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 });
app.use('/api/', limiter);

app.use('/api/materials', materialRoutes);
// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/tests',     testRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/payments',  paymentRoutes);
app.use('/api/syllabus',  syllabusRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── Error Handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Database & Start ────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('✅  MongoDB connected');
    app.listen(process.env.PORT || 5000, () =>
      console.log(`🚀  Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => { console.error('❌  DB Error:', err); process.exit(1); });

module.exports = app;
