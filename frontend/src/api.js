import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3011';

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
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject({ message, status: error.response?.status, error });
  }
);

export const authAPI = {
  signup: (email, password, name, slug) =>
    api.post('/api/auth/signup', { email, password, name, slug }),
  login: (email, password) =>
    api.post('/api/auth/login', { email, password })
};

export const creatorAPI = {
  getAll: (limit = 20, offset = 0, search = '') =>
    api.get('/api/creators', { params: { limit, offset, search } }),
  getById: (id) =>
    api.get(`/api/creators/${id}`),
  getBySlug: (slug) =>
    api.get(`/api/creators/slug/${slug}`)
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

export default api;
