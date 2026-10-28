const express  = require('express');
const router   = express.Router();
const testCtrl = require('../controllers/test.controller');
const { protect, authorize } = require('../middlewares/error.middleware');

router.get('/',                    protect, testCtrl.listTests);
router.post('/mock',               protect, authorize('admin', 'moderator'), testCtrl.createMockExam);
router.get('/attempts/history',    protect, testCtrl.getAttemptHistory);
router.get('/attempts/:attemptId/review', protect, testCtrl.getAttemptReview);
router.post('/:examId/start',      protect, testCtrl.startTest);
router.post('/:examId/submit',     protect, testCtrl.submitTest);
router.get('/:examId/leaderboard', protect, testCtrl.getLeaderboard);

module.exports = router;