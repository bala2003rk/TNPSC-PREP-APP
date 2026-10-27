const xlsx         = require('xlsx');
const mongoose     = require('mongoose');
const Question     = require('../models/Question.model');
const User         = require('../models/User.model');
const { Exam }     = require('../models/Exam.model');
const { AppError } = require('../middlewares/error.middleware');

// ── Column map matching your exact Excel headers ──────────────────────────────
// questionText_en | option_A_en | option_B_en | option_C_en | option_D_en |
// correctOption   | subject     | unit        | difficulty  | examGroups  | isPYQ

const VALID_SUBJECTS = [
  'HISTORY','GEOGRAPHY','POLITY','ECONOMICS','SCIENCE',
  'ENVIRONMENT','CURRENT_AFFAIRS','APTITUDE','TAMIL','ENGLISH','GK',
];
const VALID_DIFFICULTIES = ['EASY','MEDIUM','HARD'];
const VALID_OPTIONS      = ['A','B','C','D'];
const VALID_EXAM_GROUPS  = ['GROUP_1','GROUP_2','GROUP_2A','GROUP_4','VAO','TNTET','CESE','ALL'];

const normalise = (val) =>
  val !== undefined && val !== null ? String(val).trim() : '';

const parseExamGroups = (raw) => {
  if (!raw) return ['ALL'];
  return String(raw)
    .split(/[,|;]/)
    .map(g => g.trim().toUpperCase())
    .filter(g => VALID_EXAM_GROUPS.includes(g));
};

