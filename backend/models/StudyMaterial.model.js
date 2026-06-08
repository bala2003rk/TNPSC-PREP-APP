const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema(
  {
    title: {
      en: { type: String, required: true, trim: true },
      ta: { type: String, trim: true, default: '' },
    },
    description: {
      en: { type: String, trim: true, default: '' },
      ta: { type: String, trim: true, default: '' },
    },
    category: {
      type: String,
      enum: ['NOTES', 'CURRENT_AFFAIRS', 'TAMIL_ELIGIBILITY', 'PREVIOUS_PAPERS', 'BOOKS', 'SYLLABUS'],
      required: true,
    },
    subject: { type: String, trim: true, default: '' },
    examGroups: {
      type: [String],
      enum: ['GROUP_1', 'GROUP_2', 'GROUP_2A', 'GROUP_4', 'VAO', 'ALL'],
      default: ['ALL'],
    },
    fileUrl:      { type: String, required: true, trim: true },
    fileSize:     { type: Number, default: 0 },   // bytes
    fileType:     { type: String, trim: true, default: 'PDF' }, // PDF | DOC | PPT …
    thumbnailUrl: { type: String, trim: true, default: '' },
    isPremium:    { type: Boolean, default: false },
    isActive:     { type: Boolean, default: true },
    downloadCount:{ type: Number, default: 0 },
    uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags:         { type: [String], default: [] },
    year:         { type: Number },  // for PREVIOUS_PAPERS
  },
  { timestamps: true }
);

// Indexes for common filter queries
studyMaterialSchema.index({ category: 1, isActive: 1 });
studyMaterialSchema.index({ subject: 1 });
studyMaterialSchema.index({ examGroups: 1 });
studyMaterialSchema.index({ isPremium: 1 });
studyMaterialSchema.index({ tags: 1 });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
