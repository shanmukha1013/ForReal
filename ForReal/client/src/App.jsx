// -----------------------------------------------------------------------------
// App.jsx – Core Application Architecture
// -----------------------------------------------------------------------------
// Enterprise‑grade entry point for ForReal. Orchestrates routing,
// authentication, notifications, animation transitions, and provider hierarchy.
// Designed for scale, performance, and a premium realtime feel.
// -----------------------------------------------------------------------------

import React, { lazy } from 'react';

// -----------------------------------------------------------------------------
// Lazy-load safety wrapper
// If an import resolves without a `default` export (React.lazy expects a component),
// we throw a targeted error naming the broken page. This prevents a vague
// “undefined lazy-loaded component” crash and identifies the exact culprit.
// -----------------------------------------------------------------------------
function lazyWithDefaultCheck(importFn, name) {
  return lazy(async () => {
    const mod = await importFn();
    if (!mod || !mod.default) {
      const keys = mod && typeof mod === 'object' ? Object.keys(mod) : 'null';
      throw new Error(`[LazyLoad] ${name} loaded by React.lazy, but module.default is missing. Export keys: ${keys}`);
    }
    return mod;
  });
}
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

// Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './components/Notification';
import { ErrorBoundary } from './components/ErrorBoundary';
import BackgroundAesthetics from './components/BackgroundAesthetics';

// -----------------------------------------------------------------------------
// Lazy‑loaded pages for code‑splitting (optional but production‑grade)
// -----------------------------------------------------------------------------
const Login = lazyWithDefaultCheck(() => import('./pages/Login'), 'Login');
const Home = lazyWithDefaultCheck(() => import('./pages/Home'), 'Home');
const Explore = lazyWithDefaultCheck(() => import('./pages/Explore'), 'Explore');
const Profile = lazyWithDefaultCheck(() => import('./pages/Profile'), 'Profile');
const Rooms = lazyWithDefaultCheck(() => import('./pages/Rooms'), 'Rooms');
const Room = lazyWithDefaultCheck(() => import('./pages/Room'), 'Room');
const Messages = lazyWithDefaultCheck(() => import('./pages/Messages'), 'Messages');
const Notifications = lazyWithDefaultCheck(() => import('./pages/Notifications'), 'Notifications');
const Settings = lazyWithDefaultCheck(() => import('./pages/Settings'), 'Settings');
const Admin = lazyWithDefaultCheck(() => import('./pages/Admin'), 'Admin');
const Signup = lazyWithDefaultCheck(() => import('./pages/Signup'), 'Signup');

// -----------------------------------------------------------------------------
// Shared animation variants (page transitions)
// -----------------------------------------------------------------------------
const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.995 },
};

const pageTransition = {
  duration: 0.6,
  ease: [0.16, 1, 0.3, 1],
};

// -----------------------------------------------------------------------------
// Reusable page wrapper (handles lazy loading and transitions)
// -----------------------------------------------------------------------------
const PageTransition = ({ children }) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={pageVariants}
    transition={pageTransition}
    className="min-h-screen bg-transparent"
  >
    {children}
  </motion.div>
);

// -----------------------------------------------------------------------------
// Loading fallback (minimalist Vercel/Linear style logo reveal)
// -----------------------------------------------------------------------------
const FullScreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#050505]">
    <motion.div
      initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-4"
    >
      <div className="w-12 h-12 bg-gradient-to-br from-[#22C55E] to-green-900 rounded-2xl shadow-[0_0_40px_rgba(34,197,94,0.3)] flex items-center justify-center overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-6 bg-white rounded-full"
        />
      </div>
      <motion.p
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase"
      >
        ForReal
      </motion.p>
    </motion.div>
  </div>
);

// -----------------------------------------------------------------------------
// Protected Route Component
// -----------------------------------------------------------------------------
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();



  // While authentication state is being resolved, show a loader
  if (loading) {
    console.debug('[ProtectedRoute] showing loader - still loading auth state');
    return <FullScreenLoader />;
  }

  // Redirect to login if not authenticated, preserving intended destination
  if (!isAuthenticated) {
    console.debug('[ProtectedRoute] redirecting to login - not authenticated');
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  console.debug('[ProtectedRoute] rendering protected content');
  return (
    <ErrorBoundary>
      <PageTransition>{children}</PageTransition>
    </ErrorBoundary>
  );
};

// -----------------------------------------------------------------------------
// ScrollToTop – resets scroll position on navigation
// -----------------------------------------------------------------------------
const ScrollToTop = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// -----------------------------------------------------------------------------
// 404 Not Found Page
// -----------------------------------------------------------------------------
const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center text-white bg-transparent">
    <h1 className="text-6xl font-black text-neon mb-4">404</h1>
    <p className="text-gray-400 text-lg mb-6">This page doesn’t exist.</p>
    <a
      href="/"
      className="px-6 py-2.5 rounded-full bg-neon text-black font-bold hover:bg-neon/90 transition"
    >
      Go Home
    </a>
  </div>
);

// -----------------------------------------------------------------------------
// Application Routes (with AnimatePresence)
// -----------------------------------------------------------------------------
const AppRoutes = () => {
  const location = useLocation();

  const LoginElement = (
    <ErrorBoundary>
      <PageTransition>
        <Login />
      </PageTransition>
    </ErrorBoundary>
  );

  return (
    <>
      <BackgroundAesthetics />
      <ScrollToTop />
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          {/* Public routes – no protection */}
          <Route path="/login" element={LoginElement} />
          {/* Backward-compatibility alias */}
          <Route path="/auth" element={LoginElement} />

          {/* Public auth pages */}
          <Route path="/signup" element={<ErrorBoundary><PageTransition><Signup /></PageTransition></ErrorBoundary>} />
          <Route path="/register" element={<ErrorBoundary><PageTransition><Signup /></PageTransition></ErrorBoundary>} />

          {/* Default route */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />

          {/* Protected routes */}
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
          <Route path="/profile/:username?" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
          <Route path="/rooms/:id" element={<ProtectedRoute><Room /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

          {/* Fallback – 404 */}
          <Route
            path="*"
            element={
              <ErrorBoundary>
                <PageTransition>
                  <NotFound />
                </PageTransition>
              </ErrorBoundary>
            }
          />
        </Routes>
      </AnimatePresence>
    </>
  );
};

// -----------------------------------------------------------------------------
// Root App Component – Provider Hierarchy
// -----------------------------------------------------------------------------
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}