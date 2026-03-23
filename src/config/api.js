import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend: run  php -S 0.0.0.0:8000  inside the /backend folder
// Web (same machine):  http://localhost:8000/
// Physical device / Expo Go on phone: use your machine's LAN IP (ipconfig), e.g. http://192.168.0.31:8000/
export const API_BASE_URL = 'http://192.168.0.31:8000/'; // default fallback

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Add request interceptor for auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');

    if (token) {
      config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const cfg = (error && error.config) ? error.config : {};
    const rsp = (error && error.response) ? error.response : null;
    const req = (error && error.request) ? error.request : null;
    const requestUrl = String(cfg.baseURL || api.defaults.baseURL || '') + String(cfg.url || '');

    if (rsp) {
      // Server responded with an error status code
      console.error('API Error Details:', {
        status: rsp.status,
        statusText: rsp.statusText,
        url: requestUrl,
        method: cfg.method,
        responseData: rsp.data,
      });
    } else if (req) {
      // Request sent but no response received
      console.error('Network Error Details:', {
        code: error && error.code,
        message: error && error.message,
        url: requestUrl,
        method: cfg.method,
        timeoutMs: cfg.timeout,
      });
    }

    return Promise.reject(error);
  }
);

export default api;
