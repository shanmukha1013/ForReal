import React, { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthLayout, MainLayout } from '@/layouts';
import { ConfirmHost, ErrorBoundary, Loader } from '@/components/ui';
import useAuthStore from '@/store/useAuthStore';

// Route-level code splitting: each page (and the animation library used by
// the landing intro) is only downloaded when it is visited.
const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const Home = lazy(() => import('@/pages/Home'));
const TalkView = lazy(() => import('@/pages/TalkView'));
const Explore = lazy(() => import('@/pages/Explore'));
const Debates = lazy(() => import('@/pages/Debates'));
const DebateView = lazy(() => import('@/pages/DebateView'));
const Messages = lazy(() => import('@/pages/Messages'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Profile = lazy(() => import('@/pages/Profile'));
const Settings = lazy(() => import('@/pages/Settings'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// Signed-in visitors skip the landing page; guests see the intro.
const RootRoute = () => {
  const status = useAuthStore((s) => s.status);
  if (status === 'checking') return <Loader fullScreen />;
  if (status === 'authenticated') return <Navigate to="/debates" replace />;
  return <Landing />;
};

const toastOptions = {
  duration: 3200,
  style: {
    background: '#171614',
    color: '#F2E2C5',
    border: '2px solid #171614',
    borderRadius: '4px',
    boxShadow: '4px 4px 0 0 #CA6230',
    fontSize: '14px',
    fontWeight: 600,
    padding: '10px 14px',
    maxWidth: '420px',
  },
  success: { iconTheme: { primary: '#CA6230', secondary: '#171614' } },
  error: { iconTheme: { primary: '#F2E2C5', secondary: '#171614' }, duration: 4500 },
};

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const clearSession = useAuthStore((s) => s.clearSession);
  const location = useLocation();

  useEffect(() => {
    checkAuth();
    // Fired by the API client when a refresh fails: clear local state only,
    // never call the server again (that previously caused a logout loop).
    const onUnauthorized = () => clearSession();
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [checkAuth, clearSession]);

  return (
    <>
      <Toaster position="bottom-center" toastOptions={toastOptions} containerStyle={{ bottom: 88 }} />
      <ConfirmHost />
      <ErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<Loader fullScreen />}>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/welcome" element={<Landing />} />

            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            <Route element={<MainLayout />}>
              <Route path="/home" element={<Home />} />
              <Route path="/talks/:talkId" element={<TalkView />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/debates" element={<Debates />} />
              <Route path="/debates/:id" element={<DebateView />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

export default App;
