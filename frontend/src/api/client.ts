/**
 * Axios client configuration.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const MARKET_STORAGE_KEY = 'selectedMarketId';
const DEFAULT_MARKET_ID = 'insurance_il';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Prevent browser caching
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// Get current market ID from localStorage
function getCurrentMarketId(): string {
  return localStorage.getItem(MARKET_STORAGE_KEY) || DEFAULT_MARKET_ID;
}

// Add market_id and timestamp to requests
apiClient.interceptors.request.use((config) => {
  // Add market_id to all requests (header method for middleware)
  const marketId = getCurrentMarketId();
  config.headers['X-Market-ID'] = marketId;

  // Also add as query param for explicit filtering (except for /markets endpoint)
  if (!config.url?.startsWith('/markets')) {
    config.params = {
      ...config.params,
      market_id: marketId,
    };
  }

  // Add timestamp to GET requests to bust cache
  if (config.method === 'get') {
    config.params = {
      ...config.params,
      _t: Date.now(),
    };
  }

  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
