const mongoose            = require('mongoose');
const { Exam, TestAttempt } = require('../models/Exam.model');
const Question            = require('../models/Question.model');
const User                = require('../models/User.model');
const { AppError }        = require('../middlewares/error.middleware');

// ── GET /api/tests  ─────────────────────────────────────────────────────────
// List published tests (filtered by type / examGroup)
exports.listTests = async (req, res, next) => {
  try {
    const { type, examGroup, page = 1, limit = 20 } = req.query;
    const filter = { isPublished: true };
    if (type)      filter.type      = type.toUpperCase();
    if (examGroup) filter.examGroup = examGroup.toUpperCase();

    const [tests, total] = await Promise.all([
      Exam.find(filter)
        .select('-questions -sections -leaderboard')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Exam.countDocuments(filter),
    ]);

    res.json({ success: true, total, page: Number(page), tests });
  } catch (err) { next(err); }
};

// ── POST /api/tests/mock  ────────────────────────────────────────────────────
// Admin creates a mock test
// exports.createMockTest = async (req, res, next) => {
//     console.log('📥 req.body:', JSON.stringify(req.body, null, 2));
//   try {
//     const {
//       titleEn, titleTa, examGroup, duration, totalMarks,
//       questionIds, sections, isPremium, scheduledAt, tags,
//     } = req.body;

//     const exam = await Exam.create({
//       title:          { en: titleEn, ta: titleTa },
//       type:           'MOCK',
//       examGroup,
//       duration,
//       totalMarks,
//       totalQuestions: questionIds?.length || sections?.reduce((a, s) => a + s.questionIds.length, 0),
//       questions:      questionIds,
//       sections,
//       isPremium:      isPremium || false,
//       scheduledAt,
//       tags,
//       createdBy:      req.user._id,
//       isPublished:    false,
//     });

//     res.status(201).json({ success: true, exam });
//   } catch (err) { next(err); }
// };
exports.createMockExam = async (req, res, next) => {
  console.log('📥 req.body:', JSON.stringify(req.body, null, 2));
  try {
    const {
      title,
      type,
      examGroup,
      duration,
      totalMarks,
      totalQuestions,
      questions,
      negativeMarking,
      isPremium,
      isPublished,
      pyqYear,
    } = req.body;

    // ── Validate title ────────────────────────────────────────────────────
    if (!title || !title.en || !title.en.trim()) {
      return next(new AppError('title.en is required', 400));
    }

    // ── Filter out any null/undefined question IDs ────────────────────────
    const questionIds = Array.isArray(questions)
      ? questions.filter((id) => id !== null && id !== undefined && id !== '')
      : [];

    // ── Derive totalQuestions ─────────────────────────────────────────────
    const derivedTotal =
      (totalQuestions != null && Number(totalQuestions) > 0)
        ? Number(totalQuestions)
        : questionIds.length;

    if (derivedTotal === 0) {
      return next(new AppError('At least one question is required', 400));
    }

    const exam = await Exam.create({
      title: {
        en: title.en.trim(),
        ta: (title.ta || title.en).trim(),
      },
      type:            type        || 'MOCK',
      examGroup:       examGroup   || 'ALL',
      duration:        Number(duration)   || 90,
      totalMarks:      Number(totalMarks) || derivedTotal,
      totalQuestions:  derivedTotal,
      questions:       questionIds,
      negativeMarking: Number(negativeMarking) || 0,
      isPremium:       Boolean(isPremium),
      isPublished:     Boolean(isPublished) || false,
      createdBy:       req.user?._id,
      ...(pyqYear ? { pyqYear: Number(pyqYear) } : {}),
    });

    res.status(201).json({ success: true, data: exam });
  } catch (err) {
    next(err);
  }
};
// ── POST /api/tests/:examId/start  ──────────────────────────────────────────
// Create an IN_PROGRESS attempt
exports.startTest = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId).populate('questions');
    if (!exam) return next(new AppError('Exam not found', 404));
    if (!exam.isPublished) return next(new AppError('Exam not available', 403));

    // Premium gate
    if (exam.isPremium && !req.user.hasActiveSubscription())
      return next(new AppError('Premium subscription required', 403));

    // Prevent duplicate active attempt
    const active = await TestAttempt.findOne({
      userId: req.user._id, examId: exam._id, status: 'IN_PROGRESS',
    });
    if (active) return res.json({ success: true, attempt: active, exam });

    const attempt = await TestAttempt.create({
      userId:     req.user._id,
      examId:     exam._id,
      totalMarks: exam.totalMarks,
      startedAt:  new Date(),
    });

    // Return questions without correct answers
    const lang = req.user.languagePreference || 'en';
    const questions = exam.questions.map(q => q.getLocalised(lang));

    res.json({ success: true, attempt, questions, duration: exam.duration });
  } catch (err) { next(err); }
};

