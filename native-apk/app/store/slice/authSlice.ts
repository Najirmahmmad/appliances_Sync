import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserState {
  username: string;
  role: "user" | "admin" | null;
  isLoggedIn: boolean;
}

const initialState: UserState = {
  username: "",
  role: null,
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLogin: (
      state,
      action: PayloadAction<{ username: string; role: "user" | "admin" }>,
    ) => {
      state.username = action.payload.username;
      state.role = action.payload.role;
      state.isLoggedIn = true;
    },
    setLogout: (state) => {
      state.username = "";
      state.role = null;
      state.isLoggedIn = false;
    },
  },
});

export const { setLogin, setLogout } = authSlice.actions;
export default authSlice.reducer;
