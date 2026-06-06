// question.routes.js
const express    = require('express');
const router     = express.Router();
const Question   = require('../models/Question.model');
const { protect, authorize } = require('../middlewares/error.middleware');

// Public: search questions (authenticated users)
router.get('/', protect, async (req, res, next) => {
  try {
    const { subject, unit, difficulty, isPYQ, pyqYear, examGroup, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };
    if (subject)   filter.subject    = subject;
    if (unit)      filter.unit       = unit;
    if (difficulty)filter.difficulty = difficulty;
    if (isPYQ)     filter.isPYQ      = isPYQ === 'true';
    if (pyqYear)   filter.pyqYear    = Number(pyqYear);
    if (examGroup) filter.examGroups = { $in: [examGroup, 'ALL'] };

    const lang = req.user.languagePreference || 'en';
    const questions = await Question.find(filter)
      .select('-correctOption -explanation') // hide answer
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, questions: questions.map(q => q.getLocalised(lang)) });
  } catch (err) { next(err); }
});

module.exports = router;

// ── syllabus.routes.js (inline stub) ─────────────────────────────────────────
// Full implementation would load syllabus JSON/DB and map to Samacheer chapters.
