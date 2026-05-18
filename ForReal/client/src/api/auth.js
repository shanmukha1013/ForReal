// =============================================================================
// Auth API Service � Production MongoDB Backend Integration
// =============================================================================
// Communicates with Express + MongoDB backend for real authentication.
// Maintains session persistence across browser refreshes.
// =============================================================================

import api from './axios.js';
import { storageCache } from '../lib/storageCache';
import { disconnectSocket } from '../realtime/socket.js';

// Cookie-based auth: no token persistence in localStorage.
// Backend should manage HttpOnly cookies for access/refresh lifecycles.


// -------------------------------------------------------------------------
// Login � Authenticate with backend
// -------------------------------------------------------------------------
export async function loginApi(username, password) {
  if (!username?.trim() || !password?.trim()) {
    throw new Error('Username and password required');
  }

  try {
    const response = await api.post('/auth/login', {
      identifier: username,
      password,
    });
    
    const { token, user, refreshToken } = response;
    
    if (token) {
      storageCache.setAccessToken(token);
    }
    if (user) {
      storageCache.setUser(user);
    }
    return { token, user, refreshToken };
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

// -------------------------------------------------------------------------
// Signup � Create new user account via backend
// -------------------------------------------------------------------------
export async function signupApi(username, email, password, displayName) {
  if (!username?.trim() || !email?.trim() || !password?.trim() || !displayName?.trim()) {
    throw new Error('All fields required');
  }

  if (username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  try {
    const response = await api.post('/auth/register', {
      username: username.trim(),
      email: email.trim(),
      password,
      displayName: displayName.trim(),
    });
    
    const { token, user, refreshToken } = response;
    
    if (token) {
      storageCache.setAccessToken(token);
    }
    if (user) {
      storageCache.setUser(user);
    }
    
    return { token, user, refreshToken };
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

// -------------------------------------------------------------------------
// Token Verification � Validate and retrieve user from backend
// -------------------------------------------------------------------------
export async function verifyToken(/* token - optional for cookie based sessions */) {
  try {
    // Cookie-based: backend should infer session from HttpOnly cookies.
    const response = await api.get('/auth/me');
    // Keep a local copy for fast UI hydration
    if (response?.user) {
      try { storageCache.setUser(response.user); } catch (e) { console.warn('storageCache.setUser failed', e); }
    }
    return response.user;
  } catch (error) {
    // Do not throw a raw error that crashes mount logic - normalize and bubble
    if (error?.status === 401 || error?.type === "UNAUTHORIZED") {
      clearAuthStorage();
    }
    throw normalizeAuthError(error);
  }
}

// -------------------------------------------------------------------------
// Token Refresh � Get new token from backend
// -------------------------------------------------------------------------
export async function refreshToken(/* oldToken - optional */) {
  try {
    const response = await api.post('/auth/refresh');
    const newToken = response?.token ?? null;
    if (newToken) {
      try { storageCache.setAccessToken(newToken); } catch (e) { console.warn('storageCache.setAccessToken failed', e); }
    }
    return newToken;
  } catch (error) {
    if (error?.status === 401 || error?.type === "UNAUTHORIZED" || error?.type === "BAD_REQUEST") {
      clearAuthStorage();
    }
    throw normalizeAuthError(error);
  }
}

// -------------------------------------------------------------------------
// Logout � Clear session and redirect
// -------------------------------------------------------------------------
export async function logoutApi() {
  // Clear local caches first to ensure UI responds instantly
  clearAuthStorage();
  disconnectSocket(true);
  try {
    await api.post('/auth/logout');
  } catch (e) {
    // Ignore logout errors but log for diagnostics
    console.warn('logoutApi error', e);
  }
}

// -------------------------------------------------------------------------
// Session Management Helpers
// -------------------------------------------------------------------------

export function clearAuthStorage() {
  try {
    storageCache.setAccessToken(null);
    storageCache.setUser(null);
  } catch (e) {
    console.warn('clearAuthStorage failed', e);
  }
}

export function getStoredToken() {
  try { return storageCache.getAccessToken(); } catch (e) { console.warn('getStoredToken failed', e); return null; }
}

export function getCachedUser() {
  try { return storageCache.getUser(); } catch (e) { console.warn('getCachedUser failed', e); return null; }
}

export function isAuthenticated() {
  return !!getCachedUser();
}


// -------------------------------------------------------------------------
// Error Normalization
// -------------------------------------------------------------------------
function normalizeAuthError(error) {
  if (error.response?.data?.message) {
    return new Error(error.response.data.message);
  }
  if (error.message) {
    return new Error(error.message);
  }
  return new Error('Authentication failed');
}

export default {
  loginApi,
  signupApi,
  verifyToken,
  refreshToken,
  logoutApi,
  getStoredToken,
  getCachedUser,
  isAuthenticated,
  clearAuthStorage,
};
