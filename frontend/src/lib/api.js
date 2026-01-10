import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const products = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
};

export const cart = {
  get: (sessionId) => api.get(`/cart/${sessionId}`),
  update: (sessionId, items) => api.post(`/cart/${sessionId}`, items),
};

export const coupons = {
  validate: (code) => api.get(`/coupons/validate/${code}`),
};

export const orders = {
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
};

export const payments = {
  process: (data) => api.post('/payments/process', data),
  getConfig: () => api.get('/payments/config'),
};

export const seed = {
  run: () => api.post('/seed'),
};

export default api;