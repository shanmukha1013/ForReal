// =============================================================================
// Auth API Service � Production MongoDB Backend Integration
// =============================================================================
// Communicates with Express + MongoDB backend for real authentication.
// Maintains session persistence across browser refreshes.
// =============================================================================

import api from './axios.js';

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
    
    // Backend should set/update HttpOnly session cookies.
    // If it also returns a token/user payload, we still keep it in memory only.
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
    
    return { token, user, refreshToken };
  } catch (error) {
    throw normalizeAuthError(error);
  }
}

// -------------------------------------------------------------------------
// Token Verification � Validate and retrieve user from backend
// -------------------------------------------------------------------------
export async function verifyToken(token) {
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    // Cookie-based: backend should infer session from HttpOnly cookies.
    const response = await api.get('/auth/me');
    return response.user;
  } catch (error) {
    clearAuthStorage();
    throw normalizeAuthError(error);
  }
}

// -------------------------------------------------------------------------
// Token Refresh � Get new token from backend
// -------------------------------------------------------------------------
export async function refreshToken(oldToken) {
  if (!oldToken) {
    throw new Error('No token to refresh');
  }

  try {
    const response = await api.post('/auth/refresh');
    // Some backends return { token } but session is cookie-managed.
    return response.token ?? null;
  } catch (error) {
    clearAuthStorage();
    throw normalizeAuthError(error);
  }
}

// -------------------------------------------------------------------------
// Logout � Clear session and redirect
// -------------------------------------------------------------------------
export async function logoutApi() {
  clearAuthStorage();
  // Optionally notify backend to invalidate token
  try {
    await api.post('/auth/logout');
  } catch {
    // Ignore logout errors
  }
}

// -------------------------------------------------------------------------
// Session Management Helpers
// -------------------------------------------------------------------------

export function clearAuthStorage() {
  // No local persistence for auth.
}

export function getStoredToken() {
  return null;
}

export function getCachedUser() {
  return null;
}

export function isAuthenticated() {
  // Prefer real backend check.
  return false;
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
