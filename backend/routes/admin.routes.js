const express    = require('express');
const multer     = require('multer');
const router     = express.Router();
const adminCtrl  = require('../controllers/admin.controller');
const { protect, authorize } = require('../middlewares/error.middleware');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// All admin routes require authentication + admin role
router.use(protect, authorize('admin'));

router.post('/questions/bulk-upload', upload.single('file'),  adminCtrl.bulkUploadQuestions);
router.patch('/questions/:id',                                adminCtrl.updateQuestion);
router.delete('/questions/:id',                               adminCtrl.deleteQuestion);
router.get('/exams/unpublished',  adminCtrl.getUnpublishedExams);
router.post('/exams/:id/publish',                             adminCtrl.publishExam);
router.get('/stats',                                          adminCtrl.getPlatformStats);

module.exports = router;
