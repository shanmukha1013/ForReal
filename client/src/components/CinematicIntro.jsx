import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';

export const CinematicIntro = ({ isFirstLaunch, onComplete }) => {
  const [stage, setStage] = useState(0);

  // Quick exit if not first launch
  useEffect(() => {
    if (!isFirstLaunch) {
      const quickTimeout = setTimeout(onComplete, 1000);
      return () => clearTimeout(quickTimeout);
    }

    // Story Structure Timing (ms)
    // 0: Initial Start
    // 1: Chaos (0.5s - 4.5s)
    // 2: Silence (4.5s - 5.5s)
    // 3: A Signal (5.5s - 7.5s)
    // 4: Intelligence (7.5s - 10.5s)
    // 5: Debate (10.5s - 13.5s)
    // 6: AI (13.5s - 17.5s)
    // 7: Birth of ForReal (17.5s - 20.5s)
    // 8: Mission (20.5s - 25s)
    // 9: Transition (25s - 26.5s) -> triggers onComplete
    
    const sequence = [
      { stage: 1, delay: 500 },
      { stage: 2, delay: 4500 },
      { stage: 3, delay: 5500 },
      { stage: 4, delay: 7500 },
      { stage: 5, delay: 10500 },
      { stage: 6, delay: 13500 },
      { stage: 7, delay: 17500 },
      { stage: 8, delay: 20500 },
      { stage: 9, delay: 25000 },
    ];

    const timeouts = sequence.map((step) =>
      setTimeout(() => setStage(step.stage), step.delay)
    );

    const finishTimeout = setTimeout(() => {
      onComplete();
    }, 26500); // Allow 1.5s for final transition

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(finishTimeout);
    };
  }, [isFirstLaunch, onComplete]);

  if (!isFirstLaunch) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeInOut" }}
        className="fixed inset-0 bg-[#020202] z-[9999] flex items-center justify-center pointer-events-none"
      >
        <Logo size="xl" showWordmark={true} />
      </motion.div>
    );
  }

  // Helper arrays for animations
  const chaosWords = ['Fake', 'Bias', 'Noise', 'Misinformation', 'Opinions', 'Clickbait', 'Echo Chamber', 'Hate', 'Spam', 'Lies'];
  const intelligenceNodes = ['Truth', 'Logic', 'Evidence', 'Reason'];

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
      className="fixed inset-0 bg-[#020202] z-[9999] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* 1. Chaos */}
      <AnimatePresence>
        {stage === 1 && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.5, filter: 'blur(20px)' }}
            transition={{ duration: 1, ease: "easeInOut" }}
          >
            {chaosWords.map((word, i) => (
              <motion.span
                key={`chaos-${i}`}
                initial={{ opacity: 0, scale: 0, x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400 }}
                animate={{ 
                  opacity: [0, 0.8, 1], 
                  scale: [0.5, 2, 4], 
                  filter: ['blur(0px)', 'blur(2px)', 'blur(10px)'] 
                }}
                transition={{ 
                  duration: 3, 
                  delay: i * 0.2,
                  ease: "easeIn"
                }}
                className="absolute text-3xl md:text-5xl font-black text-white/40 uppercase tracking-tighter"
                style={{
                  transform: `rotate(${(Math.random() - 0.5) * 45}deg)`,
                }}
              >
                {word}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Silence is implicitly handled by stage 2 having no active elements rendered except the black background */}

      {/* 3, 4, 5, 6: Signal to AI Network */}
      <AnimatePresence>
        {stage >= 3 && stage < 7 && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }} // Collapses inward for stage 7
            transition={{ duration: 1.5, ease: "easeInOut" }}
          >
            {/* A Signal (Stage 3+) */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: stage >= 4 ? 0 : [0, 1, 1.2], opacity: stage >= 4 ? 0 : 1 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute w-2 h-2 bg-[#00C8FF] rounded-full shadow-[0_0_30px_10px_rgba(0,200,255,0.5)]"
            />
            
            {/* SVG Network Lines */}
            {stage >= 3 && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <g transform="translate(50%, 50%)">
                  {/* Expanding neural lines from center */}
                  <motion.circle
                    cx="0" cy="0" r="100"
                    fill="none" stroke="#00C8FF" strokeWidth="0.5"
                    initial={{ r: 0, opacity: 0 }}
                    animate={{ r: stage >= 5 ? 800 : 300, opacity: stage >= 6 ? 0.1 : 0.3 }}
                    transition={{ duration: stage >= 5 ? 4 : 2, ease: "easeOut" }}
                  />
                  <motion.circle
                    cx="0" cy="0" r="200"
                    fill="none" stroke="#00C8FF" strokeWidth="0.2"
                    initial={{ r: 0, opacity: 0 }}
                    animate={{ r: stage >= 5 ? 1000 : 500, opacity: stage >= 6 ? 0.05 : 0.2 }}
                    transition={{ duration: stage >= 5 ? 5 : 2.5, ease: "easeOut", delay: 0.2 }}
                  />
                  
                  {/* Connections between nodes (Stage 4+) */}
                  {stage >= 4 && intelligenceNodes.map((_, i) => (
                    <motion.line
                      key={`line-${i}`}
                      x1="0" y1="0"
                      x2={Math.cos(i * (Math.PI / 2) + Math.PI/4) * (stage >= 5 ? 250 : 150)}
                      y2={Math.sin(i * (Math.PI / 2) + Math.PI/4) * (stage >= 5 ? 250 : 150)}
                      stroke="#00C8FF" strokeWidth="1"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: stage === 6 && (i % 2 === 0) ? 0.1 : 0.6 }} // Stage 6: weak connections fade
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                    />
                  ))}

                  {/* Debate connections (Stage 5+) */}
                  {stage >= 5 && Array.from({length: 8}).map((_, i) => (
                    <motion.line
                      key={`debate-line-${i}`}
                      x1={Math.cos(i * (Math.PI / 4)) * 150} 
                      y1={Math.sin(i * (Math.PI / 4)) * 150}
                      x2={Math.cos((i+3) * (Math.PI / 4)) * 250} 
                      y2={Math.sin((i+3) * (Math.PI / 4)) * 250}
                      stroke="#00C8FF" strokeWidth="0.5"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: stage === 6 && (i % 3 !== 0) ? 0 : 0.4 }} // Stage 6 AI purges weak logic
                      transition={{ duration: 1, delay: i * 0.1 }}
                    />
                  ))}
                </g>
              </svg>
            )}

            {/* AI Pulse (Stage 6) */}
            <AnimatePresence>
              {stage === 6 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: 10, opacity: 0 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  className="absolute w-32 h-32 border-4 border-[#00C8FF] rounded-full"
                />
              )}
            </AnimatePresence>

            {/* Intelligence Nodes (Stage 4+) */}
            {stage >= 4 && intelligenceNodes.map((word, i) => (
              <motion.div
                key={`node-${i}`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: stage === 6 && (i % 2 === 0) ? 0.3 : 1, // AI keeps meaningful ones stronger
                  scale: 1,
                  x: Math.cos(i * (Math.PI / 2) + Math.PI/4) * (stage >= 5 ? 250 : 150),
                  y: Math.sin(i * (Math.PI / 2) + Math.PI/4) * (stage >= 5 ? 250 : 150)
                }}
                transition={{ duration: 1.5, delay: 0.5 + i * 0.2 }}
                className="absolute flex flex-col items-center justify-center"
              >
                <div className="w-3 h-3 bg-[#00C8FF] rounded-full shadow-[0_0_15px_5px_rgba(0,200,255,0.4)] mb-2" />
                <span className="text-white text-sm tracking-widest uppercase font-medium">{word}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Birth of ForReal (Logo transforms from collapse) */}
      <AnimatePresence>
        {stage >= 7 && stage < 9 && (
          <motion.div
            initial={{ scale: 0, opacity: 0, filter: 'blur(20px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: '-40vh', scale: 0.5, opacity: 0 }} // Stage 9: Shrinks to navbar
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute z-30 flex flex-col items-center justify-center"
          >
            <Logo size="2xl" showWordmark={true} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. Mission Text */}
      <AnimatePresence>
        {stage === 8 && (
          <div className="absolute z-20 flex flex-col items-center justify-center w-full mt-32">
            <div className="flex gap-6 overflow-hidden h-12 mb-4">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-2xl font-bold text-white tracking-widest uppercase"
              >
                Truth.
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
                className="text-2xl font-bold text-white tracking-widest uppercase"
              >
                Logic.
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 1.5 }}
                className="text-2xl font-bold text-[#00C8FF] tracking-widest uppercase"
              >
                Debate.
              </motion.span>
            </div>
            
            <motion.div
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, delay: 2.5 }}
              className="flex flex-col items-center gap-2"
            >
              <h2 className="text-xl md:text-3xl font-light text-text-muted tracking-tight">
                Where Ideas Compete.
              </h2>
              <h2 className="text-xl md:text-3xl font-medium text-white tracking-tight">
                Truth Prevails.
              </h2>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Ambient Glow (appears from stage 3 onwards) */}
      <AnimatePresence>
        {stage >= 3 && stage < 9 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.05 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 bg-[#00C8FF] pointer-events-none mix-blend-screen"
          />
        )}
      </AnimatePresence>
      
      {/* Skip Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
        onClick={onComplete}
        className="absolute bottom-8 right-8 text-xs font-medium text-white tracking-widest uppercase z-50 hover:text-[#00C8FF] transition-colors"
      >
        Skip Intro &rarr;
      </motion.button>
    </motion.div>
  );
};
