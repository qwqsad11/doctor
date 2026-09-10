import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  id: string | null;
  username: string | null;
  email: string | null;
  roles: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: UserState = {
  id: null,
  username: null,
  email: null,
  roles: [],
  isLoading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(
      state,
      action: PayloadAction<{
        id: string;
        username: string;
        email: string;
        roles: string[];
      }>,
    ) {
      state.id = action.payload.id;
      state.username = action.payload.username;
      state.email = action.payload.email;
      state.roles = action.payload.roles;
    },
    clearUser(state) {
      state.id = null;
      state.username = null;
      state.email = null;
      state.roles = [];
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
