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
  logoutApi,
  clearAuthStorage,
  getStoredToken,
  getCachedUser,
} from '../api/auth';
import { authenticateSocket } from '../realtime/socket';
import { storageCache } from '../lib/storageCache';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// ─── State shape ─────────────────────────────────────────────
const initialState = {
  user: null,
  token: null,
  loading: true, // true while verifying token on mount
  error: null,
};

// ─── Action types ────────────────────────────────────────────
const AUTH_LOADING = 'AUTH_LOADING';
const AUTH_SUCCESS = 'AUTH_SUCCESS';
const AUTH_FAILURE = 'AUTH_FAILURE';
const AUTH_LOGOUT = 'AUTH_LOGOUT';
const AUTH_UPDATE = 'AUTH_UPDATE'; // e.g. after profile edit
const AUTH_REFRESH_TOKEN = 'AUTH_REFRESH_TOKEN';

// ─── Reducer ─────────────────────────────────────────────────
function authReducer(state, action) {
  console.debug('[AuthContext Reducer] action:', action.type, 'payload:', action.payload);
  switch (action.type) {
    case AUTH_LOADING:
      return { ...state, loading: true, error: null };
    case AUTH_SUCCESS: {
      const normalizedUser = isPlainObject(action?.payload?.user) ? action.payload.user : null;
      const normalizedToken = action?.payload?.token ?? null;

      const newState_success = {
        user: normalizedUser,
        token: normalizedToken,
        loading: false,
        error: null,
      };
      if (action.payload.user) {
        storageCache.setUser(action.payload.user);
      }
      if (action.payload.token) {
        storageCache.setAccessToken(action.payload.token);
      }
      console.debug('[AuthContext Reducer] AUTH_SUCCESS - user present:', !!newState_success.user);
      return newState_success;
    }
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
    case AUTH_UPDATE: {
      const base = state.user && typeof state.user === 'object' ? state.user : {};
      const patch = action?.payload && typeof action.payload === 'object' ? action.payload : {};
      const updatedUser = { ...base, ...patch };
      storageCache.setUser(updatedUser);
      return { ...state, user: updatedUser };
    }
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
    if (!state.user) {return;}
    refreshIntervalRef.current = setInterval(async () => {
      try {
        await refreshToken(null);
      } catch {
        logout();
      }
    }, 14 * 60 * 1000);

    return () => {
      if (refreshIntervalRef.current) {clearInterval(refreshIntervalRef.current);}
    };
  }, [state.user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Actions ────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    dispatch({ type: AUTH_LOADING });
    console.debug('[AuthContext] login() called for:', username);
    try {
      const { token, user, refreshToken } = await loginApi(username, password);
      console.debug('[AuthContext] loginApi succeeded, user:', user?.username ?? user);
      dispatch({ type: AUTH_SUCCESS, payload: { token, user } });

      try {
        authenticateSocket(token);
      } catch (e) {
        /* best-effort */
      }
      console.debug('[AuthContext] AUTH_SUCCESS dispatched');
      return { token, user };
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
      console.error('[AuthContext] login error:', errorMsg);
      dispatch({ type: AUTH_FAILURE, payload: errorMsg });
      throw err;
    }
  }, []);

  const signup = useCallback(async (username, email, password, displayName) => {
    dispatch({ type: AUTH_LOADING });
    console.debug('[AuthContext] signup() called for:', username);
    try {
      // Backend requires email registration.
      const { token, user, refreshToken } = await signupApi(
        username,
        email,
        password,
        displayName
      );
      console.debug(
        '[AuthContext] signupApi succeeded, user:',
        user?.username ?? user
      );
      dispatch({ type: AUTH_SUCCESS, payload: { token, user } });

      try {
        authenticateSocket(token);
      } catch (e) {
        /* best-effort */
      }
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
    dispatch({ type: AUTH_LOGOUT });
  }, []);

  const updateUser = useCallback((updates) => {
    dispatch({ type: AUTH_UPDATE, payload: updates });
  }, []);

  const value = useMemo(() => {
    const isAuth = !!state.user && typeof state.user === 'object';
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
    if (!loading && !isAuthenticated) {
      navigate(redirectTo, {
        state: { from: location.pathname },
        replace: true,
      });
    }
  }, [loading, isAuthenticated, navigate, redirectTo, location.pathname]);

  return loading ? null : user;
}

export default AuthContext;

