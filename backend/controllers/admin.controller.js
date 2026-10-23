//admin.controller.js
const xlsx     = require('xlsx');
const Joi      = require('joi');
const Question = require('../models/Question.model');
const { Exam } = require('../models/Exam.model');
const User     = require('../models/User.model');
const { AppError } = require('../middlewares/error.middleware');

// ── Joi schema for individual question validation ────────────────────────────
const questionJoi = Joi.object({
  questionText_en: Joi.string().min(5).required(),
  questionText_ta: Joi.string().allow('', null),
  option_A_en:     Joi.string().required(),
  option_A_ta:     Joi.string().allow('', null),
  option_B_en:     Joi.string().required(),
  option_B_ta:     Joi.string().allow('', null),
  option_C_en:     Joi.string().required(),
  option_C_ta:     Joi.string().allow('', null),
  option_D_en:     Joi.string().required(),
  option_D_ta:     Joi.string().allow('', null),
  correctOption:   Joi.string().valid('A', 'B', 'C', 'D').required(),
  explanation_en:  Joi.string().allow('', null),
  explanation_ta:  Joi.string().allow('', null),
  subject:         Joi.string().valid(
    'HISTORY','GEOGRAPHY','POLITY','ECONOMICS',
    'SCIENCE','ENVIRONMENT','CURRENT_AFFAIRS',
    'APTITUDE','TAMIL','ENGLISH','GK'
  ).required(),
  unit:            Joi.string().required(),
  topic:           Joi.string().allow('', null),
  examGroups:      Joi.string().allow('', null), // comma-separated
  difficulty:      Joi.string().valid('EASY','MEDIUM','HARD').default('MEDIUM'),
  isPYQ:           Joi.boolean().default(false),
  pyqYear:         Joi.number().integer().min(1990).max(new Date().getFullYear()).allow(null),
  std:             Joi.number().min(6).max(12).allow(null),  // samacheer
  term:            Joi.number().min(1).max(3).allow(null),
  chapter:         Joi.number().allow(null),
});

// ── POST /api/admin/questions/bulk-upload ────────────────────────────────────
exports.bulkUploadQuestions = async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError('No file uploaded', 400));

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = xlsx.utils.sheet_to_json(sheet, { defval: null });

    if (rows.length === 0) return next(new AppError('Empty file', 400));
    if (rows.length > 500) return next(new AppError('Max 500 questions per upload', 400));

    const valid   = [];
    const invalid = [];

    for (let i = 0; i < rows.length; i++) {
      const { error, value } = questionJoi.validate(rows[i], { abortEarly: false });
      if (error) {
        invalid.push({ row: i + 2, errors: error.details.map(d => d.message) });
        continue;
      }

      valid.push({
        questionText: { en: value.questionText_en, ta: value.questionText_ta || value.questionText_en },
        options: [
          { key: 'A', text: { en: value.option_A_en, ta: value.option_A_ta || value.option_A_en } },
          { key: 'B', text: { en: value.option_B_en, ta: value.option_B_ta || value.option_B_en } },
          { key: 'C', text: { en: value.option_C_en, ta: value.option_C_ta || value.option_C_en } },
          { key: 'D', text: { en: value.option_D_en, ta: value.option_D_ta || value.option_D_en } },
        ],
        correctOption: value.correctOption,
        explanation:   value.explanation_en ? { en: value.explanation_en, ta: value.explanation_ta || value.explanation_en } : undefined,
        subject:       value.subject,
        unit:          value.unit,
        topic:         value.topic,
        examGroups:    value.examGroups ? value.examGroups.split(',').map(s => s.trim()) : ['ALL'],
        difficulty:    value.difficulty,
        isPYQ:         value.isPYQ,
        pyqYear:       value.pyqYear,
        samacheerMapping: (value.std) ? { standard: value.std, term: value.term, chapter: value.chapter } : undefined,
        createdBy:     req.user._id,
      });
    }

    let inserted = [];
    if (valid.length > 0) {
      inserted = await Question.insertMany(valid, { ordered: false });
    }

    res.status(201).json({
      success: true,
      summary: {
        total:    rows.length,
        inserted: inserted.length,
        failed:   invalid.length,
      },
      errors: invalid,
    });
  } catch (err) { next(err); }
};

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
exports.getPlatformStats = async (req, res, next) => {
  try {
    const [users, questions, exams] = await Promise.all([
      User.aggregate([
        { $group: { _id: '$subscription.plan', count: { $sum: 1 } } },
      ]),
      Question.countDocuments({ isActive: true }),
      Exam.countDocuments({ isPublished: true }),
    ]);

    res.json({ success: true, stats: { users, questions, exams } });
  } catch (err) { next(err); }
};

// ── PATCH /api/admin/questions/:id ───────────────────────────────────────────
exports.updateQuestion = async (req, res, next) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!q) return next(new AppError('Question not found', 404));
    res.json({ success: true, question: q });
  } catch (err) { next(err); }
};

// ── DELETE /api/admin/questions/:id (soft delete) ────────────────────────────
exports.deleteQuestion = async (req, res, next) => {
  try {
    await Question.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Question deactivated' });
  } catch (err) { next(err); }
};

// ── POST /api/admin/exams/:id/publish ────────────────────────────────────────
exports.publishExam = async (req, res, next) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id, { isPublished: true }, { new: true }
    );
    if (!exam) return next(new AppError('Exam not found', 404));
    res.json({ success: true, exam });
  } catch (err) { next(err); }
};

// GET /api/admin/exams/unpublished
exports.getUnpublishedExams = async (req, res, next) => {
  try {
    // const { Exam } = require('../models/Exam.model');
    const exams = await Exam.find({ isPublished: false })
      .select('title totalQuestions duration type createdAt')
      .sort({ createdAt: -1 });
    res.json({ success: true, exams });
  } catch (err) { next(err); }
};