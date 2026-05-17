// -----------------------------------------------------------------------------
// Login Page — Premium Cinematic Authentication
// -----------------------------------------------------------------------------
// The first touchpoint of ForReal. Delivers an immersive, emotionally resonant
// on‑boarding that blends Apple‑like refinement with a dark, debate‑ready edge.
// -----------------------------------------------------------------------------

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useContext,
} from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification'; // adjust path as needed

// -----------------------------------------------------------------------------
// Animation Variants (tuned for emotional impact)
// -----------------------------------------------------------------------------
const overlayVariants = {
  enter: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
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

const taglineContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.5 },
  },
};

const taglineChild = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const formContainer = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.2, ease: 'easeOut' },
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

const floatingParticle = {
  animate: (i) => ({
    x: [0, Math.random() * 20 - 10, -Math.random() * 15 + 7, 0],
    y: [0, -Math.random() * 10, Math.random() * 15 - 5, 0],
    transition: {
      repeat: Infinity,
      duration: 5 + Math.random() * 5,
      ease: 'easeInOut',
      delay: i * 0.2,
    },
  }),
};

// -----------------------------------------------------------------------------
// Subcomponents (inline for co-location, production‑grade nonetheless)
// -----------------------------------------------------------------------------

// Animated floating particle background
const ParticleBackground = React.memo(() => {
  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      width: 4 + Math.random() * 6,
      height: 4 + Math.random() * 6,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      opacity: 0.15 + Math.random() * 0.2,
      blur: Math.floor(Math.random() * 2) + 1,
    }))
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {particles.current.map((p) => (
        <motion.div
          key={p.id}
          custom={p.id}
          variants={floatingParticle}
          animate="animate"
          className="absolute rounded-full bg-neon"
          style={{
            width: p.width,
            height: p.height,
            top: p.top,
            left: p.left,
            opacity: p.opacity,
            filter: `blur(${p.blur}px)`,
          }}
        />
      ))}
    </div>
  );
});
ParticleBackground.displayName = 'ParticleBackground';

// Cinematic intro overlay with logo & tagline
const IntroOverlay = React.memo(({ onFinish }) => {
  // Auto‑dismiss after 3.2 seconds, but also allow tap to skip
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
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.08)_0%,transparent_70%)]" />

      <div className="relative flex flex-col items-center text-center px-6">
        {/* Logo – large neon "Fr" */}
        <motion.div
          variants={logoReveal}
          initial="hidden"
          animate="visible"
          className="mb-6"
        >
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

        {/* Tagline – staggered reveal */}
        <motion.div
          variants={taglineContainer}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          <motion.h1
            variants={taglineChild}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight"
          >
            ForReal
          </motion.h1>
          <motion.p
            variants={taglineChild}
            className="text-lg sm:text-xl font-medium text-gray-400"
          >
            We Don’t Talk Shit.
          </motion.p>
          <motion.p
            variants={taglineChild}
            className="text-sm sm:text-base text-gray-500 max-w-sm mx-auto"
          >
            Spread truth. Debate honestly.
          </motion.p>
        </motion.div>

        {/* Subtle prompt */}
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

