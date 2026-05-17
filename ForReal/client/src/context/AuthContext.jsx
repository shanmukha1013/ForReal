// -----------------------------------------------------------------------------
// AuthContext – Enterprise‑grade Authentication Provider
// -----------------------------------------------------------------------------
// Features:
//   • Token persistence & auto‑login
//   • Loading / error / user states
//   • login, signup, logout actions
//   • Token refresh on interval
//   • useAuth() hook (throws if used outside provider)
//   • useRequireAuth() hook for protected routes (redirects to /auth)
//   • Integration with realtime socket (reset on logout)
//   • Design‑conscious, production‑ready
// -----------------------------------------------------------------------------

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  loginApi,
  signupApi,
  verifyToken,
  refreshToken,
  clearAuthStorage,
  getStoredToken,
  getCachedUser,
} from '../api/auth';
import { authenticateSocket } from '../realtime/socket';
import { storageCache } from '../lib/storageCache';

// Optional: real register endpoint (if present in your API layer)
// import api from '../api/api'; // not used yet

// If your backend has a real /auth/register endpoint and api.auth.register exists,
// wire it here. For this repo snapshot, the mock auth API layer currently exports
// only login/verify/refresh, so we keep signup compatible with that layer.
// If socket.io is used, import socket instance from a central module
// import { socket } from '../socket';

// ─── State shape ─────────────────────────────────────────────
const initialState = {
  user: null,
  token: null,
  loading: true, // true while verifying token on mount
  error: null,
};


// ─── Action types ────────────────────────────────────────────
const AUTH_LOADING   = 'AUTH_LOADING';
const AUTH_SUCCESS   = 'AUTH_SUCCESS';
const AUTH_FAILURE   = 'AUTH_FAILURE';
const AUTH_LOGOUT    = 'AUTH_LOGOUT';
const AUTH_UPDATE    = 'AUTH_UPDATE';   // e.g. after profile edit
const AUTH_REFRESH_TOKEN = 'AUTH_REFRESH_TOKEN';

