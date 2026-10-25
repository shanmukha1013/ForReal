import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

let accessToken = null;
const tokenListeners = new Set();

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token;
  tokenListeners.forEach((listener) => listener(token));
};

export const onAccessTokenChange = (listener) => {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
};

// Errors thrown by the client always carry a readable message and the HTTP
// status (0 for network failures).
export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const api = axios.create({
  baseURL,
  withCredentials: true, // sends the httpOnly refresh cookie
  timeout: 45000, // free-tier hosts can take a while to wake up
});

// Refresh requests are deduplicated: concurrent 401s (or React StrictMode's
// double effects) share one in-flight refresh instead of racing each other,
// which previously revoked the session.
let refreshPromise = null;

export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post('/auth/refresh', {}, { baseURL, withCredentials: true, timeout: 45000 })
      .then((res) => {
        const token = res.data?.data?.accessToken;
        if (!token) throw new ApiError('Session expired. Please sign in again.', 401);
        setAccessToken(token);
        return token;
      })
      .catch((error) => {
        setAccessToken(null);
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const NO_REFRESH_PATHS = ['/auth/refresh', '/auth/login', '/auth/register', '/auth/logout'];

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status || 0;

    if (status === 401 && !original._retry && !NO_REFRESH_PATHS.includes(original.url)) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api(original);
      } catch {
        // The session is gone: let the app clear its state (no network call).
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(new ApiError('Your session expired. Please sign in again.', 401));
      }
    }

    let message = error.response?.data?.message;
    if (!message) {
      if (error.code === 'ECONNABORTED') message = 'The server took too long to respond. Please try again.';
      else if (!error.response) message = 'Can’t reach ForReal right now. Check your connection and try again.';
      else message = 'Something went wrong. Please try again.';
    }
    return Promise.reject(new ApiError(message, status, error.response?.data));
  }
);

export const apiClient = {
  get: (url, config = {}) => api.get(url, config),
  post: (url, data, config = {}) => api.post(url, data, config),
  put: (url, data, config = {}) => api.put(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),
  patch: (url, data, config = {}) => api.patch(url, data, config),
};

export default apiClient;