// Password visibility toggle icon
const EyeIcon = ({ visible, ...props }) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {visible ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

// Loading spinner for button
const ButtonSpinner = () => (
  <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

// -----------------------------------------------------------------------------
// Main Login Component
// -----------------------------------------------------------------------------
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading: authLoading } = useContext(AuthContext);
  const notify = useNotification();

  const [showIntro, setShowIntro] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect intended destination
  const from = location.state?.from || '/home';

  // If already authenticated, redirect
  useEffect(() => {
    // allow redirect as soon as auth is ready, even while intro is showing
    console.debug('[Login] useEffect: isAuthenticated =', isAuthenticated, 'authLoading =', authLoading);
    if (isAuthenticated && !authLoading) {
      console.debug('[Login] Navigating to:', from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from, authLoading]);

  // Skip intro handler
  const handleIntroFinish = useCallback(() => {
    setShowIntro(false);
  }, []);

  // Form input handler
  const handleChange = (e) => {
    setError('');
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Form submit – call AuthContext login
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.debug('[Login] handleSubmit started');
    setError('');
    if (!formData.username.trim() || !formData.password.trim()) {
      const msg = 'Please fill in all fields.';
      setError(msg);
      console.warn('[Login]', msg);
      return;
    }

    setLoading(true);
    console.debug('[Login] Calling login() for user:', formData.username);
    try {
      await login(formData.username, formData.password);
      console.debug('[Login] login() returned successfully');
      // Note: isAuthenticated will update via AuthContext state change
      // The useEffect above will handle the redirect
      notify.success(`Welcome back, ${formData.username}!`);
      console.debug('[Login] Success notification displayed');
    } catch (err) {
      const errorMsg = err.message || 'Login failed. Check your credentials.';
      console.error('[Login] Login error:', errorMsg);
      setError(errorMsg);
      notify.error(errorMsg);
    } finally {
      setLoading(false);
      console.debug('[Login] handleSubmit finished, loading set to false');
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-white flex items-center justify-center overflow-hidden">
      {/* Animated floating particles */}
      <ParticleBackground />

      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(34,197,94,0.12)_0%,transparent_60%)] pointer-events-none" />

      {/* Cinematic intro overlay */}
      <AnimatePresence>
        {showIntro && <IntroOverlay onFinish={handleIntroFinish} />}
      </AnimatePresence>

      {/* Login form (visible after intro) */}
      <AnimatePresence>
        {!showIntro && (
          <motion.div
            variants={formContainer}
            initial="hidden"
            animate="visible"
            className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-0"
          >
            {/* Glass‑morphism card */}
            <div className="backdrop-blur-2xl bg-black/50 border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-neon/5">
              {/* Header */}
              <motion.div
                variants={staggerChildren}
                initial="hidden"
                animate="visible"
                className="text-center mb-8"
              >
                <motion.div
                  variants={fieldVariant}
                  className="text-4xl sm:text-5xl font-black tracking-tighter bg-gradient-to-r from-white to-green-400 bg-clip-text text-transparent select-none"
                >
                  ForReal
                </motion.div>
                <motion.p
                  variants={fieldVariant}
                  className="mt-2 text-gray-400 text-sm font-medium"
                >
                  We Don’t Talk Shit.
                </motion.p>
              </motion.div>

              {/* Error message */}
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

              {/* Login form */}
              <motion.form
                onSubmit={handleSubmit}
                variants={staggerChildren}
                initial="hidden"
                animate="visible"
                className="space-y-5"
              >
                {/* Username */}
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
                      placeholder="Enter your username"
                    />
                    <div className="absolute inset-0 rounded-xl bg-neon/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                </motion.div>

                {/* Password */}
                <motion.div variants={fieldVariant}>
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-400 mb-1.5 ml-1">
                    Password
                  </label>
                  <div className="relative group">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 pr-12 focus:outline-none focus:border-neon/70 focus:ring-1 focus:ring-neon/50 transition-all duration-300"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <EyeIcon visible={showPassword} className="w-5 h-5" />
                    </button>
                    <div className="absolute inset-0 rounded-xl bg-neon/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                </motion.div>

                {/* Options row */}
                <motion.div variants={fieldVariant} className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-gray-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={() => setRemember(!remember)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-neon focus:ring-neon/50 focus:ring-offset-0"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => notify.info('Password reset coming soon.')}
                    className="text-gray-400 hover:text-neon transition-colors font-medium"
                  >
                    Forgot password?
                  </button>
                </motion.div>

                {/* Submit button */}
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
                        <span>Signing in...</span>
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </motion.button>
                </motion.div>
              </motion.form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-black/50 text-gray-500">or</span>
                </div>
              </div>

              {/* Social login buttons */}
              <motion.div
                variants={staggerChildren}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-3 gap-3"
              >
                {[
                  {
                    name: 'Google',
                    icon: (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    ),
                  },
                  {
                    name: 'Apple',
                    icon: (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                    ),
                  },
                  {
                    name: 'Twitter',
                    icon: (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    ),
                  },
                ].map(({ name, icon }) => (
                  <motion.button
                    key={name}
                    variants={fieldVariant}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.07)' }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => notify.info(`${name} login coming soon.`)}
                    className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-xl py-3 px-4 hover:border-white/20 transition-all duration-200 text-xs font-medium text-white"
                    aria-label={`Sign in with ${name}`}
                  >
                    {icon}
                    <span className="hidden sm:inline">{name}</span>
                  </motion.button>
                ))}
              </motion.div>

              {/* Sign‑up prompt */}
              <motion.p
                variants={fieldVariant}
                initial="hidden"
                animate="visible"
                className="mt-6 text-center text-xs text-gray-500"
              >
                Don’t have an account?{' '}
<Link
                  to="/signup"
                  replace
                  className="text-neon font-semibold hover:underline focus:outline-none focus:underline"
                  aria-label="Create one (currently unavailable)"
                >
                  Create one
                </Link>
              </motion.p>
            </div>

            {/* Footer */}
            <p className="mt-6 text-center text-[10px] text-gray-600">
              ForReal · We Don’t Talk Shit. · Spread truth.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}