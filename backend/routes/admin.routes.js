const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const { protect, authorize } = require('../middlewares/error.middleware');
const {
  bulkUploadQuestions,
  getStats,
  getUnpublishedExams,
  publishExam,
  getUsers,
  updateUserRole,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getQuestionById,
} = require('../controllers/admin.controller');

// All admin routes require protect + admin role
const adminOnly = [protect, authorize('admin')];

// File upload (memory storage — buffer passed to xlsx parser)
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx?|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) or CSV files are allowed'), false);
    }
  },
});

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', adminOnly, getStats);

// ── Exams ─────────────────────────────────────────────────────────────────────
router.get('/exams/unpublished',  adminOnly, getUnpublishedExams);
router.post('/exams/:id/publish', adminOnly, publishExam);
router.patch('/exams/:id/publish',adminOnly, publishExam); // support both methods

// ── Questions ─────────────────────────────────────────────────────────────────
router.get('/questions',         adminOnly, getQuestions);
router.post('/questions',        adminOnly, createQuestion);
router.get('/questions/:id',     adminOnly, getQuestionById);
router.patch('/questions/:id',   adminOnly, updateQuestion);
router.delete('/questions/:id',  adminOnly, deleteQuestion);

// Bulk upload
router.post(
  '/questions/bulk-upload',
  adminOnly,
  upload.single('file'),
  bulkUploadQuestions
);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get('/users',              adminOnly, getUsers);
router.patch('/users/:id/role',   adminOnly, updateUserRole);

module.exports = router;