// ─── Reducer ─────────────────────────────────────────────────
function authReducer(state, action) {
  console.debug('[AuthContext Reducer] action:', action.type, 'payload:', action.payload);
  switch (action.type) {
    case AUTH_LOADING:
      return { ...state, loading: true, error: null };
    case AUTH_SUCCESS:
      const newState_success = {
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };
      if (action.payload.user) {
        storageCache.setUser(action.payload.user);
      }
      if (action.payload.token) {
        storageCache.setAccessToken(action.payload.token);
      }
      console.debug('[AuthContext Reducer] AUTH_SUCCESS - new isAuthenticated:', !!newState_success.user && !!newState_success.token);
      return newState_success;
    case AUTH_FAILURE:
      console.debug('[AuthContext Reducer] AUTH_FAILURE - error:', action.payload);
      return {
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    case AUTH_LOGOUT:
      storageCache.clear();
      return { user: null, token: null, loading: false, error: null };
    case AUTH_UPDATE:
      const updatedUser = { ...state.user, ...action.payload };
      storageCache.setUser(updatedUser);
      return { ...state, user: updatedUser };
    case AUTH_REFRESH_TOKEN:
      return { ...state, token: action.payload };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────
export const AuthContext = createContext(null);

// ─── Provider ────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const refreshIntervalRef = useRef(null);

  // On mount: check auth via backend (cookie-based session)
  useEffect(() => {
    const initAuth = async () => {
      try {
        dispatch({ type: AUTH_LOADING });
        const user = await verifyToken(null);
        dispatch({ type: AUTH_SUCCESS, payload: { token: null, user } });
      } catch (err) {
        clearAuthStorage();
        dispatch({ type: AUTH_FAILURE, payload: err?.message ?? 'Not authenticated' });
      }
    };
    initAuth();

    const onExpired = () => {
      dispatch({ type: AUTH_FAILURE, payload: 'Session expired' });
    };
    window.addEventListener('forreal:auth:expired', onExpired);
    return () => window.removeEventListener('forreal:auth:expired', onExpired);
  }, []);


  // Optional refresh loop (cookie-based). We only attempt if backend supports it.
  // Axios interceptor also handles refresh on 401.
  useEffect(() => {
    // Keep interval only while authenticated user exists.
    if (!state.user) return;
    refreshIntervalRef.current = setInterval(async () => {
      try {
        await refreshToken(null);
      } catch {
        logout();
      }
    }, 14 * 60 * 1000);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [state.user]); // eslint-disable-line react-hooks/exhaustive-deps


  // ─── Actions ────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    dispatch({ type: AUTH_LOADING });
    console.debug('[AuthContext] login() called for:', username);
    try {
      const { token, user, refreshToken } = await loginApi(username, password);
      console.debug('[AuthContext] loginApi succeeded, user:', user.username);
      // Optionally connect to socket with token
      // socket.auth = { token }; socket.connect();
      dispatch({ type: AUTH_SUCCESS, payload: { token, user } });
      // update socket auth immediately
      try { authenticateSocket(token); } catch (e) { /* best-effort */ }
      console.debug('[AuthContext] AUTH_SUCCESS dispatched');
      return { token, user };
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
      console.error('[AuthContext] login error:', errorMsg);
      dispatch({ type: AUTH_FAILURE, payload: errorMsg });
      throw err;
    }
  }, []);

  const signup = useCallback(async (username, password, displayName) => {
    dispatch({ type: AUTH_LOADING });
    console.debug('[AuthContext] signup() called for:', username);
    try {
      const { token, user, refreshToken } = await signupApi(username, password, displayName);
      console.debug('[AuthContext] signupApi succeeded, user:', user.username);
      dispatch({ type: AUTH_SUCCESS, payload: { token, user } });
      try { authenticateSocket(token); } catch (e) { /* best-effort */ }
      console.debug('[AuthContext] AUTH_SUCCESS dispatched (signup)');
      return { token, user };
    } catch (err) {
      const errorMsg = err.message || 'Signup failed';
      console.error('[AuthContext] signup error:', errorMsg);
      dispatch({ type: AUTH_FAILURE, payload: errorMsg });
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    // Disconnect socket if present
    // socket?.disconnect();
    dispatch({ type: AUTH_LOGOUT });
    // Any additional cleanup
  }, []);

  const updateUser = useCallback((updates) => {
    dispatch({ type: AUTH_UPDATE, payload: updates });
  }, []);

  // Memoised context value
  const value = useMemo(() => {
    const isAuth = !!state.user && !!state.token;
    console.debug('[AuthContext] Context value updated:', {
      isAuthenticated: isAuth,
      user: state.user?.username,
      hasToken: !!state.token,
      loading: state.loading,
      error: state.error,
    });
    return {
      user: state.user,
      token: state.token,
      loading: state.loading,
      error: state.error,
      isAuthenticated: isAuth,
      login,
      signup,
      logout,
      updateUser,
    };
  }, [state, login, signup, logout, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Custom Hook: useAuth ────────────────────────────────────
/**
 * Access authentication context.
 * Throws if used outside AuthProvider (developer‑friendly).
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}

// ─── Custom Hook: useRequireAuth ─────────────────────────────
/**
 * Redirects to /auth if user is not authenticated.
 * Returns user data if authenticated, or null during loading.
 * Usage: const user = useRequireAuth();
 */
export function useRequireAuth(redirectTo = '/login') {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect once loading is complete and user is missing
    if (!loading && !isAuthenticated) {
      // Preserve intended destination for post‑login redirect
      navigate(redirectTo, {
        state: { from: location.pathname },
        replace: true,
      });
    }
  }, [loading, isAuthenticated, navigate, redirectTo, location.pathname]);

  return loading ? null : user; // null while loading => show skeleton/spinner
}

export default AuthContext;