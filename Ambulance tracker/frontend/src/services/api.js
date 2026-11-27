import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000';

export const USE_MOCK_DATA =
  import.meta.env.VITE_USE_MOCK_DATA !== 'false';

export const TOKEN_STORAGE_KEY = 'smart_ambulance_token';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem(TOKEN_STORAGE_KEY) ||
    sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default api;
