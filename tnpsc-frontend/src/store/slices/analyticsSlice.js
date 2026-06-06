import { createSlice } from '@reduxjs/toolkit';
const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: { data: null, loading: false, error: null },
  reducers: {},
});
export default analyticsSlice.reducer;