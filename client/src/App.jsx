import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthLayout, MainLayout } from '@/layouts';
import { Login, Register, Home, NotFound, Explore, Debates, DebateView, Messages, Notifications, Profile, Settings } from '@/pages';
import { CinematicIntro } from '@/components/CinematicIntro';
import useAuthStore from '@/store/useAuthStore';
import useThemeStore from '@/store/useThemeStore';

function App() {
  const { checkAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  return (
    <>
      <Toaster 
        position="top-center" 
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #2A2A2A',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      {showIntro ? (
        <CinematicIntro onComplete={handleIntroComplete} />
      ) : (
        <Routes>
          {/* Public Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Protected App Routes */}
          <Route element={<MainLayout />}>
            {/* Canonical home route */}
            <Route path="/home" element={<Home />} />
            {/* Redirect root to /home */}
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/debates" element={<Debates />} />
            <Route path="/debates/:id" element={<DebateView />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            {/* Future: individual talk page */}
            <Route path="/talks/:talkId" element={<Home />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </>
  );
}

export default App;
