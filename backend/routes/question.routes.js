const express  = require('express');
const router   = express.Router();
const Question = require('../models/Question.model');
const { protect, authorize } = require('../middlewares/error.middleware');

// ── GET /api/questions  ───────────────────────────────────────────────────────
// Authenticated users — search/filter questions for exam creation
router.get('/', protect, async (req, res, next) => {
  try {
    const {
      subject, unit, difficulty, isPYQ, pyqYear,
      examGroup, search,
      page = 1, limit = 20,
    } = req.query;

    const filter = { isActive: true };
    if (subject)    filter.subject    = subject;
    if (unit)       filter.unit       = unit;
    if (difficulty) filter.difficulty = difficulty;
    if (isPYQ)      filter.isPYQ      = isPYQ === 'true';
    if (pyqYear)    filter.pyqYear    = Number(pyqYear);
    if (examGroup)  filter.examGroups = { $in: [examGroup, 'ALL'] };

    // Full-text search across both languages
    if (search) {
      filter.$or = [
        { 'questionText.en': { $regex: search, $options: 'i' } },
        { 'questionText.ta': { $regex: search, $options: 'i' } },
        { tags:              { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Question.countDocuments(filter);

    // ── CRITICAL: use .lean() and do NOT call getLocalised() ─────────────
    // getLocalised() strips _id. We need _id in the response so the
    // CreateTestPage can reference questions by their MongoDB ObjectId.
    // We still hide correctOption and explanation for security.
    const questions = await Question.find(filter)
      .select('-correctOption -explanation -createdBy -timesUsed -timesCorrect -successRate')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();   // plain JS objects — _id is included as ObjectId (serialises to string)

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          total,
          page:       Number(page),
          limit:      Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/questions/:id  ───────────────────────────────────────────────────
router.get('/:id', protect, async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id)
      .select('-correctOption -explanation')
      .lean();
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    res.json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/questions  (admin only) ────────────────────────────────────────
router.post('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const question = await Question.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/questions/:id  (admin only) ───────────────────────────────────
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await Question.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Question deactivated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;