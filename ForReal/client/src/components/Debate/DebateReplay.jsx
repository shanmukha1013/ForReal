import { useState } from 'react';
import { motion } from 'framer-motion';
import { PlayIcon, PauseIcon, ForwardIcon, BackwardIcon } from '@heroicons/react/24/outline';

export default function DebateReplay({ argumentsList }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // In a real implementation, this would use requestAnimationFrame or interval to playback arguments based on their timestamps

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-black/40 border border-white/10 rounded-2xl p-4 mt-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Debate Timeline Replay</h3>
        <div className="flex items-center gap-2 bg-white/5 rounded-full p-1 border border-white/10">
          <button className="p-2 text-gray-400 hover:text-white transition">
            <BackwardIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 bg-brand text-white rounded-full hover:bg-brand/90 transition shadow-glow-sm"
          >
            {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
          </button>
          <button className="p-2 text-gray-400 hover:text-white transition">
            <ForwardIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="relative h-1 bg-white/10 rounded-full w-full">
        <div className="absolute left-0 top-0 h-full bg-brand rounded-full" style={{ width: `${(currentIndex / Math.max(1, argumentsList?.length - 1)) * 100}%` }} />
      </div>
      <p className="text-center text-xs text-gray-500 mt-3">Replay feature is in preview</p>
    </motion.div>
  );
}
