//test.controller.js
const mongoose            = require('mongoose');
const { Exam, TestAttempt } = require('../models/Exam.model');
const Question            = require('../models/Question.model');
const User                = require('../models/User.model');
const { AppError }        = require('../middlewares/error.middleware');
const { gradeAttempt }    = require('../utils/gradeAttempt');
const { getExamAvailability } = require('../utils/examAvailability');

// ── GET /api/tests  ─────────────────────────────────────────────────────────
// List published tests (filtered by type / examGroup)
exports.listTests = async (req, res, next) => {
  try {
    const { type, examGroup, page = 1, limit = 20 } = req.query;
    const now = new Date();
    const filter = {
      isPublished: true,
      $or: [
        { availableTill: { $exists: false } },
        { availableTill: null },
        { availableTill: { $gt: now } },
      ],
    };
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
      availableFrom,
      availableTill,
    } = req.body;

    // ── Validate title ────────────────────────────────────────────────────
    if (!title || !title.en || !title.en.trim()) {
      return next(new AppError('title.en is required', 400));
    }

    if (Boolean(availableFrom) !== Boolean(availableTill)) {
      return next(new AppError('Both availableFrom and availableTill are required', 400));
    }

    if (availableFrom && (
      Number.isNaN(Date.parse(availableFrom)) ||
      Number.isNaN(Date.parse(availableTill)) ||
      new Date(availableTill) <= new Date(availableFrom)
    )) {
      return next(new AppError('Availability end must be later than a valid start time', 400));
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
      ...(availableFrom && {
        availableFrom: new Date(availableFrom),
        availableTill: new Date(availableTill),
        scheduledAt: new Date(availableFrom),
      }),
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

    // Let an existing attempt resume, but only allow new attempts during the exam window.
    const active = await TestAttempt.findOne({
      userId: req.user._id, examId: exam._id, status: 'IN_PROGRESS',
    });
    if (active) {
      const lang = req.user.languagePreference || 'en';
      const questions = exam.questions.map(q => ({
        _id: q._id,
        ...q.getLocalised(lang),
      }));
      return res.json({
        success: true,
        attempt: active,
        questions,
        duration: exam.duration,
      });
    }

    const availability = getExamAvailability(exam);
    if (!availability.isAvailable) {
      const message = availability.isUpcoming
        ? 'This exam is not available yet'
        : 'This exam is no longer available';
      return next(new AppError(message, 403));
    }

    const lang = req.user.languagePreference || 'en';
    const questions = exam.questions.map(q => ({
      _id: q._id,
      ...q.getLocalised(lang),
    }));

    const attempt = await TestAttempt.create({
      userId:     req.user._id,
      examId:     exam._id,
      totalMarks: exam.totalMarks,
      startedAt:  new Date(),
    });

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
    const questionIds = (answers || []).map(a => a.questionId).filter(Boolean);
    const questions   = await Question.find({ _id: { $in: questionIds } });

    const {
      score,
      correct,
      incorrect,
      skipped,
      accuracy,
      attempted,
      gradedAnswers,
      sectionWiseAnalysis,
    } = gradeAttempt({ answers: answers || [], questions, exam });

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

    // res.json({ success: true, attempt });
    // Fetch questions WITH correct answers for solution display
    const gradedQuestions = await Question.find({
      _id: { $in: attempt.answersSubmitted.map(a => a.questionId) }
    }).select('questionText options correctOption explanation subject unit');

    res.json({ success: true, attempt, gradedQuestions });
  } catch (err) { next(err); }
};

exports.getAttemptHistory = async (req, res, next) => {
  try {
    const pipeline = [
      { $match: { userId: req.user._id, status: 'GRADED' } },
      { $sort: { submittedAt: -1 } },
      {
        $group: {
          _id: '$examId',
          attemptCount: { $sum: 1 },
          latestAttempt: { $first: '$$ROOT' },
          attempts: {
            $push: {
              _id: '$_id',
              score: '$score',
              totalMarks: '$totalMarks',
              accuracy: '$accuracy',
              submittedAt: '$submittedAt',
            },
          },
        },
      },
      {
        $lookup: {
          from: Exam.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'exam',
        },
      },
      { $unwind: '$exam' },
      ...(req.query.type ? [{ $match: { 'exam.type': req.query.type.toUpperCase() } }] : []),
      { $sort: { 'latestAttempt.submittedAt': -1 } },
      {
        $project: {
          _id: '$latestAttempt._id',
          examId: {
            _id: '$exam._id',
            title: '$exam.title',
            type: '$exam.type',
            examGroup: '$exam.examGroup',
            duration: '$exam.duration',
            totalMarks: '$exam.totalMarks',
            totalQuestions: '$exam.totalQuestions',
            isPremium: '$exam.isPremium',
          },
          attemptCount: 1,
          attempts: 1,
          score: '$latestAttempt.score',
          totalMarks: '$latestAttempt.totalMarks',
          accuracy: '$latestAttempt.accuracy',
          correct: '$latestAttempt.correct',
          incorrect: '$latestAttempt.incorrect',
          skipped: '$latestAttempt.skipped',
          timeTaken: '$latestAttempt.timeTaken',
          submittedAt: '$latestAttempt.submittedAt',
        },
      },
    ];
    const attempts = await TestAttempt.aggregate(pipeline);

    res.json({ success: true, attempts });
  } catch (err) {
    next(err);
  }
};

exports.getAttemptReview = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.attemptId)) {
      return next(new AppError('Attempt not found', 404));
    }

    const attempt = await TestAttempt.findOne({
      _id: req.params.attemptId,
      userId: req.user._id,
      status: 'GRADED',
    }).populate('examId', 'title type totalMarks questions');

    if (!attempt || !attempt.examId) {
      return next(new AppError('Completed attempt not found', 404));
    }

    const questionIds = attempt.answersSubmitted.map(answer => answer.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } })
      .select('questionText options correctOption explanation subject unit')
      .lean();
    const questionsById = new Map(questions.map(question => [question._id.toString(), question]));
    const reviewQuestions = attempt.answersSubmitted
      .map(answer => {
        const question = questionsById.get(answer.questionId.toString());
        return question ? {
          ...question,
          selectedOption: answer.selectedOption,
          isCorrect: answer.isCorrect,
        } : null;
      })
      .filter(Boolean);

    res.json({
      success: true,
      attempt: {
        _id: attempt._id,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        accuracy: attempt.accuracy,
        correct: attempt.correct,
        incorrect: attempt.incorrect,
        skipped: attempt.skipped,
        timeTaken: attempt.timeTaken,
        sectionWiseAnalysis: attempt.sectionWiseAnalysis,
        submittedAt: attempt.submittedAt,
      },
      exam: attempt.examId,
      questions: reviewQuestions,
    });
  } catch (err) {
    next(err);
  }
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