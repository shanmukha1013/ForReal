import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Premium Apple-grade easing curve
const EASE = [0.16, 1, 0.3, 1];

const PHASES = {
  START:    0,
  GLOW:     1,
  SWEEP:    2,
  LOGO:     3,
  TRUTH:    4,
  SHIT:     5,
  LINE:     6,
  EXIT:     7,
};

export default function Intro({ onFinish }) {
  const [phase, setPhase] = useState(PHASES.START);
  const timersRef = useRef([]);

  useEffect(() => {
    // Cinematic Timeline Orchestration
    const schedule = [
      [PHASES.GLOW,    500],
      [PHASES.SWEEP,   1200],
      [PHASES.LOGO,    2000],
      [PHASES.TRUTH,   2800],
      [PHASES.SHIT,    4000], // 1 second after TRUTH
      [PHASES.LINE,    4600],
      [PHASES.EXIT,    6500],
    ];

    timersRef.current = schedule.map(([nextPhase, delay]) =>
      setTimeout(() => {
        if (nextPhase === PHASES.EXIT) {
          setPhase(PHASES.EXIT);
          // Wait for exit animation to finish before unmounting via parent
          setTimeout(() => onFinish?.(), 1000);
        } else {
          setPhase(nextPhase);
        }
      }, delay)
    );

    return () => timersRef.current.forEach(clearTimeout);
  }, [onFinish]);

  const isExiting = phase === PHASES.EXIT;

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-black font-sans"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1, ease: EASE }}
        >
          {/* Subtle Crimson Glow */}
          <AnimatePresence>
            {phase >= PHASES.GLOW && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
              >
                <div className="w-[80vw] h-[80vw] sm:w-[600px] sm:h-[600px] rounded-full bg-[#C1121F] blur-[100px] mix-blend-screen" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Thin red light sweep */}
          <AnimatePresence>
            {phase === PHASES.SWEEP && (
              <motion.div
                initial={{ left: "-100%" }}
                animate={{ left: "200%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute top-1/2 -translate-y-1/2 w-[2px] h-[300px] bg-[#C1121F] z-10 shadow-[0_0_20px_#C1121F] rotate-12 blur-[1px]"
              />
            )}
          </AnimatePresence>

          <div className="relative z-20 flex flex-col items-center justify-center text-center">
            {/* Logo */}
            <AnimatePresence>
              {phase >= PHASES.LOGO && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  transition={{ duration: 1.2, ease: EASE }}
                  className="mb-8"
                >
                  <h1 
                    className="text-5xl sm:text-7xl font-black select-none tracking-tight"
                    style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                  >
                    <span style={{ color: "#000000", WebkitTextStroke: "1.5px #ffffff" }}>FOR</span>
                    <span style={{ color: "#C1121F" }}>REAL</span>
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TRUTH. LOGIC. DEBATE. */}
            <AnimatePresence>
              {phase >= PHASES.TRUTH && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: EASE }}
                  className="mb-12"
                >
                  <p className="text-[#FFFFFF] text-sm sm:text-base font-bold tracking-[0.3em]">
                    TRUTH. LOGIC. DEBATE.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* We Don't Talk Shit & Line */}
            <AnimatePresence>
              {phase >= PHASES.SHIT && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, ease: EASE }}
                  className="relative flex flex-col items-center"
                >
                  <p className="text-[#A1A1AA] text-xs sm:text-sm font-semibold tracking-[0.1em] uppercase mb-3">
                    We Don't Talk Shit.
                  </p>
                  
                  {phase >= PHASES.LINE && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "100%", opacity: 1 }}
                      transition={{ duration: 1, ease: EASE }}
                      className="h-[1px] bg-[#C1121F] shadow-[0_0_8px_#C1121F]"
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}