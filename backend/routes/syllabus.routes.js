const express  = require('express');
const router   = express.Router();
const { protect } = require('../middlewares/error.middleware');

// TNPSC official syllabus structured data (stub — load from DB or static JSON)
const SYLLABUS = {
  GROUP_4: {
    subjects: ['GENERAL_STUDIES', 'APTITUDE', 'TAMIL_ELIGIBILITY'],
    units: {
      HISTORY: ['Indus Valley', 'Vedic Age', 'Maurya Empire', 'Gupta Empire', 'Medieval India', 'Vijayanagara', 'Maratha', 'British Rule', 'Freedom Struggle', 'Modern Tamil Nadu'],
      GEOGRAPHY: ['Physical Geography', 'Indian Geography', 'Tamil Nadu Geography', 'Agriculture', 'Minerals', 'Climate'],
      POLITY: ['Constitution', 'Parliament', 'State Legislature', 'Judiciary', 'Local Bodies', 'Elections', 'Rights'],
      ECONOMICS: ['National Income', 'Five Year Plans', 'Agriculture', 'Industries', 'Money & Banking', 'Budget'],
    },
  },
};

router.get('/:examGroup', protect, (req, res) => {
  const data = SYLLABUS[req.params.examGroup.toUpperCase()];
  if (!data) return res.status(404).json({ success: false, message: 'Syllabus not found' });
  res.json({ success: true, syllabus: data });
});

// Progress checklist
router.post('/progress', protect, async (req, res, next) => {
  try {
    const { subject, unit, chapter } = req.body;
    const User = require('../models/User.model');
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { progressTracker: { subject, unit, chapter } },
    });
    res.json({ success: true, message: 'Progress saved' });
  } catch (err) { next(err); }
});

module.exports = router;
