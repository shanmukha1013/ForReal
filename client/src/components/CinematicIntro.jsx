import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';

// Pre-generate random positions for particles to avoid hydration mismatches
const PARTICLES = Array.from({ length: 40 }).map((_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * 400,
  y: (Math.random() - 0.5) * 400,
  delay: Math.random() * 1.5,
}));

export const CinematicIntro = ({ onComplete }) => {
  const [stage, setStage] = useState(0);

  // Flow Timing (ms):
  // 0: Black Screen
  // 1: 500ms - Soft ambient light
  // 2: 2000ms - Particles appear
  // 3: 4000ms - Particles merge
  // 4: 5000ms - Logo forms
  // 5: 6000ms - ForReal wordmark
  // 6: 7500ms - "Real conversations."
  // 7: 9500ms - "Honest opinions."
  // 8: 11500ms - "Meaningful debates."
  // 9: 13500ms - "No fake engagement."
  // 10: 15500ms - "No meaningless scrolling."
  // 11: 18000ms - "WE DON'T TALK SHIT."
  // 12: 21000ms - "Welcome to ForReal."
  // 13: 24000ms - Fade out sequence
  // 14: 25500ms - Complete

  useEffect(() => {
    const sequence = [
      { stage: 1, delay: 500 },
      { stage: 2, delay: 2000 },
      { stage: 3, delay: 4000 },
      { stage: 4, delay: 5000 },
      { stage: 5, delay: 6000 },
      { stage: 6, delay: 7500 },
      { stage: 7, delay: 9500 },
      { stage: 8, delay: 11500 },
      { stage: 9, delay: 13500 },
      { stage: 10, delay: 15500 },
      { stage: 11, delay: 18000 },
      { stage: 12, delay: 21000 },
      { stage: 13, delay: 24000 },
    ];

    const timeouts = sequence.map((step) =>
      setTimeout(() => setStage(step.stage), step.delay)
    );

    const finishTimeout = setTimeout(() => {
      onComplete();
    }, 25500);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(finishTimeout);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage < 13 && (
        <motion.div
          key="cinematic-container"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: [0.25, 1, 0.5, 1] }}
          className="fixed inset-0 bg-[#000000] z-[9999] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Subtle noise over black */}
          <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay pointer-events-none" />

          <div className="relative flex flex-col items-center justify-center w-full h-full max-w-4xl px-6 text-center">
            
            {/* 1. Soft Crimson Ambient Light */}
            <AnimatePresence>
              {stage >= 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 0.15, scale: 1 }}
                  transition={{ duration: 4, ease: "easeOut" }}
                  className="absolute w-[80vw] h-[80vw] md:w-[40vw] md:h-[40vw] bg-primary rounded-full blur-[140px] pointer-events-none"
                />
              )}
            </AnimatePresence>

            {/* 2 & 3. Particles Merging */}
            <AnimatePresence>
              {stage >= 2 && stage < 4 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {PARTICLES.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: p.x, y: p.y, scale: 0 }}
                      animate={
                        stage === 2 
                          ? { opacity: 0.8, x: p.x * 1.2, y: p.y * 1.2, scale: 1 } 
                          : { opacity: 0, x: 0, y: 0, scale: 0 }
                      }
                      transition={{ 
                        duration: stage === 2 ? 2 : 1, 
                        delay: stage === 2 ? p.delay : 0,
                        ease: "easeInOut" 
                      }}
                      className="absolute w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(193,18,31,0.8)]"
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>

            {/* 4 & 5. Logo and Wordmark */}
            <AnimatePresence>
              {stage >= 4 && stage < 6 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                  transition={{ duration: 1.5, ease: [0.25, 1, 0.5, 1] }}
                  className="absolute z-10"
                >
                  <Logo size="xl" showWordmark={stage >= 5} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Story Text Sequence */}
            <div className="absolute z-20 flex flex-col items-center justify-center w-full">
              
              <AnimatePresence mode="wait">
                {stage === 6 && (
                  <motion.h2
                    key="text-1"
                    initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="text-3xl md:text-5xl font-medium text-text-muted tracking-tight"
                  >
                    Real conversations.
                  </motion.h2>
                )}
                
                {stage === 7 && (
                  <motion.h2
                    key="text-2"
                    initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="text-3xl md:text-5xl font-medium text-text-muted tracking-tight"
                  >
                    Honest opinions.
                  </motion.h2>
                )}

                {stage === 8 && (
                  <motion.h2
                    key="text-3"
                    initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="text-3xl md:text-5xl font-medium text-text-muted tracking-tight"
                  >
                    Meaningful debates.
                  </motion.h2>
                )}

                {stage === 9 && (
                  <motion.h2
                    key="text-4"
                    initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="text-3xl md:text-5xl font-medium text-white tracking-tight"
                  >
                    No fake engagement.
                  </motion.h2>
                )}

                {stage === 10 && (
                  <motion.h2
                    key="text-5"
                    initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="text-3xl md:text-5xl font-medium text-white tracking-tight"
                  >
                    No meaningless scrolling.
                  </motion.h2>
                )}

                {stage === 11 && (
                  <motion.h2
                    key="text-6"
                    initial={{ opacity: 0, scale: 0.9, filter: 'blur(12px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(12px)' }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter"
                  >
                    WE DON'T <span className="text-primary drop-shadow-[0_0_20px_rgba(193,18,31,0.6)]">TALK SHIT.</span>
                  </motion.h2>
                )}

                {stage === 12 && (
                  <motion.div
                    key="text-7"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="flex flex-col items-center gap-6"
                  >
                    <Logo size="md" showWordmark={false} />
                    <h2 className="text-2xl md:text-4xl font-semibold text-text-main tracking-tight">
                      Welcome to ForReal.
                    </h2>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
