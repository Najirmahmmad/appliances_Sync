import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// const DEFAULT_URL = 'https://ifberp.cloud/api';
const DEFAULT_URL = 'http://localhost:3002/api';

const rawUrl = process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL;
export const API_BASE_URL = rawUrl.replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('[API Interceptor] Token found:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
      if (config.baseURL && config.url) {
        console.log('[API Interceptor] Request URL:', config.baseURL + config.url);
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('[API Interceptor] No token in AsyncStorage — request will be unauthenticated');
      }
    } catch (e) {
      console.error('Error reading token from storage', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — log 401/403 details and trigger logout
let logoutCallback: (() => void) | null = null;
export const setLogoutCallback = (cb: () => void) => {
  logoutCallback = cb;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(`[API Error] ${error.response.status} on ${error.config?.url}`, error.response.data);
      if (
        error.response.status === 401 ||
        error.response.status === 403 ||
        error.response.data?.message === 'Invalid token.' ||
        error.response.data?.message?.includes('Invalid token') ||
        error.response.data?.message?.includes('token')
      ) {
        if (logoutCallback) logoutCallback();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
