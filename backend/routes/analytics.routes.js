const express       = require('express');
const router        = express.Router();
const analyticsCtrl = require('../controllers/analytics.controller');
const { protect }   = require('../middlewares/error.middleware');

router.get('/dashboard/:userId',  protect, analyticsCtrl.getDashboard);
router.get('/leaderboard/global', protect, analyticsCtrl.getGlobalLeaderboard);

module.exports = router;
