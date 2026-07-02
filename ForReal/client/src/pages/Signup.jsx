// -----------------------------------------------------------------------------
// Signup Page — Premium Cinematic Authentication (production-grade)
// -----------------------------------------------------------------------------

import React, { useState, useCallback, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification';
import { ParticleBackground } from '../components/BackgroundAesthetics';

// -----------------------------------------------------------------------------
// Animation Variants (match Login premium theme)
// -----------------------------------------------------------------------------
const overlayVariants = {
  enter: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const logoReveal = {
  hidden: { scale: 0.8, opacity: 0, filter: 'blur(10px)' },
  visible: {
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 },
  },
};

const staggerChildren = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fieldVariant = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const formContainer = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.2, ease: 'easeOut' } },
};

// ParticleBackground removed, using global BackgroundAesthetics
ParticleBackground.displayName = 'ParticleBackground';

const IntroOverlay = React.memo(({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 3200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div
      variants={overlayVariants}
      initial="enter"
      exit="exit"
      onClick={onFinish}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden cursor-pointer"
      aria-label="Skip intro"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.08)_0%,transparent_70%)]" />

      <div className="relative flex flex-col items-center text-center px-6">
        <motion.div variants={logoReveal} initial="hidden" animate="visible" className="mb-6">
          <span
            className="text-[100px] sm:text-[140px] font-black tracking-tighter leading-none select-none"
            style={{
              background: 'linear-gradient(to bottom, #ffffff 20%, #22c55e 80%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 30px rgba(34,197,94,0.45))',
            }}
          >
            Fr
          </span>
        </motion.div>

        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">Create</h1>
          <p className="text-lg sm:text-xl font-medium text-gray-400">Start debating responsibly.</p>
          <p className="text-sm sm:text-base text-gray-500 max-w-sm mx-auto">We Don’t Talk Shit. Spread truth.</p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6, transition: { delay: 1.2 } }}
          className="mt-12 text-xs text-gray-600 tracking-widest uppercase"
        >
          Tap anywhere to enter
        </motion.p>
      </div>
    </motion.div>
  );
});
IntroOverlay.displayName = 'IntroOverlay';

const ButtonSpinner = () => (
  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export default function Signup() {
  const navigate = useNavigate();
  const { signup, isAuthenticated, loading: authLoading } = useContext(AuthContext);
  const notify = useNotification();

  const [showIntro, setShowIntro] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', displayName: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.debug('[Signup] isAuthenticated:', isAuthenticated, 'authLoading:', authLoading);
    if (isAuthenticated && !authLoading) {
      console.debug('[Signup] Navigating to /home');
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleIntroFinish = useCallback(() => {
    setShowIntro(false);
  }, []);

  const handleChange = (e) => {
    setError('');
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.debug('[Signup] handleSubmit started');
    setError('');

    if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim() || !formData.displayName.trim()) {
      const msg = 'Please fill in all fields.';
      setError(msg);
      console.warn('[Signup]', msg);
      return;
    }

    setLoading(true);
    try {
      console.debug('[Signup] Calling signup() for user:', formData.username);
      // AuthContext.signup should auto-authenticate on success
      await signup(formData.username, formData.email, formData.password, formData.displayName);
      console.debug('[Signup] signup() returned successfully');
      notify.success('Account created — welcome!');
      // Note: isAuthenticated will update via AuthContext, and the useEffect above will handle redirect
    } catch (err) {
      const errorMsg = err?.message || 'Signup failed. Try again.';
      console.error('[Signup] Signup error:', errorMsg);
      setError(errorMsg);
      notify.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen text-white flex items-center justify-center overflow-hidden bg-transparent">
      {/* Global backgrounds handle grid, blobs, spotlight, and particles */}

      <AnimatePresence>
        {showIntro && <IntroOverlay onFinish={handleIntroFinish} />}
      </AnimatePresence>

      <AnimatePresence>
        {!showIntro && (
          <motion.div
            variants={formContainer}
            initial="hidden"
            animate="visible"
            className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-0"
          >
            <div className="backdrop-blur-2xl bg-black/50 border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-neon/5">
              <motion.div variants={staggerChildren} initial="hidden" animate="visible" className="text-center mb-8">
                <motion.div
                  variants={fieldVariant}
                  className="text-4xl sm:text-5xl font-black tracking-tighter bg-gradient-to-r from-white to-green-400 bg-clip-text text-transparent select-none"
                >
                  Sign up
                </motion.div>
                <motion.p variants={fieldVariant} className="mt-2 text-gray-400 text-sm font-medium">
                  Create your account.
                </motion.p>
              </motion.div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.form
                onSubmit={handleSubmit}
                variants={staggerChildren}
                initial="hidden"
                animate="visible"
                className="space-y-5"
              >
                <motion.div variants={fieldVariant}>
                  <label htmlFor="username" className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">
                    Username
                  </label>
                  <div className="relative group">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/70 focus:ring-1 focus:ring-neon/50 transition-all duration-300"
                      placeholder="Pick a username"
                    />
                    <div className="absolute inset-0 rounded-xl bg-neon/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                </motion.div>

                <motion.div variants={fieldVariant}>
                  <label htmlFor="email" className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">
                    Email
                  </label>
                  <div className="relative group">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/70 focus:ring-1 focus:ring-neon/50 transition-all duration-300"
                      placeholder="Enter your email"
                    />
                    <div className="absolute inset-0 rounded-xl bg-neon/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                </motion.div>

                <motion.div variants={fieldVariant}>
                  <label htmlFor="displayName" className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">
                    Display name
                  </label>
                  <div className="relative group">
                    <input
                      id="displayName"
                      name="displayName"
                      type="text"
                      required
                      value={formData.displayName}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/70 focus:ring-1 focus:ring-neon/50 transition-all duration-300"
                      placeholder="How should we call you?"
                    />
                    <div className="absolute inset-0 rounded-xl bg-neon/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                </motion.div>

                <motion.div variants={fieldVariant}>
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">
                    Password
                  </label>
                  <div className="relative group">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon/70 focus:ring-1 focus:ring-neon/50 transition-all duration-300"
                      placeholder="Create a password"
                    />
                    <div className="absolute inset-0 rounded-xl bg-neon/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                </motion.div>

                <motion.div variants={fieldVariant}>
                  <motion.button
                    type="submit"
                    disabled={loading || authLoading}
                    whileHover={{ scale: loading || authLoading ? 1 : 1.02 }}
                    whileTap={{ scale: loading || authLoading ? 1 : 0.98 }}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neon/50 shadow-lg ${
                      loading || authLoading
                        ? 'bg-neon/50 text-gray-800 cursor-not-allowed'
                        : 'bg-neon text-black hover:bg-neon-soft active:scale-[0.98] shadow-neon/30'
                    }`}
                  >
                    {loading || authLoading ? (
                      <>
                        <ButtonSpinner />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      'Create account'
                    )}
                  </motion.button>
                </motion.div>
              </motion.form>

              <motion.p
                variants={fieldVariant}
                initial="hidden"
                animate="visible"
                className="mt-6 text-center text-xs text-gray-500"
              >
                Already have an account?{' '}
                <Link
                  to="/login"
                  replace
                  className="text-neon font-semibold hover:underline focus:outline-none focus:underline"
                  aria-label="Go to login"
                >
                  Sign in
                </Link>
              </motion.p>
            </div>

            <p className="mt-6 text-center text-[10px] text-gray-600">
              ForReal · We Don’t Talk Shit. · Spread truth.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
