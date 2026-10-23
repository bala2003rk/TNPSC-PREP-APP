const express  = require('express');
const router   = express.Router();
const { protect } = require('../middlewares/error.middleware');
const User = require('../models/User.model');

// ── Full bilingual syllabus data ──────────────────────────────────────────────
const SYLLABUS_DATA = {
  GROUP_1: [
    {
      name: { en: 'History', ta: 'வரலாறு' },
      units: [
        { name: { en: 'Indus Valley Civilisation', ta: 'சிந்து வெளி நாகரிகம்' } },
        { name: { en: 'Vedic Age', ta: 'வேத காலம்' } },
        { name: { en: 'Maurya Empire', ta: 'மௌரிய பேரரசு' } },
        { name: { en: 'Gupta Empire', ta: 'குப்த பேரரசு' } },
        { name: { en: 'Medieval India', ta: 'இடைக்கால இந்தியா' } },
        { name: { en: 'Vijayanagara Empire', ta: 'விஜயநகர பேரரசு' } },
        { name: { en: 'Maratha Empire', ta: 'மராட்டிய பேரரசு' } },
        { name: { en: 'British Rule in India', ta: 'இந்தியாவில் ஆங்கிலேய ஆட்சி' } },
        { name: { en: 'Freedom Struggle', ta: 'சுதந்திர போராட்டம்' } },
        { name: { en: 'Modern Tamil Nadu', ta: 'நவீன தமிழ்நாடு' } },
      ],
    },
    {
      name: { en: 'Geography', ta: 'புவியியல்' },
      units: [
        { name: { en: 'Physical Geography', ta: 'இயற்பியல் புவியியல்' } },
        { name: { en: 'Indian Geography', ta: 'இந்திய புவியியல்' } },
        { name: { en: 'Tamil Nadu Geography', ta: 'தமிழ்நாடு புவியியல்' } },
        { name: { en: 'Agriculture', ta: 'விவசாயம்' } },
        { name: { en: 'Minerals & Industries', ta: 'தாதுக்கள் மற்றும் தொழில்கள்' } },
        { name: { en: 'Climate', ta: 'காலநிலை' } },
      ],
    },
    {
      name: { en: 'Polity', ta: 'அரசியல்' },
      units: [
        { name: { en: 'Indian Constitution', ta: 'இந்திய அரசியலமைப்பு' } },
        { name: { en: 'Parliament', ta: 'நாடாளுமன்றம்' } },
        { name: { en: 'State Legislature', ta: 'மாநில சட்டமன்றம்' } },
        { name: { en: 'Judiciary', ta: 'நீதிமன்றம்' } },
        { name: { en: 'Local Bodies', ta: 'உள்ளாட்சி அமைப்புகள்' } },
        { name: { en: 'Elections', ta: 'தேர்தல்கள்' } },
        { name: { en: 'Fundamental Rights', ta: 'அடிப்படை உரிமைகள்' } },
      ],
    },
    {
      name: { en: 'Economics', ta: 'பொருளாதாரம்' },
      units: [
        { name: { en: 'National Income', ta: 'தேசிய வருமானம்' } },
        { name: { en: 'Five Year Plans', ta: 'ஐந்தாண்டு திட்டங்கள்' } },
        { name: { en: 'Agriculture Economy', ta: 'வேளாண் பொருளாதாரம்' } },
        { name: { en: 'Money & Banking', ta: 'பணம் மற்றும் வங்கியியல்' } },
        { name: { en: 'Budget & Taxation', ta: 'பட்ஜெட் மற்றும் வரிவிதிப்பு' } },
      ],
    },
    {
      name: { en: 'Science & Technology', ta: 'அறிவியல் மற்றும் தொழில்நுட்பம்' },
      units: [
        { name: { en: 'Physics Basics', ta: 'இயற்பியல் அடிப்படைகள்' } },
        { name: { en: 'Chemistry Basics', ta: 'வேதியியல் அடிப்படைகள்' } },
        { name: { en: 'Biology Basics', ta: 'உயிரியல் அடிப்படைகள்' } },
        { name: { en: 'Environment & Ecology', ta: 'சுற்றுச்சூழல் மற்றும் சூழலியல்' } },
        { name: { en: 'Space Technology', ta: 'விண்வெளி தொழில்நுட்பம்' } },
      ],
    },
  ],
  GROUP_2: [],  // same as GROUP_1 for now — extend as needed
  GROUP_2A: [],
  GROUP_4: [],
  VAO: [],
};

// Copy GROUP_1 syllabus to other groups (they share the same core subjects)
SYLLABUS_DATA.GROUP_2  = SYLLABUS_DATA.GROUP_1;
SYLLABUS_DATA.GROUP_2A = SYLLABUS_DATA.GROUP_1;
SYLLABUS_DATA.GROUP_4  = SYLLABUS_DATA.GROUP_1;
SYLLABUS_DATA.VAO      = SYLLABUS_DATA.GROUP_1;

// ── POST /api/syllabus/progress  ─────────────────────────────────────────────
// MUST be declared before /:examGroup to avoid "progress" matching as examGroup
router.post('/progress', protect, async (req, res, next) => {
  try {
    const { subject, unit, examGroup, completed } = req.body;

    if (!subject || !unit) {
      return res.status(400).json({ success: false, message: 'subject and unit are required' });
    }

    if (completed === false) {
      // Remove from progressTracker
      await User.findByIdAndUpdate(req.user._id, {
        $pull: {
          progressTracker: {
            subject,
            unit,
          },
        },
      });
    } else {
      // Add to progressTracker (avoid duplicates)
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: {
          progressTracker: {
            subject,
            unit,
            examGroup: examGroup || null,
            completedAt: new Date(),
          },
        },
      });
    }

    res.json({ success: true, message: completed === false ? 'Progress removed' : 'Progress saved' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/syllabus/:examGroup  ────────────────────────────────────────────
router.get('/:examGroup', protect, (req, res) => {
  const group = req.params.examGroup.toUpperCase();
  const data  = SYLLABUS_DATA[group];

  if (!data) {
    return res.status(404).json({ success: false, message: `Syllabus not found for ${group}` });
  }

  // Add stable string IDs to each unit so frontend can track completion
  const withIds = data.map((subject, si) => ({
    ...subject,
    _id: `${group}_S${si}`,
    units: subject.units.map((unit, ui) => ({
      ...unit,
      _id: `${group}_S${si}_U${ui}`,
    })),
  }));

  res.json({ success: true, data: withIds });
});

module.exports = router;