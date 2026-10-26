// ════════════════════════════════════════════════════════════════════════════
// authSlice.js
// ════════════════════════════════════════════════════════════════════════════
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('accessToken',  data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.user;
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Login failed'); }
});

export const registerUser = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('accessToken',  data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.user;
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Registration failed'); }
});

export const firebaseLogin = createAsyncThunk('auth/firebaseLogin', async (idToken, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/firebase', { idToken });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Google sign-in failed');
  }
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data.user;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, loading: false, error: null, isAuthenticated: false },
  reducers: {
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    clearError(state) {
      state.error = null;
    },
    setLanguage(state, { payload }) {
      if (state.user) state.user.languagePreference = payload;
    },
    updateUser(state, { payload }) {
      state.user = { ...(state.user || {}), ...payload };
      state.isAuthenticated = !!state.user;
    },
  },
  extraReducers: (b) => {
    const pending  = (s)    => { s.loading = true;  s.error = null; };
    const rejected = (s, a) => { s.loading = false; s.error = a.payload; };
    const fulfilled = (s, a) => { s.loading = false; s.user = a.payload; s.isAuthenticated = true; };
    b.addCase(loginUser.pending,    pending)
     .addCase(loginUser.fulfilled,  fulfilled)
     .addCase(loginUser.rejected,   rejected)
     .addCase(registerUser.pending, pending)
     .addCase(registerUser.fulfilled, fulfilled)
     .addCase(registerUser.rejected, rejected)
     .addCase(firebaseLogin.pending, pending)
     .addCase(firebaseLogin.fulfilled, fulfilled)
     .addCase(firebaseLogin.rejected, rejected)
     .addCase(fetchMe.pending,  pending)
     .addCase(fetchMe.fulfilled, fulfilled)
     .addCase(fetchMe.rejected, (s) => { s.loading = false; s.user = null; s.isAuthenticated = false; });
  },
});

export const { logout, clearError, setLanguage, updateUser } = authSlice.actions;
export const logoutUser = logout;
export default authSlice.reducer;
