// -----------------------------------------------------------------------------
// main.jsx – Application Entry Point
// -----------------------------------------------------------------------------
// ForReal — We Don’t Talk Shit.
// Modern React 18 root setup with strict mode, global styles,
// and an optional top‑level error boundary for production resilience.
// -----------------------------------------------------------------------------

import React from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';          // global styles

// -----------------------------------------------------------------------------
// Simple Error Boundary (inline for minimal dependencies)
// -----------------------------------------------------------------------------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Root error boundary caught:', error, errorInfo);
    // Optionally log to an error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'black', color: 'white', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h1 style={{ fontSize: '2rem', color: '#C1121F' }}>Something went wrong</h1>
            <p style={{ color: '#aaa', marginTop: '0.5rem' }}>
              We’re sorry — the app encountered an unexpected error.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 2rem',
                background: '#C1121F',
                color: 'black',
                border: 'none',
                borderRadius: '9999px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// -----------------------------------------------------------------------------
// Root render
// -----------------------------------------------------------------------------
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'Critical: Root element not found. Ensure index.html contains <div id="root"></div>.'
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);