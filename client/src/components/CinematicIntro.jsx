import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const CinematicIntro = ({ onComplete }) => {
  const [stage, setStage] = useState(0);

  // Flow:
  // 0: Black Screen
  // 1: Logo
  // 2: Logo + Red Glow
  // 3: WE
  // 4: DON'T
  // 5: TALK
  // 6: SHIT
  // 7: Fade Out

  useEffect(() => {
    const sequence = [
      { stage: 1, delay: 500 },
      { stage: 2, delay: 1500 },
      { stage: 3, delay: 2500 },
      { stage: 4, delay: 3000 },
      { stage: 5, delay: 3500 },
      { stage: 6, delay: 4000 },
      { stage: 7, delay: 5500 },
    ];

    const timeouts = sequence.map((step) =>
      setTimeout(() => setStage(step.stage), step.delay)
    );

    // Call onComplete after the final fade out
    const finishTimeout = setTimeout(() => {
      onComplete();
    }, 6500);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(finishTimeout);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {stage < 7 && (
        <motion.div
          key="intro-container"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 bg-bg-dark z-[9999] flex flex-col items-center justify-center overflow-hidden"
        >
          <div className="relative flex flex-col items-center justify-center w-full h-full">
            {/* Red Glow */}
            <AnimatePresence>
              {stage >= 2 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  className="absolute w-[40vw] h-[40vw] bg-primary/20 rounded-full blur-[100px] pointer-events-none"
                />
              )}
            </AnimatePresence>

            {/* Logo */}
            <AnimatePresence>
              {stage >= 1 && stage < 3 && (
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.1 }}
                  transition={{ duration: 1 }}
                  className="text-4xl md:text-6xl font-bold tracking-tight text-white z-10"
                >
                  ForReal
                </motion.h1>
              )}
            </AnimatePresence>

            {/* Words */}
            <div className="absolute flex gap-3 md:gap-6 text-3xl md:text-5xl font-black tracking-tighter uppercase z-20">
              <AnimatePresence>
                {stage >= 3 && (
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-white"
                  >
                    WE
                  </motion.span>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {stage >= 4 && (
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-white"
                  >
                    DON'T
                  </motion.span>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {stage >= 5 && (
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-white"
                  >
                    TALK
                  </motion.span>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {stage >= 6 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 2, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ type: "spring", damping: 12, stiffness: 100 }}
                    className="text-primary"
                  >
                    SHIT
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
