// ─────────────────────────────────────────────────────────────────────────────
// ErrorBoundary.jsx – Enterprise-grade Error Recovery System
// ─────────────────────────────────────────────────────────────────────────────
// Prevents random "Something went wrong" crashes by catching render errors,
// providing fallback UI, logging diagnostics, and allowing graceful recovery.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { motion } from 'framer-motion';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      timestamp: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    const errorCount = (this.state.errorCount || 0) + 1;
    const timestamp = new Date().toISOString();

    // Log comprehensive diagnostics
    console.error('═══════════════════════════════════════════════════════════');
    console.error('ERRORBOUND ARY CAUGHT ERROR');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Count in Session:', errorCount);
    console.error('Timestamp:', timestamp);
    console.error('═══════════════════════════════════════════════════════════');

    // Update state with detailed error info
    this.setState({
      errorInfo,
      errorCount,
      timestamp,
    });

    // Optionally log to external service (Sentry, LogRocket, etc)
    // if (import.meta.env.PROD) {
    //   logErrorToService({ error, errorInfo, errorCount, timestamp });
    // }

    // If too many errors, suggest clearing cache
    if (errorCount > 3) {
      console.warn('Multiple errors detected—user may need to clear cache and reload.');
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleClearCache = () => {
    try {
      localStorage.clear();
      localStorage.removeItem('forreal_access_token');
      localStorage.removeItem('forreal_user');
      sessionStorage.clear();
      console.log('Cache cleared. Reloading...');
      window.location.reload();
    } catch (e) {
      console.error('Failed to clear cache:', e);
    }
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV;

      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen flex items-center justify-center bg-black"
          style={{
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
          }}
        >
          <div className="w-full max-w-2xl mx-auto px-6 py-12">
            {/* Error Header */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-900/20 border border-red-700/50 mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C1121F" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h1 className="text-3xl font-bold text-brand mb-2">
                Unexpected Error
              </h1>
              <p className="text-gray-300 text-lg">
                Something went wrong. We've logged this and we're investigating.
              </p>
            </motion.div>

            {/* Error Message */}
            {this.state.error && (
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-8 overflow-auto max-h-40"
              >
                <p className="text-sm font-mono text-gray-400 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                </p>
              </motion.div>
            )}

            {/* Development-only Debug Info */}
            {isDevelopment && this.state.errorInfo && (
              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-blue-900/10 border border-blue-700/30 rounded-lg p-6 mb-8 overflow-auto max-h-40"
              >
                <p className="text-xs font-mono text-blue-300 whitespace-pre-wrap break-words">
                  {this.state.errorInfo.componentStack}
                </p>
              </motion.div>
            )}

            {/* Error Metadata */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 gap-4 mb-8 text-sm"
            >
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <p className="text-gray-400 mb-1">Error Count</p>
                <p className="text-brand font-semibold">{this.state.errorCount}</p>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
                <p className="text-gray-400 mb-1">Timestamp</p>
                <p className="text-brand font-semibold text-xs">
                  {this.state.timestamp?.split('T')[1]?.substring(0, 8) || 'Unknown'}
                </p>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-3 bg-[#141414] hover:bg-[#1a1a1a] text-brand border border-white/10 font-semibold rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-6 py-3 bg-[#C1121F] hover:bg-[#DC2626] text-brand transition-colors duration-300 font-semibold rounded-lg transition-colors"
              >
                Reload App
              </button>
              <button
                onClick={this.handleClearCache}
                className="flex-1 px-6 py-3 bg-transparent border border-[#C1121F] text-[#C1121F] hover:bg-[#C1121F]/10 font-semibold rounded-lg transition-colors"
              >
                Clear Cache & Reload
              </button>
            </motion.div>

            {/* Support Info */}
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 text-center text-gray-400 text-sm"
            >
              <p>
                If this persists, please contact support with the error details above.
              </p>
            </motion.div>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RouteErrorFallback – Fallback UI for route-level errors
// ─────────────────────────────────────────────────────────────────────────────
export function RouteErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4">
      <div className="max-w-md w-full text-center bg-[#0D0D0D] p-8 rounded-xl border border-white/10 shadow-[0_0_30px_rgba(193,18,31,0.1)]">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#C1121F]/10 border border-[#C1121F]/50 mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C1121F" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-brand mb-2">Page Error</h1>
        <p className="text-gray-400 mb-6 text-sm">
          Failed to load this page. Please try again or return home.
        </p>
        <div className="flex gap-3 flex-col sm:flex-row">
          <button
            onClick={resetErrorBoundary}
            className="flex-1 px-4 py-3 bg-[#C1121F] hover:bg-[#DC2626] text-brand transition-colors duration-300 font-semibold rounded-lg transition-colors"
          >
            Retry
          </button>
          <a
            href="/"
            className="flex-1 px-4 py-3 bg-[#141414] hover:bg-[#1a1a1a] border border-white/10 text-brand font-semibold rounded-lg transition-colors text-center"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}
