import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification';

// -----------------------------------------------------------------------------
// Premium Background Components
// -----------------------------------------------------------------------------
const AnimatedGrid = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      className="absolute inset-[-100%] w-[300%] h-[300%] opacity-20"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        transform: 'perspective(1000px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
        animation: 'gridMove 15s linear infinite',
      }}
    />
    <style>{`
      @keyframes gridMove {
        0% { transform: perspective(1000px) rotateX(60deg) translateY(0) translateZ(-200px); }
        100% { transform: perspective(1000px) rotateX(60deg) translateY(40px) translateZ(-200px); }
      }
    `}</style>
  </div>
);

const GlowingBlobs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 mix-blend-screen">
    <motion.div
      animate={{
        x: [0, 100, -50, 0],
        y: [0, -100, 50, 0],
        scale: [1, 1.2, 0.8, 1],
      }}
      transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-green-600/30 rounded-full blur-[100px]"
    />
    <motion.div
      animate={{
        x: [0, -100, 80, 0],
        y: [0, 80, -100, 0],
        scale: [1, 1.5, 0.9, 1],
      }}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-700/20 rounded-full blur-[120px]"
    />
    <motion.div
      animate={{
        opacity: [0.3, 0.6, 0.3],
      }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/10 rounded-full blur-[150px]"
    />
  </div>
);

// -----------------------------------------------------------------------------
// Form Animation Variants
// -----------------------------------------------------------------------------
const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

// -----------------------------------------------------------------------------
// Main Login Component
// -----------------------------------------------------------------------------
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading: authLoading } = useContext(AuthContext);
  const notify = useNotification();

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from || '/home';

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from, authLoading]);

  const handleChange = (e) => {
    setError('');
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await login(formData.username, formData.password);
      notify.success(`Welcome back, ${formData.username}!`);
    } catch (err) {
      const errorMsg = err.message || 'Login failed. Check your credentials.';
      setError(errorMsg);
      notify.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white flex items-center justify-center overflow-hidden">
      {/* Background Layers */}
      <AnimatedGrid />
      <GlowingBlobs />
      
      {/* Moving Spotlight */}
      <motion.div
        animate={{
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.15)_0%,transparent_60%)] pointer-events-none"
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md mx-auto px-6"
      >
        <div className="glass-strong rounded-3xl p-10 shadow-2xl relative overflow-hidden">
          {/* Internal subtle glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
          
          <motion.div variants={itemVariants} className="text-center mb-10">
            <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-transparent mb-2">
              ForReal
            </h1>
            <p className="text-gray-400 text-sm font-medium tracking-wide uppercase">
              Truth. Logic. Debate.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, mb: 0 }}
                animate={{ opacity: 1, height: 'auto', mb: 24 }}
                exit={{ opacity: 0, height: 0, mb: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form onSubmit={handleSubmit} className="space-y-6">
            <motion.div variants={itemVariants}>
              <div className="relative group">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-transparent peer focus:outline-none focus:border-green-500/50 focus:bg-white/10 transition-all duration-300"
                  placeholder="Username"
                />
                <label
                  htmlFor="username"
                  className="absolute left-5 top-4 text-sm text-gray-500 transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-green-400 peer-focus:bg-[#0a0a0a] peer-focus:px-2 peer-valid:-top-2.5 peer-valid:text-xs peer-valid:text-gray-400 peer-valid:bg-[#0a0a0a] peer-valid:px-2 cursor-text"
                >
                  Username
                </label>
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="relative group">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-transparent peer focus:outline-none focus:border-green-500/50 focus:bg-white/10 transition-all duration-300"
                  placeholder="Password"
                />
                <label
                  htmlFor="password"
                  className="absolute left-5 top-4 text-sm text-gray-500 transition-all duration-300 peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-green-400 peer-focus:bg-[#0a0a0a] peer-focus:px-2 peer-valid:-top-2.5 peer-valid:text-xs peer-valid:text-gray-400 peer-valid:bg-[#0a0a0a] peer-valid:px-2 cursor-text"
                >
                  Password
                </label>
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <motion.button
                type="submit"
                disabled={loading || authLoading}
                whileHover={{ scale: loading || authLoading ? 1 : 1.02 }}
                whileTap={{ scale: loading || authLoading ? 1 : 0.98 }}
                className="w-full relative overflow-hidden group bg-white text-black py-4 rounded-2xl text-sm font-bold transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-green-400 to-green-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                {loading || authLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  'Enter ForReal'
                )}
              </motion.button>
            </motion.div>
          </motion.form>

          <motion.div variants={itemVariants} className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              New here?{' '}
              <Link to="/signup" className="text-white font-medium hover:text-green-400 transition-colors">
                Join the debate
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}