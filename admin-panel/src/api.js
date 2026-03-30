import axios from 'axios';

const LOCAL_DEV_API_BASE_URL = 'http://localhost:3011';

function defaultApiBaseUrl() {
  // If the admin UI is served by the backend (e.g. http://host:3011/admin), use same-origin.
  // If it's served by the Vite dev server (e.g. :3012), default to the same hostname on :3011.
  try {
    if (typeof window === 'undefined' || !window.location) return LOCAL_DEV_API_BASE_URL;
    const { hostname, port, protocol } = window.location;
    if (port === '3011' || port === '' || port == null) return '';
    if (hostname === 'localhost' || hostname === '127.0.0.1') return LOCAL_DEV_API_BASE_URL;
    const scheme = protocol === 'https:' ? 'https:' : 'http:';
    return `${scheme}//${hostname}:3011`;
  } catch {
    return LOCAL_DEV_API_BASE_URL;
  }
}

const API_BASE_URL =
  (typeof __API_BASE_URL__ !== 'undefined' && __API_BASE_URL__) ||
  import.meta.env.VITE_API_BASE_URL ||
  defaultApiBaseUrl();

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
      // If the admin UI is served by the backend under `/admin`, keep users in that app.
      // Redirecting to `/` would land on the API root JSON, which looks like a broken page.
      try {
        const path = window.location?.pathname || '/';
        window.location.href = path.startsWith('/admin') ? '/admin/' : '/';
      } catch {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export const adminAuthAPI = {
  login: (email, password) =>
    api.post('/api/admin/auth/login', { email, password }),
  requestPasswordReset: (email) =>
    api.post('/api/admin/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) =>
    api.post('/api/admin/auth/reset-password', { token, newPassword })
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
    api.post(`/api/admin/users/${userId}/email-verify`),
  setRole: (userId, role) =>
    api.post(`/api/admin/users/${userId}/role`, { role }),
  resetPassword: (userId, newPassword) =>
    api.post('/api/admin/users/reset-password', { userId, newPassword })
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
