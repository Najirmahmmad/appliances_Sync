import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiClient } from "../../admin/api/apiClient";
import { buildQueryString } from "../../admin/api/helper";

// --- Async Thunk for API Call ---
export const addUserLocation = createAsyncThunk(
  "location/addUserLocation",
  async (payload, { rejectWithValue }) => {
    // Destructure inside the body
    const { params, data } = payload;

    try {
      const queryString = buildQueryString(params);
      const url = `v1/userlocation${queryString}`;

      const response = await apiClient.create(url, data);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to sync location";
      return rejectWithValue(message);
    }
  },
);
export const getLocation = createAsyncThunk(
  "getLocation",
  async (data, { rejectWithValue }) => {
    try {
      const response = await apiClient.get(`v1/userlocation`, data);
      return response?.data;
    } catch (error) {
      errorMiddleware(error);
    }
  },
);

// --- Slice Definition ---
const locationSlice = createSlice({
  name: "location",
  initialState: {
    loading: false,
    error: null,
    lastSyncTimestamp: null,
    success: false,
    userLocationData: [],
    getLocationLoading: false,
  },
  reducers: {
    resetLocationState: (state) => {
      state.error = null;
      state.success = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle Pending
      .addCase(addUserLocation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // Handle Success
      .addCase(addUserLocation.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        // state.lastSyncTimestamp = new Date().toISOString();
      })
      // Handle Failure
      .addCase(addUserLocation.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload;
      });

    // get location
    builder.addCase(getLocation.pending, (state, action) => {
      state.getLocationLoading = true;
    });
    builder.addCase(getLocation.rejected, (state, action) => {
      state.getLocationLoading = false;
      state.userLocationData = [];

      state.error = action.error.message;
    });
    builder.addCase(getLocation.fulfilled, (state, action) => {
      state.getLocationLoading = false;
      state.error = null;
      state.userLocationData = action?.payload;
    });
  },
});

export const { resetLocationState } = locationSlice.actions;
export default locationSlice.reducer;
