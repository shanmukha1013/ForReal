import axios from "axios";

// ─── Environment & Configuration ─────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://forreal-uotb.onrender.com/api";
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 400;

// Status codes that should NEVER trigger an automatic retry
const NO_RETRY_STATUSES = new Set([400, 401, 403, 404, 409, 422, 429]);

// ─── Core Axios Instances ──────────────────────────────────────────────────
/**
 * Main API Client
 * Used for all standard application requests. Interceptors attached.
 */
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Crucial for sending/receiving HttpOnly cookies (refresh tokens)
  timeout: TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/**
 * Raw API Client (Bypass Interceptors)
 * Used STRICTLY for token refreshing to prevent infinite 401 retry loops.
 */
const rawApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 5000,
});

// ─── Mutex Token Refresh State ─────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue = [];

/**
 * Pushes failed requests into a queue while the token is refreshing.
 */
function enqueueRefreshWaiter() {
  return new Promise((resolve, reject) => {
    refreshQueue.push({ resolve, reject });
  });
}

/**
 * Resolves or rejects all paused requests once refresh succeeds or fails.
 */
function flushRefreshQueue(error = null) {
  const queue = refreshQueue;
  refreshQueue = []; // Clear queue immediately to prevent double-flushing
  queue.forEach((waiter) => (error ? waiter.reject(error) : waiter.resolve()));
}

/**
 * Handles the actual refresh logic using the RAW client.
 */
import { storageCache } from '../lib/storageCache.js';
import { authenticateSocket } from '../realtime/socket.js';

async function attemptTokenRefresh() {
  if (isRefreshing) {return enqueueRefreshWaiter();}

  isRefreshing = true;
  try {
    // Relying on HttpOnly cookies sent via withCredentials
    const resp = await rawApi.post('/auth/refresh');
    // If server returned a new token in body, update cache and socket auth
    const newToken = resp?.data?.token ?? resp?.token ?? null;
    if (newToken) {
      try {
        storageCache.setAccessToken(newToken);
        authenticateSocket(newToken);
      } catch (e) {
        console.warn('[API] Failed to apply refreshed token locally', e);
      }
    }
    flushRefreshQueue(null);
  } catch (err) {
    flushRefreshQueue(err);
    throw err;
  } finally {
    isRefreshing = false;
  }
}

