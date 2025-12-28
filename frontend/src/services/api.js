/**
 * API Service
 * Handles all API communication with backend
 */

import axios from 'axios';

const API_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/updatedetails', data),
  updatePassword: (data) => api.put('/auth/updatepassword', data)
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getDrivers: () => api.get('/users/drivers'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getDrivers: () => api.get('/users/drivers')
};

// Routes API
export const routesAPI = {
  getAll: (params) => api.get('/routes', { params }),
  getById: (id) => api.get(`/routes/${id}`),
  create: (data) => api.post('/routes', data),
  update: (id, data) => api.put(`/routes/${id}`, data),
  delete: (id) => api.delete(`/routes/${id}`),
  optimize: (data) => api.post('/routes/optimize', data),
  start: (id) => api.post(`/routes/${id}/start`),
  complete: (id) => api.post(`/routes/${id}/complete`),
  getDirections: (id, data) => api.post(`/routes/${id}/directions`, data),
  getUpdates: (id) => api.get(`/routes/${id}/updates`),
  reoptimize: (id) => api.post(`/routes/${id}/reoptimize`)
};

// Deliveries API
export const deliveriesAPI = {
  getAll: (params) => api.get('/deliveries', { params }),
  getById: (id) => api.get(`/deliveries/${id}`),
  create: (data) => api.post('/deliveries', data),
  createBulk: (data) => api.post('/deliveries/bulk', data),
  update: (id, data) => api.put(`/deliveries/${id}`, data),
  delete: (id) => api.delete(`/deliveries/${id}`),
  track: (trackingNumber) => api.get(`/deliveries/track/${trackingNumber}`),
  markDelivered: (id, data) => api.post(`/deliveries/${id}/deliver`, data),
  markFailed: (id, data) => api.post(`/deliveries/${id}/fail`, data),
  getUnassigned: () => api.get('/deliveries/unassigned'),
  getStats: () => api.get('/deliveries/stats')
};

// Analytics API
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getRouteAnalytics: (params) => api.get('/analytics/routes', { params }),
  getDeliveryAnalytics: (params) => api.get('/analytics/deliveries', { params }),
  getDriverAnalytics: (params) => api.get('/analytics/drivers', { params }),
  getCostAnalytics: (params) => api.get('/analytics/costs', { params })
};

// Export API
export const exportAPI = {
  routePDF: (id) => api.get(`/export/routes/${id}/pdf`, { responseType: 'blob' }),
  routeCSV: (id) => api.get(`/export/routes/${id}/csv`, { responseType: 'blob' }),
  routeICal: (id) => api.get(`/export/routes/${id}/ical`, { responseType: 'blob' }),
  deliveriesCSV: (params) => api.get('/export/deliveries/csv', { params, responseType: 'blob' })
};

export default api;
