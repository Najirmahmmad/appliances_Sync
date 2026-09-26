// src/store/rootReducer.js
import { combineReducers } from "@reduxjs/toolkit";
import userReducer from "./slice/authSlice";
import locationReducer from "./slice/locationSlice"; // Import the location reducer

const rootReducer = combineReducers({
  user: userReducer,
  locationSlice: locationReducer, // Add the location reducer to the root reducer
});

export default rootReducer;