// ─── Retry & Utility Logic ─────────────────────────────────────────────────
function shouldRetry(error, retryCount) {
  if (retryCount >= MAX_RETRIES) {return false;}
  // Always retry on network errors (user drove through a tunnel) or timeouts
  if (!error.response || error.code === 'ECONNABORTED') {return true;} 
  if (NO_RETRY_STATUSES.has(error.response.status)) {return false;}
  if (error.response.status >= 500) {return true;} // Retry Server Errors (502 Bad Gateway, etc)
  return false;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Request Interceptor ───────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Inject request timestamp for latency tracking
    config.metadata = { startTime: Date.now() };

    // Enterprise Dev Logging - Groups requests for a clean console
    if (import.meta.env.DEV) {
      console.log(
        `%c[API Request] ↑ ${config.method?.toUpperCase()} ${config.url}`,
        "color: #34d399; font-weight: bold;" // Emerald color
      );
    }

    // Attach short-lived access token dynamically for protected routes
    const token = localStorage.getItem('forreal_access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(normalizeError(error))
);

// ─── Response Interceptor ──────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      const ms = Date.now() - (response.config.metadata?.startTime ?? 0);
      console.log(
        `%c[API Success] ↓ ${response.config.method?.toUpperCase()} ${response.config.url} (${ms}ms)`,
        "color: #10b981; font-weight: bold;"
      );
    }
    
    // Unwrap the response. 
    // This allows components to do `const user = await api.get('/me')` instead of `const { data } = ...`
    return response.data;
  },
  async (error) => {
    const config = error.config;
    const status = error.response?.status;
    const retryCount = config?._retryCount ?? 0;

    // ── 1. Handle 401 Unauthorized (Token Refresh) ─────────────────────────
    if (status === 401 && !config?._isRefreshRequest) {
      config._isRefreshRequest = true; // Mark to prevent loop
      
      try {
        await attemptTokenRefresh();
        // The cookie is updated by the browser. Just replay the original request.
        const newToken = localStorage.getItem('forreal_access_token');
        if (newToken) {
          config.headers['Authorization'] = `Bearer ${newToken}`;
        }
        return api(config);
      } catch (refreshError) {
        // Refresh completely failed (session truly expired)
        if (import.meta.env.DEV) {console.error("[API] Session expired. Forcing logout.");}
        
        // Dispatch event so Zustand/Context can clear user state and redirect
        window.dispatchEvent(new CustomEvent("forreal:auth:expired"));
        return Promise.reject(normalizeError(refreshError));
      }
    }

    // ── 2. Handle Exponential Backoff Retries ──────────────────────────────
    if (config && shouldRetry(error, retryCount)) {
      config._retryCount = retryCount + 1;
      const backoff = RETRY_DELAY_MS * (2 ** retryCount); // 400ms, 800ms, 1600ms

      if (import.meta.env.DEV) {
        console.warn(
          `[API] Retrying ${config.url} (${config._retryCount}/${MAX_RETRIES}) in ${backoff}ms...`
        );
      }

      await delay(backoff);
      return api(config);
    }

    // ── 3. Global Error Event (e.g., Rate Limits) ──────────────────────────
    if (status === 429) {
      window.dispatchEvent(new CustomEvent("forreal:toast", {
        detail: { type: 'error', message: "You're doing that too fast. Slow down." }
      }));
    }

    // Log failures cleanly in dev
    if (import.meta.env.DEV) {
      const ms = Date.now() - (config?.metadata?.startTime ?? 0);
      console.error(
        `%c[API Failed] ✕ ${config?.method?.toUpperCase()} ${config?.url} (${status || 'NETWORK_ERR'}) - ${ms}ms`,
        "color: #ef4444; font-weight: bold;",
        error.response?.data || error.message
      );
    }

    return Promise.reject(normalizeError(error));
  }
);

// ─── Error Normalizer ──────────────────────────────────────────────────────
/**
 * Standardizes errors so the UI doesn't crash trying to read undefined properties.
 */
function normalizeError(error) {
  if (axios.isCancel(error)) {
    return { type: "CANCELLED", message: "Request was cancelled.", raw: error };
  }

  // Network offline, CORS failure, or severe timeout
  if (!error.response) {
    return {
      type: "NETWORK_ERROR",
      message: "Unable to reach the server. Check your connection.",
      raw: error,
    };
  }

  const { status, data } = error.response;

  const typeMap = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    500: "SERVER_ERROR",
    502: "BAD_GATEWAY",
    503: "SERVICE_UNAVAILABLE",
  };

  return {
    type: typeMap[status] ?? "UNKNOWN_ERROR",
    status,
    message: data?.message ?? data?.error ?? "An unexpected error occurred.",
    errors: data?.errors ?? null, // Great for passing field-level form validation errors
    raw: error,
  };
}

// ─── Cancel Token Factory (AbortController) ────────────────────────────────
/**
 * Modern way to cancel requests (prevents race conditions in search bars / rapid navigation)
 * Usage: const { signal, cancel } = createCancelToken();
 */
export function createCancelToken() {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: (reason) => controller.abort(reason),
  };
}

// ─── Typed Request Helpers ─────────────────────────────────────────────────
export const forrealApi = {
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  patch: (url, data, config) => api.patch(url, data, config),
  delete: (url, config) => api.delete(url, config),

  // Enterprise Multipart Upload (Avatars, Videos)
  upload: (url, formData, onProgress, cancelSignal = null) =>
    api.post(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      signal: cancelSignal,
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          const percentCompleted = Math.round((e.loaded * 100) / e.total);
          onProgress(percentCompleted);
        }
      },
    }),
};

export { normalizeError };
export default api;