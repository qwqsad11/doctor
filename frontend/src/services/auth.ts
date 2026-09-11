import api from './api';
import type { UserProfile } from './types';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
  real_name?: string;
}

export interface LoginResponse {
  access_token: string;
  user: UserProfile;
}

export const authService = {
  /**
   * 登录
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  /**
   * 注册（成功后返回 token 与用户信息，自动登录）
   */
  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  /**
   * 刷新 Token
   */
  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  /**
   * 登出
   */
  logout: async () => {
    localStorage.removeItem('token');
  },
};