// ── POST /api/admin/questions/bulk-upload ─────────────────────────────────────
exports.bulkUploadQuestions = async (req, res, next) => {
  try {
    if (!req.file) return next(new AppError('No file uploaded', 400));

    // Parse Excel/CSV from buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) return next(new AppError('File is empty or unreadable', 400));

    const inserted = [];
    const errors   = [];

    for (let i = 0; i < rows.length; i++) {
      const row    = rows[i];
      const rowNum = i + 2; // 1-indexed + header row

      try {
        // ── Extract fields ──────────────────────────────────────────────────
        const questionText_en = normalise(row['questionText_en'] || row['Question'] || row['question']);
        const questionText_ta = normalise(row['questionText_ta'] || row['question_ta'] || '');
        const optA_en  = normalise(row['option_A_en'] || row['Option A'] || row['optionA']);
        const optB_en  = normalise(row['option_B_en'] || row['Option B'] || row['optionB']);
        const optC_en  = normalise(row['option_C_en'] || row['Option C'] || row['optionC']);
        const optD_en  = normalise(row['option_D_en'] || row['Option D'] || row['optionD']);
        const optA_ta  = normalise(row['option_A_ta'] || '');
        const optB_ta  = normalise(row['option_B_ta'] || '');
        const optC_ta  = normalise(row['option_C_ta'] || '');
        const optD_ta  = normalise(row['option_D_ta'] || '');
        const correct  = normalise(row['correctOption'] || row['Correct'] || row['answer']).toUpperCase();
        const subject  = normalise(row['subject'] || row['Subject']).toUpperCase();
        const unit     = normalise(row['unit']    || row['Unit']   || '');
        const difficulty = normalise(row['difficulty'] || row['Difficulty'] || 'MEDIUM').toUpperCase();
        const examGroupsRaw = row['examGroups'] || row['ExamGroups'] || 'ALL';
        const isPYQ    = String(row['isPYQ'] || 'false').toLowerCase() === 'true';
        const pyqYear  = row['pyqYear'] ? Number(row['pyqYear']) : undefined;
        const explanationEn = normalise(row['explanation_en'] || row['explanation'] || '');
        const explanationTa = normalise(row['explanation_ta'] || '');

        // ── Validation ──────────────────────────────────────────────────────
        const rowErrors = [];
        if (!questionText_en) rowErrors.push('questionText_en is required');
        if (!optA_en)  rowErrors.push('option_A_en is required');
        if (!optB_en)  rowErrors.push('option_B_en is required');
        if (!optC_en)  rowErrors.push('option_C_en is required');
        if (!optD_en)  rowErrors.push('option_D_en is required');
        if (!VALID_OPTIONS.includes(correct))
          rowErrors.push(`correctOption must be A/B/C/D, got "${correct}"`);
        if (!VALID_SUBJECTS.includes(subject))
          rowErrors.push(`subject "${subject}" invalid. Use: ${VALID_SUBJECTS.join(', ')}`);
        if (!VALID_DIFFICULTIES.includes(difficulty))
          rowErrors.push(`difficulty must be EASY/MEDIUM/HARD, got "${difficulty}"`);

        if (rowErrors.length) {
          errors.push({ row: rowNum, error: rowErrors.join(' | ') });
          continue;
        }

        const examGroups = parseExamGroups(examGroupsRaw);

        // ── Build question document ─────────────────────────────────────────
        const questionDoc = {
          questionText: {
            en: questionText_en,
            ...(questionText_ta && { ta: questionText_ta }),
          },
          options: [
            { key:'A', text:{ en:optA_en, ...(optA_ta && { ta:optA_ta }) } },
            { key:'B', text:{ en:optB_en, ...(optB_ta && { ta:optB_ta }) } },
            { key:'C', text:{ en:optC_en, ...(optC_ta && { ta:optC_ta }) } },
            { key:'D', text:{ en:optD_en, ...(optD_ta && { ta:optD_ta }) } },
          ],
          correctOption: correct,
          subject,
          unit:          unit || 'General',
          difficulty,
          examGroups:    examGroups.length ? examGroups : ['ALL'],
          isPYQ,
          ...(isPYQ && pyqYear && { pyqYear }),
          ...(explanationEn && {
            explanation: {
              en: explanationEn,
              ...(explanationTa && { ta: explanationTa }),
            },
          }),
          createdBy: req.user._id,
          isActive:  true,
        };

        // Check for duplicate (same EN text + subject)
        const existing = await Question.findOne({
          'questionText.en': questionText_en,
          subject,
        }).lean();

        if (existing) {
          errors.push({ row: rowNum, error: 'Duplicate question (same text + subject)' });
          continue;
        }

        const q = await Question.create(questionDoc);
        inserted.push(q._id);
      } catch (err) {
        errors.push({ row: rowNum, error: err.message });
      }
    }

    res.status(201).json({
      success:  true,
      data: {
        inserted: inserted.length,
        failed:   errors.length,
        total:    rows.length,
        errors,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalQuestions, totalExams, totalAttempts] = await Promise.all([
      User.countDocuments(),
      Question.countDocuments({ isActive: true }),
      Exam.countDocuments(),
      mongoose.model('TestAttempt').countDocuments(),
    ]);

    // Subject-wise question count
    const subjectBreakdown = await Question.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$subject', count: { $sum: 1 } } },
      { $sort:  { count: -1 } },
    ]);

    res.json({
      success: true,
      data: { totalUsers, totalQuestions, totalExams, totalAttempts, subjectBreakdown },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/exams/unpublished ──────────────────────────────────────────
exports.getUnpublishedExams = async (req, res, next) => {
  try {
    const exams = await Exam.find({ isPublished: false })
      .select('title type examGroup duration totalQuestions createdAt scheduledAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: { exams } });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/admin/exams/:id/publish ─────────────────────────────────────────
exports.publishExam = async (req, res, next) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { isPublished: true, publishedAt: new Date() },
      { new: true }
    );
    if (!exam) return next(new AppError('Exam not found', 404));
    res.json({ success: true, data: exam, message: 'Exam published' });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/users ──────────────────────────────────────────────────────
exports.getUsers = async (req, res, next) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role)   filter.role = role;
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const skip  = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password -refreshToken -passwordResetOtp -passwordResetToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: { users, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } },
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/users/:id/role ──────────────────────────────────────────
exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['student','admin'].includes(role))
      return next(new AppError('Role must be student or admin', 400));

    // Prevent self-demotion
    if (req.params.id === req.user._id.toString() && role !== 'admin')
      return next(new AppError('You cannot change your own role', 403));

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password').lean();

    if (!user) return next(new AppError('User not found', 404));
    res.json({ success: true, data: user, message: `User role updated to ${role}` });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/questions ──────────────────────────────────────────────────
exports.getQuestions = async (req, res, next) => {
  try {
    const { subject, unit, difficulty, search, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };
    if (subject)    filter.subject    = subject;
    if (unit)       filter.unit       = unit;
    if (difficulty) filter.difficulty = difficulty;
    if (search) {
      filter.$or = [
        { 'questionText.en': { $regex: search, $options: 'i' } },
        { 'questionText.ta': { $regex: search, $options: 'i' } },
      ];
    }
    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Question.countDocuments(filter);
    const questions = await Question.find(filter)
      .select('_id questionText subject unit difficulty examGroups isPYQ createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: { questions, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/admin/questions ─────────────────────────────────────────────────
exports.createQuestion = async (req, res, next) => {
  try {
    const {
      questionText_en, questionText_ta,
      option_A_en, option_A_ta,
      option_B_en, option_B_ta,
      option_C_en, option_C_ta,
      option_D_en, option_D_ta,
      correctOption, subject, unit, difficulty,
      examGroups, isPYQ, pyqYear,
      explanation_en, explanation_ta,
    } = req.body;

    if (!questionText_en || !option_A_en || !option_B_en || !option_C_en || !option_D_en)
      return next(new AppError('Question text and all 4 options (EN) are required', 400));
    if (!VALID_OPTIONS.includes(correctOption?.toUpperCase()))
      return next(new AppError('correctOption must be A, B, C, or D', 400));
    if (!VALID_SUBJECTS.includes(subject?.toUpperCase()))
      return next(new AppError(`Invalid subject`, 400));

    const question = await Question.create({
      questionText: { en: questionText_en, ...(questionText_ta && { ta: questionText_ta }) },
      options: [
        { key:'A', text:{ en:option_A_en, ...(option_A_ta && { ta:option_A_ta }) } },
        { key:'B', text:{ en:option_B_en, ...(option_B_ta && { ta:option_B_ta }) } },
        { key:'C', text:{ en:option_C_en, ...(option_C_ta && { ta:option_C_ta }) } },
        { key:'D', text:{ en:option_D_en, ...(option_D_ta && { ta:option_D_ta }) } },
      ],
      correctOption:  correctOption.toUpperCase(),
      subject:        subject.toUpperCase(),
      unit:           unit || 'General',
      difficulty:     (difficulty || 'MEDIUM').toUpperCase(),
      examGroups:     Array.isArray(examGroups) ? examGroups : ['ALL'],
      isPYQ:          Boolean(isPYQ),
      ...(isPYQ && pyqYear && { pyqYear: Number(pyqYear) }),
      ...(explanation_en && {
        explanation: { en: explanation_en, ...(explanation_ta && { ta: explanation_ta }) },
      }),
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/admin/questions/:id ────────────────────────────────────────────
exports.updateQuestion = async (req, res, next) => {
  try {
    const {
      questionText_en, questionText_ta,
      option_A_en, option_A_ta,
      option_B_en, option_B_ta,
      option_C_en, option_C_ta,
      option_D_en, option_D_ta,
      correctOption, subject, unit, difficulty,
      examGroups, isPYQ, pyqYear,
      explanation_en, explanation_ta,
    } = req.body;

    const question = await Question.findById(req.params.id);
    if (!question) return next(new AppError('Question not found', 404));

    // Update only provided fields
    if (questionText_en) question.questionText.en = questionText_en;
    if (questionText_ta) question.questionText.ta = questionText_ta;

    if (option_A_en) question.options[0].text.en = option_A_en;
    if (option_A_ta) question.options[0].text.ta = option_A_ta;
    if (option_B_en) question.options[1].text.en = option_B_en;
    if (option_B_ta) question.options[1].text.ta = option_B_ta;
    if (option_C_en) question.options[2].text.en = option_C_en;
    if (option_C_ta) question.options[2].text.ta = option_C_ta;
    if (option_D_en) question.options[3].text.en = option_D_en;
    if (option_D_ta) question.options[3].text.ta = option_D_ta;

    if (correctOption) question.correctOption = correctOption.toUpperCase();
    if (subject)       question.subject       = subject.toUpperCase();
    if (unit)          question.unit          = unit;
    if (difficulty)    question.difficulty    = difficulty.toUpperCase();
    if (examGroups)    question.examGroups    = examGroups;
    if (isPYQ !== undefined) question.isPYQ   = isPYQ;
    if (pyqYear)       question.pyqYear       = Number(pyqYear);

    if (explanation_en) {
      question.explanation = question.explanation || {};
      question.explanation.en = explanation_en;
    }
    if (explanation_ta) {
      question.explanation = question.explanation || {};
      question.explanation.ta = explanation_ta;
    }

    await question.save();
    res.json({ success: true, data: question, message: 'Question updated' });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/admin/questions/:id (soft delete) ─────────────────────────────
exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!question) return next(new AppError('Question not found', 404));
    res.json({ success: true, message: 'Question deactivated' });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admin/questions/:id ──────────────────────────────────────────────
exports.getQuestionById = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id).lean();
    if (!question) return next(new AppError('Question not found', 404));
    res.json({ success: true, data: question });
  } catch (err) {
    next(err);
  }
};