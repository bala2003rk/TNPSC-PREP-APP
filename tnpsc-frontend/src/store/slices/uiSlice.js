import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    lang: typeof window !== 'undefined' ? localStorage.getItem('lang') || 'en' : 'en',
    sidebarOpen: false,
    toasts: [],
  },
  reducers: {
    toggleLang(state) {
      state.lang = state.lang === 'en' ? 'ta' : 'en';
      localStorage.setItem('lang', state.lang);
    },
    setLang(state, { payload }) {
      state.lang = payload;
      localStorage.setItem('lang', payload);
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    addToast(state, { payload }) {
      state.toasts.push({ id: Date.now(), ...payload });
    },
    removeToast(state, { payload: id }) {
      state.toasts = state.toasts.filter((toast) => toast.id !== id);
    },
  },
});

export const { toggleLang, setLang, toggleSidebar, addToast, removeToast } = uiSlice.actions;
export default uiSlice.reducer;
