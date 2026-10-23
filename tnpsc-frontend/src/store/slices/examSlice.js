//examSlices.js (./frontend/src/store/slices/examSlices.js)
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// ── Thunks ────────────────────────────────────────────────────────────────────

/**
 * loadExam — POST /api/tests/:examId/start
 * Returns { attempt, questions, duration }
 */
export const loadExam = createAsyncThunk(
  "exam/loadExam",
  async (examId, { rejectWithValue }) => {
    try {
      const res = await api.post(`/tests/${examId}/start`);
      const data = res.data?.data || res.data;
      return {
        examId,
        attemptId: data.attempt?._id || data.attemptId,
        questions: data.questions || [],
        duration:  data.duration  || data.attempt?.duration || 90,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to start exam");
    }
  }
);

/**
 * submitExam — POST /api/tests/:examId/submit
 * Builds answers array from Redux state
 */
export const submitExam = createAsyncThunk(
  "exam/submitExam",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { exam } = getState();
      const { examId, attemptId, answers, flagged, questions, startTime } = exam;

      // Build answers array expected by backend
      const answersArray = questions.map((q, idx) => ({
        questionId:     q._id,
        selectedOption: answers[idx] ?? null,
        isFlagged:      flagged.includes(idx),
        timeTaken:      0,
      }));

      const totalTimeTaken = startTime
        ? Math.floor((Date.now() - startTime) / 1000)
        : 0;

      const res = await api.post(`/tests/${examId}/submit`, {
        attemptId,
        answers:   answersArray,
        timeTaken: totalTimeTaken,
      });

      return res.data?.data || res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to submit exam");
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────
const examSlice = createSlice({
  name: "exam",
  initialState: {
    // Exam metadata
    examId:       null,
    attemptId:    null,
    startTime:    null,

    // Questions & answers
    questions:    [],
    // answers: { [questionIndex]: 'A'|'B'|'C'|'D'|null }
    answers:      {},
    flagged:      [],      // array of question indices
    currentIndex: 0,

    // Timer
    timeRemaining: 0,      // seconds

    // Lifecycle
    status: "idle",        // idle | loading | in_progress | submitting | submitted | error

    // Result
    result: null,

    // Error
    error: null,
  },
  reducers: {
    // Select an answer for the current question
    answerQuestion: (state, { payload }) => {
      const { questionIndex, selectedOption, optionIndex } = payload;
      const keys = ["A", "B", "C", "D"];
      const option =
        selectedOption ||
        (Number.isInteger(optionIndex) ? keys[optionIndex] : undefined);
      if (!option) return;
      // Toggle off if same option clicked again
      if (state.answers[questionIndex] === option) {
        delete state.answers[questionIndex];
      } else {
        state.answers[questionIndex] = option;
      }
    },

    // Toggle flag on a question index
    toggleFlag: (state, { payload: index }) => {
      if (state.flagged.includes(index)) {
        state.flagged = state.flagged.filter((i) => i !== index);
      } else {
        state.flagged.push(index);
      }
    },

    // Navigate to question
    setCurrentIndex: (state, { payload: index }) => {
      state.currentIndex = index;
    },

    // Tick the countdown timer
    tickTimer: (state) => {
      if (state.timeRemaining > 0) {
        state.timeRemaining -= 1;
      }
    },

    // Clear exam state (e.g. on exit)
    resetExam: () => ({
      examId: null, attemptId: null, startTime: null,
      questions: [], answers: {}, flagged: [], currentIndex: 0,
      timeRemaining: 0, status: "idle", result: null, error: null,
    }),
  },

  extraReducers: (builder) => {
    // ── loadExam ──────────────────────────────────────────────────────────────
    builder
      .addCase(loadExam.pending, (state) => {
        state.status = "loading";
        state.error  = null;
      })
      .addCase(loadExam.fulfilled, (state, { payload }) => {
        state.examId        = payload.examId;
        state.attemptId     = payload.attemptId;
        state.questions     = payload.questions;
        state.timeRemaining = payload.duration * 60; // minutes → seconds
        state.startTime     = Date.now();
        state.answers       = {};
        state.flagged       = [];
        state.currentIndex  = 0;
        state.result        = null;
        state.status        = "in_progress";
      })
      .addCase(loadExam.rejected, (state, { payload }) => {
        state.status = "error";
        state.error  = payload;
      });

    // ── submitExam ────────────────────────────────────────────────────────────
    builder
      .addCase(submitExam.pending, (state) => {
        state.status = "submitting";
        state.error  = null;
      })
      // .addCase(submitExam.fulfilled, (state, { payload }) => {
      //   state.status = "submitted";
      //   const attempt = payload.attempt || payload.data || payload;
      //   state.result = {
      //     attemptId:        attempt.attemptId || attempt._id,
      //     score:            attempt.score            ?? 0,
      //     totalMarks:       attempt.totalMarks        ?? state.questions.length,
      //     correct:          attempt.correct           ?? 0,
      //     incorrect:        attempt.incorrect         ?? 0,
      //     skipped:          attempt.skipped           ?? 0,
      //     accuracy:         attempt.accuracy          ?? 0,
      //     timeTaken:        attempt.timeTaken         ?? 0,
      //     sectionBreakdown: attempt.sectionWiseAnalysis || attempt.sectionBreakdown || [],
      //     aiReview:         attempt.aiReview          || null,
      //   };
      // })
      .addCase(submitExam.fulfilled, (state, { payload }) => {
  state.status = "submitted";
  const attempt = payload.attempt || payload.data || payload;
  // Replace questions with graded versions that include correctOption
  if (payload.gradedQuestions?.length) {
    state.questions = payload.gradedQuestions.map(q => ({
      _id:          q._id,
      subject:      q.subject,
      questionText: q.questionText?.en || q.questionText,
      text_en:      q.questionText?.en,
      text_ta:      q.questionText?.ta,
      correctOption: q.correctOption,
      explanation:   q.explanation?.en || q.explanation,
      explanation_ta: q.explanation?.ta,
      options: (q.options || []).map(o => ({
        key:     o.key,
        text:    o.text?.en || o.text,
        text_en: o.text?.en,
        text_ta: o.text?.ta,
      })),
    }));
  }
  state.result = {
    attemptId:        attempt.attemptId || attempt._id,
    score:            attempt.score            ?? 0,
    totalMarks:       attempt.totalMarks        ?? state.questions.length,
    correct:          attempt.correct           ?? 0,
    incorrect:        attempt.incorrect         ?? 0,
    skipped:          attempt.skipped           ?? 0,
    accuracy:         attempt.accuracy          ?? 0,
    timeTaken:        attempt.timeTaken         ?? 0,
    sectionBreakdown: attempt.sectionWiseAnalysis || attempt.sectionBreakdown || [],
    aiReview:         attempt.aiReview          || null,
  };
})
      .addCase(submitExam.rejected, (state, { payload }) => {
        state.status = "error";
        state.error  = payload;
      });
  },
});

export const {
  answerQuestion,
  toggleFlag,
  setCurrentIndex,
  tickTimer,
  resetExam,
} = examSlice.actions;

export default examSlice.reducer;