// ── POST /api/tests/:examId/submit  ─────────────────────────────────────────
// Submit answers → auto-grade → update leaderboard
exports.submitTest = async (req, res, next) => {
  try {
    const { attemptId, answers, timeTaken } = req.body;
    // answers: [{ questionId, selectedOption, timeTaken, isFlagged }]

    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt)                          return next(new AppError('Attempt not found', 404));
    if (attempt.userId.toString() !== req.user._id.toString())
                                           return next(new AppError('Forbidden', 403));
    if (attempt.status !== 'IN_PROGRESS')  return next(new AppError('Already submitted', 400));

    const exam = await Exam.findById(attempt.examId);
    const questionIds = answers.map(a => a.questionId);
    const questions   = await Question.find({ _id: { $in: questionIds } });
    const qMap        = Object.fromEntries(questions.map(q => [q._id.toString(), q]));

    // ── Auto-grading ──────────────────────────────────────────────────────
    let score = 0, correct = 0, incorrect = 0, skipped = 0;
    const subjectMap = {};

    const gradedAnswers = answers.map(ans => {
      const q   = qMap[ans.questionId?.toString()];
      if (!q) return { ...ans, isCorrect: false, marksAwarded: 0 };

      const isSkipped = !ans.selectedOption;
      const isCorrect = !isSkipped && ans.selectedOption === q.correctOption;
      let marks = 0;

      if (isSkipped)       { skipped++; }
      else if (isCorrect)  { correct++;  marks = exam.marksPerQuestion || 1; score += marks; }
      else                 { incorrect++; marks = -(exam.negativeMarking || 0); score += marks; }

      // Subject-wise accumulation
      const subj = q.subject;
      if (!subjectMap[subj]) subjectMap[subj] = { subject: subj, attempted: 0, correct: 0, incorrect: 0, skipped: 0, marksObtained: 0 };
      if (isSkipped) subjectMap[subj].skipped++;
      else {
        subjectMap[subj].attempted++;
        if (isCorrect) { subjectMap[subj].correct++; subjectMap[subj].marksObtained += marks; }
        else subjectMap[subj].incorrect++;
      }

      return { questionId: ans.questionId, selectedOption: ans.selectedOption || null, isCorrect, marksAwarded: marks, timeTaken: ans.timeTaken || 0, isFlagged: ans.isFlagged || false };
    });

    const accuracy  = correct + incorrect > 0 ? Math.round((correct / (correct + incorrect)) * 100) : 0;
    const attempted = correct + incorrect;

    // Section analysis
    const sectionWiseAnalysis = Object.values(subjectMap).map(s => ({
      ...s,
      accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0,
    }));

    // Save attempt
    attempt.answersSubmitted    = gradedAnswers;
    attempt.score               = Math.max(0, score);
    attempt.accuracy            = accuracy;
    attempt.timeTaken           = timeTaken;
    attempt.attempted           = attempted;
    attempt.correct             = correct;
    attempt.incorrect           = incorrect;
    attempt.skipped             = skipped;
    attempt.sectionWiseAnalysis = sectionWiseAnalysis;
    attempt.status              = 'GRADED';
    attempt.submittedAt         = new Date();
    attempt.gradedAt            = new Date();
    await attempt.save();

    // Update user stats (denormalised)
    await User.findByIdAndUpdate(req.user._id, {
      $inc: {
        'stats.totalTestsTaken': 1,
        'stats.totalQuestionsAttempted': attempted,
      },
    });

    // Update exam leaderboard (keep top 100)
    await Exam.findByIdAndUpdate(exam._id, {
      $push: {
        leaderboard: {
          $each:    [{ userId: req.user._id, score: attempt.score, accuracy, timeTaken, rank: 0 }],
          $sort:    { score: -1 },
          $slice:   100,
        },
      },
      $inc: { attemptCount: 1 },
    });

    res.json({ success: true, attempt });
  } catch (err) { next(err); }
};

// ── GET /api/tests/:examId/leaderboard  ──────────────────────────────────────
exports.getLeaderboard = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId)
      .select('leaderboard title totalMarks')
      .populate('leaderboard.userId', 'name profileImage');
    if (!exam) return next(new AppError('Exam not found', 404));

    // Assign ranks
    const board = exam.leaderboard.map((e, i) => ({ ...e.toObject(), rank: i + 1 }));
    res.json({ success: true, leaderboard: board, exam: { title: exam.title, totalMarks: exam.totalMarks } });
  } catch (err) { next(err); }
};
// Add these aliases at the very bottom of test.controller.js
exports.createMockTest = exports.createMockExam;
exports.getTests       = exports.getExams;