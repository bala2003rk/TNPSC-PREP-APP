// ════════════════════════════════════════════════════════════════════════════
// routes/test.routes.js
// ════════════════════════════════════════════════════════════════════════════
const express   = require('express');
const router    = express.Router();
const testCtrl  = require('../controllers/test.controller');
const { protect, authorize } = require('../middlewares/error.middleware');

router.get('/',                    protect, testCtrl.listTests);
router.post('/mock',               protect, authorize('admin','moderator'), testCtrl.createMockTest);
router.post('/:examId/start',      protect, testCtrl.startTest);
router.post('/:examId/submit',     protect, testCtrl.submitTest);
router.get('/:examId/leaderboard', protect, testCtrl.getLeaderboard);

module.exports = router;

// ════════════════════════════════════════════════════════════════════════════
// routes/analytics.routes.js  (exported as a separate file conceptually)
// ════════════════════════════════════════════════════════════════════════════
// const express       = require('express');
// const router        = express.Router();
// const analyticsCtrl = require('../controllers/analytics.controller');
// const { protect }   = require('../middlewares/error.middleware');
//
// router.get('/dashboard/:userId',   protect, analyticsCtrl.getDashboard);
// router.get('/leaderboard/global',  protect, analyticsCtrl.getGlobalLeaderboard);
//
// module.exports = router;
