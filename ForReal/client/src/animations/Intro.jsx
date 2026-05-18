import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CinematicOverlay from './CinematicOverlay';
import ParticleBackground from './ParticleBackground';
import GlitchText from './GlitchText';

// ─── Configuration ────────────────────────────────────────────────────────
const FAKE_TEXTS = [
  "FAKE NEWS", "FAKE GURUS", "TOXIC COMMENTS", "LIES",
  "FAKE MOTIVATION", "FAKE PEOPLE", "NOISE", "CLOUT",
  "MANIPULATION", "DRAMA", "PROPAGANDA", "ILLUSIONS",
];

// Premium Apple-grade easing curve
const EASE = [0.16, 1, 0.3, 1];

const PHASES = {
  CHAOS:   0,   // Fake text chaos everywhere
  FOCUS:   1,   // Texts blur out, short "Fr." logo appears
  REVEAL:  2,   // "FORREAL" logo blasts in
  TAGLINE: 3,   // Tagline + Glitch effect
  LOADER:  4,   // Final truth statement + Loading bar
  EXIT:    5,   // Full app reveal
};

// ─── Framer Variants ──────────────────────────────────────────────────────
const fakeTextVariants = (i) => ({
  initial: {
    opacity: 0,
    scale: 0.6,
    x: Math.random() * 800 - 400,
    y: Math.random() * 600 - 300,
    rotate: Math.random() * 40 - 20,
    filter: "blur(12px)",
  },
  animate: {
    opacity: [0, 0.3, 0.05],
    scale: [0.6, 1.1, 0.9],
    filter: ["blur(12px)", "blur(2px)", "blur(16px)"],
    transition: {
      duration: 3,
      delay: i * 0.12,
      ease: "easeInOut",
    },
  },
  exit: {
    opacity: 0,
    scale: 1.2,
    filter: "blur(24px)",
    transition: { duration: 1, ease: "easeIn" },
  },
});

// ─── Main Component ───────────────────────────────────────────────────────
export default function Intro({ onFinish }) {
  const [phase, setPhase] = useState(PHASES.CHAOS);
  const timersRef = useRef([]);

  useEffect(() => {
    // Enterprise Timeline Orchestration
    const schedule = [
      [PHASES.FOCUS,   1800],
      [PHASES.REVEAL,  3200],
      [PHASES.TAGLINE, 4600],
      [PHASES.LOADER,  5800],
      [PHASES.EXIT,    8500],
    ];

    timersRef.current = schedule.map(([nextPhase, delay]) =>
      setTimeout(() => {
        if (nextPhase === PHASES.EXIT) {
          setPhase(PHASES.EXIT);
          // Wait for exit animation to finish before unmounting via parent
          setTimeout(() => onFinish?.(), 1200);
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
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-zinc-950 font-sans"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(16px)", scale: 1.05 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          {/* 1. Deep Interactive Background Layers */}
          <CinematicOverlay interactive={true} opacity={1} />
          <ParticleBackground />

          {/* 2. Phase 0: Chaos (The "Shit" we don't talk) */}
          <AnimatePresence>
            {phase < PHASES.REVEAL && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
                {FAKE_TEXTS.map((text, i) => (
                  <motion.div
                    key={text}
                    className="absolute text-xl sm:text-3xl font-bold tracking-widest text-zinc-500/20 uppercase whitespace-nowrap"
                    variants={fakeTextVariants(i)}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    {text}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* 3. Foreground Brand Sequence */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center w-full max-w-2xl px-6">
            
            {/* Status Indicator */}
            <AnimatePresence>
              {phase >= PHASES.REVEAL && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, ease: EASE }}
                  className="mb-6 flex items-center gap-2 rounded-full border border-white/[0.08] bg-zinc-900/60 backdrop-blur-md px-3 py-1.5 shadow-xl"
                >
                  <span className="status-dot-wrapper">
                    <span className="status-dot-ping" />
                    <span className="status-dot-core" />
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-300">
                    SYSTEM SECURE · V1.0
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Logo Sequence */}
            <AnimatePresence mode="wait">
              {phase === PHASES.FOCUS && (
                <motion.div
                  key="short-logo"
                  initial={{ opacity: 0, scale: 0.8, filter: "blur(12px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.1, filter: "blur(12px)" }}
                  transition={{ duration: 1, ease: EASE }}
                  className="text-5xl font-bold tracking-tighter text-zinc-400"
                >
                  Fr.
                </motion.div>
              )}

              {phase >= PHASES.REVEAL && (
                <motion.h1
                  key="full-logo"
                  initial={{ opacity: 0, y: 20, filter: "blur(12px)", letterSpacing: "12px" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)", letterSpacing: "-2px" }}
                  transition={{ duration: 1.2, ease: EASE }}
                  className="text-6xl sm:text-8xl font-black text-white drop-shadow-2xl"
                >
                  FOR<span className="text-gradient-brand">REAL</span>
                </motion.h1>
              )}
            </AnimatePresence>

            {/* Tagline & Glitch Effect */}
            <AnimatePresence>
              {phase >= PHASES.TAGLINE && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 flex flex-col items-center gap-8 w-full"
                >
                  <GlitchText 
                    text="WE DON'T TALK SHIT." 
                    as="h2"
                    trigger="mount"
                    delay={0.2}
                    className="text-sm sm:text-base font-semibold tracking-[0.4em] text-zinc-400"
                  />

                  {/* Final Loader Sequence */}
                  <AnimatePresence>
                    {phase >= PHASES.LOADER && (
                      <motion.div
                        initial={{ opacity: 0, y: 15, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.8, ease: EASE }}
                        className="flex flex-col items-center w-full"
                      >
                        <div className="flex items-center gap-3 overflow-hidden rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-2.5 backdrop-blur-md shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                          <span className="text-xs sm:text-sm font-bold tracking-[0.15em] text-emerald-400">
                            SPREAD TRUTH. DEBATE HONESTLY.
                          </span>
                        </div>

                        {/* Premium Cinematic Loading Track */}
                        <div className="mt-8 h-[2px] w-64 overflow-hidden rounded-full bg-zinc-800 relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skeleton-loader" />
                          <motion.div
                            className="absolute top-0 left-0 h-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2.2, ease: [0.76, 0, 0.24, 1] }} // Fast start, slow finish
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}