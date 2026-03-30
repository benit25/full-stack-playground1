import axios from 'axios';

const LOCAL_DEV_API_BASE_URL = 'http://localhost:3011';

function defaultApiBaseUrl() {
  // If UI is served by the backend (e.g. http://host:3011/app), use same-origin.
  // If UI is served by a dev server (e.g. :19006 or :3012), default to the same hostname on :3011.
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
  import.meta.env?.VITE_API_BASE_URL ||
  import.meta.env?.VITE_EXPO_PUBLIC_API_BASE_URL ||
  (typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_API_BASE_URL : undefined) ||
  defaultApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
api.interceptors.response.use(
  response => response,
  error => {
    const apiData = error.response?.data || {};
    const message = apiData.message || apiData.error || error.message || 'An error occurred';
    return Promise.reject({ message, status: error.response?.status, data: apiData, error });
  }
);

export const authAPI = {
  signup: (email, password, name, slug) =>
    api.post('/api/auth/signup', { email, password, name, slug }),
  login: (email, password) =>
    api.post('/api/auth/login', { email, password }),
  requestPasswordReset: (email) =>
    api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) =>
    api.post('/api/auth/reset-password', { token, newPassword })
};

export const businessAuthAPI = {
  signup: (email, password, name, slug) =>
    api.post('/api/business/auth/signup', { email, password, name, slug }),
  login: (email, password) =>
    api.post('/api/business/auth/login', { email, password }),
  requestPasswordReset: (email) =>
    api.post('/api/business/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) =>
    api.post('/api/business/auth/reset-password', { token, newPassword })
};

export const creatorAPI = {
  getAll: (limit = 20, offset = 0, search = '') =>
    api.get('/api/creators', { params: { limit, offset, search } }),
  getById: (id) =>
    api.get(`/api/creators/${id}`),
  getBySlug: (slug) =>
    api.get(`/api/creators/slug/${slug}`),
  update: (id, payload) =>
    api.put(`/api/creators/${id}`, payload)
};

export const contentAPI = {
  getAll: (limit = 20, offset = 0, search = '') =>
    api.get('/api/content', { params: { limit, offset, search } }),
  getById: (id) =>
    api.get(`/api/content/${id}`),
  create: (contentType, title, body, mediaUrl) =>
    api.post('/api/content', { content_type: contentType, title, body, media_url: mediaUrl }),
  update: (id, contentType, title, body, mediaUrl, isPublished) =>
    api.put(`/api/content/${id}`, { content_type: contentType, title, body, media_url: mediaUrl, is_published: isPublished }),
  delete: (id) =>
    api.delete(`/api/content/${id}`)
};

export const opportunitiesAPI = {
  getAll: (limit = 20, offset = 0) =>
    api.get('/api/opportunities', { params: { limit, offset } })
};

export const messagesAPI = {
  listConversations: (limit = 50, offset = 0) =>
    api.get('/api/messages/conversations', { params: { limit, offset } }),
  createConversation: (peerUserId) =>
    api.post('/api/messages/conversations', { peerUserId }),
  listMessages: (conversationId, limit = 100, offset = 0) =>
    api.get(`/api/messages/conversations/${conversationId}/messages`, { params: { limit, offset } }),
  sendMessage: (conversationId, body) =>
    api.post(`/api/messages/conversations/${conversationId}/messages`, { body })
};

export default api;
