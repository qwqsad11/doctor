import api from './api';
import type {
  Paginated,
  Patient,
  Emr,
  Consultation,
  Conference,
  HealthRecord,
  SocialPost,
  AuditLog,
  TempPermission,
  UserProfile,
} from './types';

// 各业务模块的 API 封装，统一返回 data（后端响应为 { list, total, page, pageSize }）

export const patientsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<Patient>>('/patients', { params }).then((r) => r.data),
  detail: (id: string) => api.get<Patient>(`/patients/${id}`).then((r) => r.data),
  create: (data: Partial<Patient>) =>
    api.post<Patient>('/patients', data).then((r) => r.data),
  update: (id: string, data: Partial<Patient>) =>
    api.patch<Patient>(`/patients/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/patients/${id}`).then((r) => r.data),
};

export const emrApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<Emr>>('/emr', { params }).then((r) => r.data),
  detail: (id: string) => api.get<Emr>(`/emr/${id}`).then((r) => r.data),
  create: (data: Partial<Emr>) => api.post<Emr>('/emr', data).then((r) => r.data),
  update: (id: string, data: Partial<Emr>) =>
    api.patch<Emr>(`/emr/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/emr/${id}`).then((r) => r.data),
};

export const consultationsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<Consultation>>('/consultations', { params }).then((r) => r.data),
  detail: (id: string) =>
    api.get<Consultation>(`/consultations/${id}`).then((r) => r.data),
  create: (data: Partial<Consultation>) =>
    api.post<Consultation>('/consultations', data).then((r) => r.data),
  update: (id: string, data: Partial<Consultation>) =>
    api.patch<Consultation>(`/consultations/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/consultations/${id}`).then((r) => r.data),
};

export const conferencesApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<Conference>>('/conferences', { params }).then((r) => r.data),
  detail: (id: string) =>
    api.get<Conference>(`/conferences/${id}`).then((r) => r.data),
  create: (data: Partial<Conference>) =>
    api.post<Conference>('/conferences', data).then((r) => r.data),
  update: (id: string, data: Partial<Conference>) =>
    api.patch<Conference>(`/conferences/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/conferences/${id}`).then((r) => r.data),
};

export const healthApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<HealthRecord>>('/health', { params }).then((r) => r.data),
  detail: (id: string) =>
    api.get<HealthRecord>(`/health/${id}`).then((r) => r.data),
  create: (data: Partial<HealthRecord>) =>
    api.post<HealthRecord>('/health', data).then((r) => r.data),
  update: (id: string, data: Partial<HealthRecord>) =>
    api.patch<HealthRecord>(`/health/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/health/${id}`).then((r) => r.data),
};

export const socialApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<SocialPost>>('/social/posts', { params }).then((r) => r.data),
  create: (data: Partial<SocialPost>) =>
    api.post<SocialPost>('/social/posts', data).then((r) => r.data),
  like: (id: string) =>
    api.post<SocialPost>(`/social/posts/${id}/like`).then((r) => r.data),
  remove: (id: string) => api.delete(`/social/posts/${id}`).then((r) => r.data),
};

export const auditApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Paginated<AuditLog>>('/audit', { params }).then((r) => r.data),
};

export const usersApi = {
  getMe: () => api.get<UserProfile>('/users/me').then((r) => r.data),
  updateMe: (data: Partial<UserProfile>) =>
    api.patch<UserProfile>('/users/me', data).then((r) => r.data),
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/users/me/password', data).then((r) => r.data),
  uploadAvatar: (formData: FormData) =>
    api.post<UserProfile>('/users/me/avatar', formData).then((r) => r.data),
  list: () => api.get<UserProfile[]>('/users/admin/users').then((r) => r.data),
  setRoles: (id: string, roles: string[]) =>
    api.patch<UserProfile>(`/users/admin/users/${id}/roles`, { roles }).then((r) => r.data),
  listTempPermissions: () => api.get<TempPermission[]>('/users/admin/temp-permissions').then((r) => r.data),
  createTempPermission: (data: Omit<TempPermission, 'id' | 'grantedAt' | 'revokedAt'>) =>
    api.post<TempPermission>('/users/admin/temp-permissions', data).then((r) => r.data),
  revokeTempPermission: (id: string) => api.delete(`/users/admin/temp-permissions/${id}`).then((r) => r.data),
};
