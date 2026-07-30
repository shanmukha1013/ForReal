import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';

export const CinematicIntro = ({ onComplete }) => {
  const [stage, setStage] = useState(0);

  // Flow Timing (ms):
  // 0: Black Screen
  // 1: 500ms - Soft blue ambient light
  // 2: 2500ms - Logo fades in
  // 3: 4500ms - TRUTH. LOGIC. DEBATE.
  // 4: 7500ms - "We Don't Talk Shit."
  // 5: 10500ms - Fade out sequence
  // 6: 12000ms - Complete

  useEffect(() => {
    const sequence = [
      { stage: 1, delay: 500 },
      { stage: 2, delay: 2500 },
      { stage: 3, delay: 4500 },
      { stage: 4, delay: 7500 },
      { stage: 5, delay: 10500 },
    ];

    const timeouts = sequence.map((step) =>
      setTimeout(() => setStage(step.stage), step.delay)
    );

    const finishTimeout = setTimeout(() => {
      onComplete();
    }, 12000);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(finishTimeout);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage < 5 && (
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
            
            {/* 1. Soft Blue Ambient Light */}
            <AnimatePresence>
              {stage >= 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 0.12, scale: 1 }}
                  transition={{ duration: 4, ease: "easeOut" }}
                  className="absolute w-[80vw] h-[80vw] md:w-[40vw] md:h-[40vw] bg-[#00C8FF] rounded-full blur-[140px] pointer-events-none"
                />
              )}
            </AnimatePresence>

            {/* 2. Logo */}
            <AnimatePresence>
              {stage >= 2 && stage < 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                  transition={{ duration: 1.5, ease: [0.25, 1, 0.5, 1] }}
                  className="absolute z-10"
                >
                  <Logo size="xl" showWordmark={true} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Story Text Sequence */}
            <div className="absolute z-20 flex flex-col items-center justify-center w-full">
              
              <AnimatePresence mode="wait">
                {stage === 3 && (
                  <motion.div
                    key="text-1"
                    initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="flex flex-col gap-2 md:gap-4"
                  >
                    <h2 className="text-3xl md:text-5xl font-medium text-white tracking-widest uppercase">
                      TRUTH.
                    </h2>
                    <h2 className="text-3xl md:text-5xl font-medium text-white tracking-widest uppercase">
                      LOGIC.
                    </h2>
                    <h2 className="text-3xl md:text-5xl font-medium text-primary tracking-widest uppercase">
                      DEBATE.
                    </h2>
                  </motion.div>
                )}

                {stage === 4 && (
                  <motion.h2
                    key="text-2"
                    initial={{ opacity: 0, scale: 0.9, filter: 'blur(12px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(12px)' }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="text-3xl md:text-5xl font-light text-white tracking-tight"
                  >
                    We Don't Talk Shit.
                  </motion.h2>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
