// ════════════════════════════════════════════════════════════════════════════
// examSlice.js
// ════════════════════════════════════════════════════════════════════════════
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const startExam = createAsyncThunk('exam/start', async (examId, { rejectWithValue }) => {
  try {
    const { data } = await api.post(`/tests/${examId}/start`);
    return data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const submitExam = createAsyncThunk('exam/submit', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post(`/tests/${payload.examId}/submit`, payload);
    return data.attempt;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const examSlice = createSlice({
  name: 'exam',
  initialState: {
    currentExam:    null,
    currentAttempt: null,
    questions:      [],
    answers:        {},   // { questionId: { selectedOption, timeTaken, isFlagged } }
    flagged:        {},   // { questionId: bool }
    currentIndex:   0,
    timeRemaining:  0,
    status:         'idle', // idle | loading | active | submitting | completed
    result:         null,
    error:          null,
  },
  reducers: {
    answerQuestion(state, { payload: { questionId, selectedOption } }) {
      state.answers[questionId] = { ...(state.answers[questionId] || {}), selectedOption };
    },
    toggleFlag(state, { payload: questionId }) {
      state.flagged[questionId] = !state.flagged[questionId];
    },
    navigateTo(state, { payload: index }) {
      state.currentIndex = index;
    },
    tick(state) {
      if (state.timeRemaining > 0) state.timeRemaining--;
    },
    resetExam(state) {
      Object.assign(state, examSlice.getInitialState());
    },
  },
  extraReducers: (b) => {
    b.addCase(startExam.pending,  (s) => { s.status = 'loading'; })
     .addCase(startExam.fulfilled, (s, a) => {
       s.status        = 'active';
       s.currentAttempt = a.payload.attempt;
       s.questions      = a.payload.questions;
       s.timeRemaining  = (a.payload.duration || 60) * 60;
     })
     .addCase(startExam.rejected, (s, a) => { s.status = 'idle'; s.error = a.payload; })
     .addCase(submitExam.pending,   (s) => { s.status = 'submitting'; })
     .addCase(submitExam.fulfilled, (s, a) => { s.status = 'completed'; s.result = a.payload; })
     .addCase(submitExam.rejected,  (s, a) => { s.status = 'active'; s.error = a.payload; });
  },
});

export const { answerQuestion, toggleFlag, navigateTo, tick, resetExam } = examSlice.actions;
export const setCurrentIndex = navigateTo;
export const tickTimer = tick;
export const loadExam = startExam;
export default examSlice.reducer;
