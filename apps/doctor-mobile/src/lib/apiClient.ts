import axios from 'axios';
import { supabase } from './supabaseClient';
import { Logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Centralized Axios API Client for the Breathy Backend
// ---------------------------------------------------------------------------
// This mirrors the web app's `doctorService.js` apiClient but is configured
// for the React Native environment. The interceptor attaches the Supabase
// session JWT to every outgoing request.
// ---------------------------------------------------------------------------

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15s timeout — critical for mobile where connections can be flaky
});

// ---------------------------------------------------------------------------
// Request Interceptor: Securely attach JWT to every request
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  async (config) => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      console.warn('[API Client] No active session found for request.');
      return config;
    }

    config.headers['Authorization'] = `Bearer ${session.access_token}`;
    return config;
  },
  (error) => {
    Logger.error('API request interceptor failed', error, { source: 'apiClient' });
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Response Interceptor: Normalize errors
// ---------------------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => response.data, // Only return the data payload, not the full Axios response
  (error) => {
    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message;

    Logger.error('API request failed', error, {
      source: 'apiClient',
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
    });

    if (error.response?.status === 401) {
      Logger.error('API 401 — Token expired', error, { source: 'apiClient', url: error.config?.url });
    }

    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient;
export { API_BASE_URL };
