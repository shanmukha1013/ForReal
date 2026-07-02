import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LightBulbIcon, ShieldExclamationIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';

const coachVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
};

export default function DebateCoach({ argumentText, optionName }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) {return;}
    if (argumentText.length < 20) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      // Simulate API call for real-time AI suggestions
      setTimeout(() => {
        setSuggestions([
          { type: 'logic', text: 'Consider addressing the counter-argument about scalability.' },
          { type: 'evidence', text: 'You made a strong claim. Adding a source would increase credibility.' },
        ]);
        setLoading(false);
      }, 800);
    }, 1000);

    return () => clearTimeout(timer);
  }, [argumentText, dismissed]);

  if (dismissed || (suggestions.length === 0 && !loading)) {return null;}

  return (
    <AnimatePresence>
      <motion.div
        variants={coachVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="absolute right-4 top-4 w-64 bg-black/80 backdrop-blur-md border border-ai/30 rounded-xl p-4 shadow-glow-ai z-10"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-ai font-bold text-xs uppercase tracking-wider">
            <SparklesIcon className="w-4 h-4" />
            AI Coach
          </div>
          <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-white">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-3 h-3 border-2 border-ai border-t-transparent rounded-full animate-spin" />
            Analyzing argument...
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((sug, i) => (
              <div key={i} className="flex gap-2 items-start text-xs text-gray-300">
                {sug.type === 'logic' ? (
                  <LightBulbIcon className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <ShieldExclamationIcon className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                )}
                <span>{sug.text}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
