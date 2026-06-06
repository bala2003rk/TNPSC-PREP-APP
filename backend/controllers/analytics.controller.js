const mongoose            = require('mongoose');
const { TestAttempt }     = require('../models/Exam.model');
const User                = require('../models/User.model');
const { AppError }        = require('../middlewares/error.middleware');

// ── GET /api/analytics/dashboard/:userId ────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.userId);

    // Authorise: own data or admin
    if (req.user._id.toString() !== req.params.userId && req.user.role !== 'admin')
      return next(new AppError('Forbidden', 403));

    const [user, subjectMetrics, recentAttempts, streakData] = await Promise.all([
      User.findById(userId).select('stats targetExams languagePreference subscription name profileImage role'),
      _subjectAggregation(userId),
      _recentAttempts(userId),
      _streakHistory(userId),
    ]);

    if (!user) return next(new AppError('User not found', 404));

    // AI-style weakness flagging (rule-based, no external AI call)
    const weakUnits = _deriveWeakUnits(subjectMetrics);

    res.json({
      success: true,
      dashboard: {
        user,
        subjectMetrics,
        recentAttempts,
        streakData,
        weakUnits,
      },
    });
  } catch (err) { next(err); }
};

// ── Subject-wise aggregation ─────────────────────────────────────────────────
async function _subjectAggregation(userId) {
  return TestAttempt.aggregate([
    { $match: { userId, status: 'GRADED' } },
    { $unwind: '$sectionWiseAnalysis' },
    {
      $group: {
        _id:          '$sectionWiseAnalysis.subject',
        totalTests:   { $sum: 1 },
        totalAttempted: { $sum: '$sectionWiseAnalysis.attempted' },
        totalCorrect:   { $sum: '$sectionWiseAnalysis.correct' },
        totalMarks:     { $sum: '$sectionWiseAnalysis.marksObtained' },
        avgAccuracy:    { $avg: '$sectionWiseAnalysis.accuracy' },
      },
    },
    {
      $project: {
        subject:      '$_id',
        totalTests:   1,
        totalAttempted: 1,
        totalCorrect:   1,
        totalMarks:     1,
        avgAccuracy:  { $round: ['$avgAccuracy', 1] },
        _id:          0,
      },
    },
    { $sort: { avgAccuracy: 1 } },
  ]);
}

// ── Recent attempts (last 10) ────────────────────────────────────────────────
async function _recentAttempts(userId) {
  return TestAttempt.find({ userId, status: 'GRADED' })
    .sort({ submittedAt: -1 })
    .limit(10)
    .populate('examId', 'title type examGroup')
    .select('score accuracy timeTaken attempted correct submittedAt examId');
}

// ── 30-day daily activity for streak chart ───────────────────────────────────
async function _streakHistory(userId) {
  const since = new Date(Date.now() - 30 * 86400000);
  return TestAttempt.aggregate([
    { $match: { userId, status: 'GRADED', submittedAt: { $gte: since } } },
    {
      $group: {
        _id:        { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' } },
        testsTaken: { $sum: 1 },
        avgScore:   { $avg: '$accuracy' },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { date: '$_id', testsTaken: 1, avgScore: { $round: ['$avgScore', 1] }, _id: 0 } },
  ]);
}

// ── Rule-based weakness detection ────────────────────────────────────────────
function _deriveWeakUnits(subjectMetrics) {
  return subjectMetrics
    .filter(s => s.avgAccuracy < 50 && s.totalAttempted >= 5)
    .map(s => ({
      subject:    s.subject,
      accuracy:   s.avgAccuracy,
      message_en: `Your accuracy in ${s.subject} is ${s.avgAccuracy}%. Review the fundamentals.`,
      message_ta: `உங்கள் ${s.subject} துறையில் திறன் ${s.avgAccuracy}% மட்டுமே உள்ளது. அடிப்படைகளை மீண்டும் படிக்கவும்.`,
    }));
}

// ── GET /api/analytics/leaderboard/global ────────────────────────────────────
exports.getGlobalLeaderboard = async (req, res, next) => {
  try {
    const { examGroup, period = '30d' } = req.query;
    const since = period === '7d'
      ? new Date(Date.now() - 7 * 86400000)
      : new Date(Date.now() - 30 * 86400000);

    const match = { status: 'GRADED', submittedAt: { $gte: since } };

    const board = await TestAttempt.aggregate([
      { $match: match },
      {
        $group: {
          _id:          '$userId',
          totalScore:   { $sum: '$score' },
          totalTests:   { $sum: 1 },
          avgAccuracy:  { $avg: '$accuracy' },
        },
      },
      { $sort: { totalScore: -1 } },
      { $limit: 100 },
      {
        $lookup: {
          from:         'users',
          localField:   '_id',
          foreignField: '_id',
          as:           'user',
          pipeline:     [{ $project: { name: 1, profileImage: 1 } }],
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          userId:      '$_id',
          name:        '$user.name',
          profileImage:'$user.profileImage',
          totalScore:  1,
          totalTests:  1,
          avgAccuracy: { $round: ['$avgAccuracy', 1] },
          _id:         0,
        },
      },
    ]);

    const ranked = board.map((e, i) => ({ ...e, rank: i + 1 }));
    res.json({ success: true, leaderboard: ranked });
  } catch (err) { next(err); }
};
