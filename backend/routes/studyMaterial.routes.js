const express = require('express');
const router  = express.Router();
const {
  getMaterials,
  getMaterialById,
  createMaterial,
  deleteMaterial,
} = require('../controllers/studyMaterial.controller');
const { protect, authorize } = require('../middlewares/error.middleware');

// Public (authenticated) routes
router.get('/',     protect, getMaterials);
router.get('/:id',  protect, getMaterialById);

// Admin-only routes
router.post('/',       protect, authorize('admin'), createMaterial);
router.delete('/:id',  protect, authorize('admin'), deleteMaterial);

module.exports = router;