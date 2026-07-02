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
// Premium Error Boundary
// -----------------------------------------------------------------------------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true, 
      error,
      errorId: Math.random().toString(36).substring(2, 9).toUpperCase()
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Root error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000000', color: '#FFFFFF', fontFamily: "'Inter', sans-serif", padding: '24px' }}>
          
          {/* Logo */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-1px', margin: 0 }}>
              <span style={{ color: '#000000', WebkitTextStroke: '1px #ffffff' }}>FOR</span><span style={{ color: '#C1121F' }}>REAL</span>
            </h1>
          </div>

          {/* Error Card */}
          <div style={{ background: '#0D0D0D', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '40px', maxWidth: '440px', width: '100%', textAlign: 'center', boxShadow: '0 0 30px rgba(193,18,31,0.1)' }}>
            <div style={{ color: '#C1121F', marginBottom: '16px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#FFFFFF' }}>System Malfunction</h2>
            <p style={{ color: '#A1A1AA', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
              We encountered a critical error processing this request. Our systems have logged the failure.
            </p>

            <div style={{ background: '#050505', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#71717A', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Error ID</span>
              <span style={{ color: '#C1121F', fontSize: '14px', fontFamily: 'monospace', fontWeight: 'bold' }}>{this.state.errorId}</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '14px',
                  background: '#C1121F',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#DC2626'}
                onMouseOut={(e) => e.target.style.background = '#C1121F'}
              >
                Reload Application
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '14px',
                  background: 'transparent',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                onMouseOut={(e) => e.target.style.background = 'transparent'}
              >
                Back to Home
              </button>
            </div>
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