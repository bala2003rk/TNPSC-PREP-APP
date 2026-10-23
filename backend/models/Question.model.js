// Question.model.js

const mongoose = require('mongoose');

// Bilingual text wrapper – used across the schema
const bilingualSchema = new mongoose.Schema(
  { en: { type: String, required: true }, ta: { type: String } },
  { _id: false }
);

const optionSchema = new mongoose.Schema(
  {
    key:  { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    text: { type: bilingualSchema, required: true },
    imageUrl: String, // for image-based options
  },
  { _id: false }
);

const samacheerMappingSchema = new mongoose.Schema(
  {
    standard: { type: Number, min: 6, max: 12 }, // 6th–12th std
    term:     { type: Number, min: 1, max: 3 },
    chapter:  { type: Number },
    chapterTitle: bilingualSchema,
    subject:  String,
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    questionText:  { type: bilingualSchema, required: true },
    options:       { type: [optionSchema], validate: [v => v.length === 4, 'Exactly 4 options required'] },
    correctOption: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
    explanation:   bilingualSchema,

    // Taxonomy
    subject: {
      type: String,
      enum: [
        'HISTORY', 'GEOGRAPHY', 'POLITY', 'ECONOMICS',
        'SCIENCE', 'ENVIRONMENT', 'CURRENT_AFFAIRS',
        'APTITUDE', 'TAMIL', 'ENGLISH', 'GK',
      ],
      required: true,
    },
    unit:    { type: String, required: true },  // e.g. "Indus Valley Civilisation"
    topic:   String,
    tags:    [String],

    // TNPSC exam targeting
    examGroups: [{
      type: String,
      enum: ['GROUP_1', 'GROUP_2', 'GROUP_2A', 'GROUP_4', 'VAO', 'TNTET', 'CESE', 'ALL'],
    }],

    // PYQ metadata
    isPYQ:        { type: Boolean, default: false },
    pyqYear:      Number,
    pyqExamGroup: String,

    // Samacheer mapping
    samacheerMapping: samacheerMappingSchema,

    // Difficulty
    difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], default: 'MEDIUM' },

    // Usage analytics (denormalised)
    timesUsed:     { type: Number, default: 0 },
    timesCorrect:  { type: Number, default: 0 },
    successRate:   { type: Number, default: 0 },   // recomputed periodically

    questionImage: String, // S3 URL
    isActive:      { type: Boolean, default: true },
    createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// ── Compound indexes ─────────────────────────────────────────────────────────
questionSchema.index({ subject: 1, unit: 1 });
questionSchema.index({ examGroups: 1, isPYQ: 1 });
questionSchema.index({ difficulty: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ isActive: 1 });
questionSchema.index(
  { 'questionText.en': 'text', 'questionText.ta': 'text' },
  { name: 'question_text_search' }
);

// ── Virtual: bilingual accessor helper ──────────────────────────────────────
questionSchema.methods.getLocalised = function (lang = 'en') {
  const text = this.questionText[lang] || this.questionText.en;
  return {
    _id: this._id,
    subject: this.subject,
    questionText: text,
    text,
    text_en: this.questionText.en,
    text_ta: this.questionText.ta,
    options: this.options.map(o => ({
      key:  o.key,
      text: o.text[lang] || o.text.en,
      text_en: o.text.en,
      text_ta: o.text.ta,
      imageUrl: o.imageUrl,
    })),
    explanation: this.explanation
      ? this.explanation[lang] || this.explanation.en
      : null,
  };
};

module.exports = mongoose.model('Question', questionSchema);
