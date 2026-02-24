import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend: run  php -S 0.0.0.0:8000  inside the /backend folder
// Web (same machine):  http://localhost:8000/
// Physical device / Expo Go on phone: use your machine's LAN IP (ipconfig), e.g. http://192.168.0.31:8000/
export const API_BASE_URL = 'http://192.168.0.31:8000/'; // <-- change IP when network changes

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
      config.headers.Authorization = `Bearer ${token}`;
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
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
