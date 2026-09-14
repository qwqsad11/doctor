import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_APP_API_URL || '/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// 请求拦截器 - 添加 Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isAuthenticationRequest = error.config?.url?.startsWith('/auth/');
    const isAuthenticationPage = ['/login', '/register'].includes(window.location.pathname);

    // Login and MFA failures must remain on the form so the user can correct them.
    if (error.response?.status === 401 && !isAuthenticationRequest && !isAuthenticationPage) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);

export default api;
