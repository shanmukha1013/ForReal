import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthLayout, MainLayout } from '@/layouts';
import { Login, Register, Home, NotFound } from '@/pages';
import { CinematicIntro } from '@/components/CinematicIntro';
import useAuthStore from '@/store/useAuthStore';
import useThemeStore from '@/store/useThemeStore';

function App() {
  const { checkAuth } = useAuthStore();
  const { theme } = useThemeStore();
  const [showIntro, setShowIntro] = useState(() => {
    // Only show once per browser session
    const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');
    return !hasSeenIntro;
  });

  useEffect(() => {
    // Apply theme to document root
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    // Check authentication on initial load
    checkAuth();
  }, [checkAuth]);

  const handleIntroComplete = () => {
    sessionStorage.setItem('hasSeenIntro', 'true');
    setShowIntro(false);
  };

  return (
    <>
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#121212',
            color: '#fff',
            border: '1px solid #27272a',
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

          {/* Protected Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </>
  );
}

export default App;
