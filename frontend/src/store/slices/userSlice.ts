import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UserProfile } from '@/services/types';

interface UserState {
  id: string | null;
  username: string | null;
  email: string | null;
  roles: string[];
  avatar: string | null;
  real_name: string | null;
}

const initialState: UserState = {
  id: null,
  username: null,
  email: null,
  roles: [],
  avatar: null,
  real_name: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<UserProfile>) {
      state.id = action.payload.id;
      state.username = action.payload.username;
      state.email = action.payload.email;
      state.roles = action.payload.roles;
      state.avatar = action.payload.avatar;
      state.real_name = action.payload.real_name;
    },
    clearUser(state) {
      state.id = null;
      state.username = null;
      state.email = null;
      state.roles = [];
      state.avatar = null;
      state.real_name = null;
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
