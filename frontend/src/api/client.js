import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // sends session cookies if available
});

// Interceptor to inject Token or Demo user headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  const user = localStorage.getItem('auth_user');

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
    config.headers['X-Auth-Token'] = token;
  }
  if (user) {
    try {
      const parsed = JSON.parse(user);
      if (parsed.username) {
        config.headers['X-Demo-User'] = parsed.username;
      }
    } catch (e) {
      // ignore
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
