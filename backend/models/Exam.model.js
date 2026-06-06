const mongoose = require('mongoose');

// ════════════════════════════════════════════════════════════════════════════
// EXAM / TEST SCHEMA
// ════════════════════════════════════════════════════════════════════════════
const sectionSchema = new mongoose.Schema({
  name:            { en: String, ta: String },
  subject:         String,
  questionIds:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  marksPerQuestion: { type: Number, default: 1 },
  negativeMarking:  { type: Number, default: 0 }, // e.g. 0.33
}, { _id: false });

const examSchema = new mongoose.Schema(
  {
    title: {
      en: { type: String, required: true },
      ta: String,
    },
    description: { en: String, ta: String },

    type: {
      type: String,
      enum: ['MOCK', 'PYQ', 'DAILY_QUIZ', 'SUBJECT_TEST', 'GRAND_TEST'],
      required: true,
    },

    examGroup: {
      type: String,
      enum: ['GROUP_1', 'GROUP_2', 'GROUP_2A', 'GROUP_4', 'VAO', 'ALL'],
    },

    // Flat list OR sections
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    sections:  [sectionSchema],

    totalQuestions:  { type: Number, required: true },
    totalMarks:      { type: Number, required: true },
    duration:        { type: Number, required: true }, // minutes
    marksPerQuestion:{ type: Number, default: 1 },
    negativeMarking: { type: Number, default: 0 },
    passingMarks:    Number,

    // PYQ-specific
    pyqYear: Number,

    // Scheduling
    scheduledAt:   Date,
    availableFrom: Date,
    availableTill: Date,

    // Access control
    isPremium:   { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },

    // Leaderboard
    leaderboard: [
      {
        userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        score:    Number,
        accuracy: Number,
        timeTaken:Number,
        rank:     Number,
      },
    ],

    attemptCount: { type: Number, default: 0 },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags:         [String],
  },
  { timestamps: true }
);

examSchema.index({ type: 1, examGroup: 1, isPublished: 1 });
examSchema.index({ scheduledAt: 1 });
examSchema.index({ tags: 1 });

// ════════════════════════════════════════════════════════════════════════════
// TEST ATTEMPT SCHEMA
// ════════════════════════════════════════════════════════════════════════════
const answerSchema = new mongoose.Schema({
  questionId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  selectedOption:  { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
  isCorrect:       Boolean,
  marksAwarded:    Number,
  timeTaken:       Number,  // seconds spent on this question
  isFlagged:       { type: Boolean, default: false },
}, { _id: false });

const sectionAnalysisSchema = new mongoose.Schema({
  subject:        String,
  attempted:      Number,
  correct:        Number,
  incorrect:      Number,
  skipped:        Number,
  marksObtained:  Number,
  accuracy:       Number,    // percentage
  avgTimePerQ:    Number,    // seconds
}, { _id: false });

const testAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },

    answersSubmitted: [answerSchema],

    // Summary
    score:          { type: Number, default: 0 },
    totalMarks:     Number,
    accuracy:       Number,   // percentage
    timeTaken:      Number,   // total seconds
    attempted:      Number,
    correct:        Number,
    incorrect:      Number,
    skipped:        Number,
    rank:           Number,   // populated after grading

    sectionWiseAnalysis: [sectionAnalysisSchema],

    status: {
      type: String,
      enum: ['IN_PROGRESS', 'SUBMITTED', 'GRADED', 'ABANDONED'],
      default: 'IN_PROGRESS',
    },

    startedAt:   { type: Date, default: Date.now },
    submittedAt: Date,
    gradedAt:    Date,

    // AI-generated feedback (populated async)
    aiReview: {
      weakUnits:       [String],
      recommendations: [String],
      generatedAt:     Date,
    },
  },
  { timestamps: true }
);

testAttemptSchema.index({ userId: 1, examId: 1 });
testAttemptSchema.index({ userId: 1, status: 1 });
testAttemptSchema.index({ examId: 1, score: -1 }); // for leaderboard
testAttemptSchema.index({ createdAt: -1 });

const Exam        = mongoose.model('Exam', examSchema);
const TestAttempt = mongoose.model('TestAttempt', testAttemptSchema);

module.exports = { Exam, TestAttempt };
