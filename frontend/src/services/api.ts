/**
 * API Client Configuration
 * 
 * Axios instance with interceptors for authentication and error handling.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, ERROR_MESSAGES } from '@/utils/constants';
import { useAuthStore } from '@/stores/authStore';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { tokens } = useAuthStore.getState();
    
    if (tokens?.idToken) {
      config.headers.Authorization = `Bearer ${tokens.idToken}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const { signOut } = useAuthStore.getState();
    
    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      
      // Unauthorized - token expired or invalid
      if (status === 401) {
        // Sign out and clear state
        signOut();
        
        // Redirect to sign in if not already there
        if (window.location.pathname !== '/signin') {
          window.location.href = '/signin';
        }
        
        return Promise.reject({
          message: ERROR_MESSAGES.unauthorized,
          status: 401,
        });
      }
      
      // Forbidden - access denied
      if (status === 403) {
        return Promise.reject({
          message: 'Access denied. You do not have permission to perform this action.',
          status: 403,
        });
      }
      
      // Not found
      if (status === 404) {
        return Promise.reject({
          message: 'Resource not found.',
          status: 404,
        });
      }
      
      // Quota exceeded
      if (status === 429) {
        return Promise.reject({
          message: ERROR_MESSAGES.quotaExceeded,
          status: 429,
        });
      }
      
      // Server error
      if (status >= 500) {
        return Promise.reject({
          message: ERROR_MESSAGES.serverError,
          status,
        });
      }
      
      // Return API error message if available
      const errorData = error.response.data as { error?: { message?: string; code?: string } } | undefined;
      return Promise.reject({
        message: errorData?.error?.message || error.message,
        code: errorData?.error?.code,
        status,
      });
    }
    
    // Network error
    if (error.request && !error.response) {
      return Promise.reject({
        message: ERROR_MESSAGES.networkError,
        status: 0,
      });
    }
    
    // Other errors
    return Promise.reject({
      message: error.message || 'An unexpected error occurred.',
      status: 0,
    });
  }
);

export default api;
