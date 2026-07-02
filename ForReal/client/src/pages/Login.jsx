import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification';

const containerVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading: authLoading } = useContext(AuthContext);
  const notify = useNotification();

  const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from || '/home';

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from, authLoading]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setError('');
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
      await login(formData.username, formData.password, formData.rememberMe);
      notify.success(`Welcome back, ${formData.username}!`);
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
      notify.error(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-white flex items-center justify-center overflow-hidden">
      {/* Premium Spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_600px_at_50%_-10%,rgba(34,197,94,0.1),transparent)] pointer-events-none" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md mx-auto px-6"
      >
        <div className="bg-black/60 backdrop-blur-2xl rounded-3xl p-10 border border-white/5 shadow-[0_0_40px_rgba(34,197,94,0.05)] relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#22C55E]/50 to-transparent" />
          
          <motion.div variants={itemVariants} className="text-center mb-10">
            <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">
              Welcome back
            </h1>
            <p className="text-gray-400 text-sm tracking-wide">
              Sign in to continue to ForReal.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto', mb: 20 }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form onSubmit={handleSubmit} className="space-y-5">
            <motion.div variants={itemVariants}>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300 ml-1">Username</label>
                <input
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#22C55E]/50 focus:bg-white/[0.05] transition-all duration-300"
                  placeholder="Enter your username"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#22C55E]/50 focus:bg-white/[0.05] transition-all duration-300"
                  placeholder="Enter your password"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center justify-between pt-1 pb-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-4 h-4 rounded border border-white/20 bg-transparent group-hover:border-[#22C55E]/50 transition-colors">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="absolute opacity-0 w-full h-full cursor-pointer"
                  />
                  {formData.rememberMe && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2 h-2 rounded-sm bg-[#22C55E]" />
                  )}
                </div>
                <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Remember me</span>
              </label>

              <Link to="/forgot-password" className="text-sm text-gray-400 hover:text-[#22C55E] transition-colors">
                Forgot password?
              </Link>
            </motion.div>

            <motion.div variants={itemVariants}>
              <motion.button
                type="submit"
                disabled={loading || authLoading}
                whileHover={{ scale: loading || authLoading ? 1 : 1.01 }}
                whileTap={{ scale: loading || authLoading ? 1 : 0.99 }}
                className="w-full relative overflow-hidden group bg-gradient-to-r from-[#22C55E] to-[#16a34a] text-black py-3.5 rounded-xl text-sm font-bold transition-all duration-500 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {loading || authLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </span>
                ) : (
                  'Sign In'
                )}
              </motion.button>
            </motion.div>
          </motion.form>

          <motion.div variants={itemVariants} className="mt-8 text-center border-t border-white/5 pt-6">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-white font-medium hover:text-[#22C55E] transition-colors">
                Create Account
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}