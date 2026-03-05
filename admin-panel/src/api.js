import axios from 'axios';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3011';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const adminAuthAPI = {
  login: (email, password) =>
    api.post('/api/admin/auth/login', { email, password })
};

export const adminQueueAPI = {
  get: (status = '', limit = 100, offset = 0) =>
    api.get('/api/admin/queue', { params: { limit, offset, status } }),
  bulkAction: (ids, action, assigned_admin = '', reason = '') =>
    api.post('/api/admin/queue/bulk-action', { ids, action, assigned_admin, reason })
};

export const adminContentAPI = {
  get: (limit = 2000, offset = 0) =>
    api.get('/api/admin/content', { params: { limit, offset } }),
  update: (id, updates) =>
    api.put(`/api/admin/content/${id}`, updates),
  delete: (id) =>
    api.delete(`/api/admin/content/${id}`)
};

export const adminUsersAPI = {
  get: (search = '', limit = 100, offset = 0) =>
    api.get('/api/admin/users', { params: { limit, offset, search } }),
  suspend: (userId, reason = '') =>
    api.post(`/api/admin/users/${userId}/suspend`, { reason }),
  reactivate: (userId) =>
    api.post(`/api/admin/users/${userId}/reactivate`),
  verify: (userId) =>
    api.post(`/api/admin/users/${userId}/verify`),
  resetPassword: (userId, newPassword) =>
    api.post(`/api/admin/users/${userId}/reset-password`, { newPassword })
};

export const adminAuditAPI = {
  get: (limit = 100, offset = 0) =>
    api.get('/api/admin/audit', { params: { limit, offset } }),
  export: () =>
    api.get('/api/admin/audit/export', { responseType: 'blob' })
};

export const adminAnalyticsAPI = {
  get: () =>
    api.get('/api/admin/analytics')
};

export const adminAlertsAPI = {
  get: () =>
    api.get('/api/admin/alerts')
};

export default api;
