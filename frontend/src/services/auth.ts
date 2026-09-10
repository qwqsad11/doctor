import api from './api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    email: string;
    roles: string[];
  };
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
   * 注册
   */
  register: async (data: any) => {
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
