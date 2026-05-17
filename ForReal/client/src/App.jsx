// -----------------------------------------------------------------------------
// App.jsx – Core Application Architecture
// -----------------------------------------------------------------------------
// Enterprise‑grade entry point for ForReal. Orchestrates routing,
// authentication, notifications, animation transitions, and provider hierarchy.
// Designed for scale, performance, and a premium realtime feel.
// -----------------------------------------------------------------------------

import React, { Suspense, lazy } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useRouteError,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

// Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './components/Notification';
import { ErrorBoundary, RouteErrorFallback } from './components/ErrorBoundary';

// -----------------------------------------------------------------------------
// Lazy‑loaded pages for code‑splitting (optional but production‑grade)
// -----------------------------------------------------------------------------
const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const Explore = lazy(() => import('./pages/Explore'));
const Profile = lazy(() => import('./pages/Profile'));
const Rooms = lazy(() => import('./pages/Rooms'));
const Room = lazy(() => import('./pages/Room'));
const Messages = lazy(() => import('./pages/Messages'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const Admin = lazy(() => import('./pages/Admin')); 
const Signup = lazy(() => import('./pages/Signup'));

// -----------------------------------------------------------------------------
// Shared animation variants (page transitions)
// -----------------------------------------------------------------------------
const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.995 },
};

const pageTransition = {
  duration: 0.28,
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
    className="min-h-screen bg-black"
  >
    {children}
  </motion.div>
);

// -----------------------------------------------------------------------------
// Loading fallback (full‑screen spinner)
// -----------------------------------------------------------------------------
const FullScreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-black">
    <div className="relative">
      <div className="w-14 h-14 border-4 border-white/10 border-t-neon rounded-full animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-3 h-3 bg-neon rounded-full animate-pulse" />
      </div>
    </div>
  </div>
);

// -----------------------------------------------------------------------------
// Protected Route Component
// -----------------------------------------------------------------------------
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  console.debug('[ProtectedRoute] checking access to', location.pathname, '| authenticated:', isAuthenticated, '| loading:', loading);

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
  <div className="min-h-screen flex flex-col items-center justify-center text-white bg-black">
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