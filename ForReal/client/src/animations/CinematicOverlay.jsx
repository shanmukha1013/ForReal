import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import './Intro.css';

// ─── Utility Hooks ──────────────────────────────────────────────────────────

/**
 * Custom hook to track mouse position with high-performance springs.
 * Bypasses React state to avoid re-renders, updating DOM directly via Framer Motion.
 */
function useSmoothMouseTracking() {
  const mouseX = useMotionValue(typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const mouseY = useMotionValue(typeof window !== 'undefined' ? window.innerHeight / 2 : 0);

  // Apply Apple-like fluidity to the tracking (stiff but highly damped)
  const springConfig = { damping: 40, stiffness: 150, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    // Only track if user is using a primary pointer device (mouse)
    if (window.matchMedia("(pointer: fine)").matches) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mouseX, mouseY]);

  return { smoothX, smoothY };
}

// ─── Sub-Components (Memoized for Performance) ──────────────────────────────

/**
 * Film Grain Noise Layer
 * Memoized because noise is computationally expensive to repaint.
 */
const NoiseLayer = React.memo(function NoiseLayer() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2, ease: "easeOut" }}
      className="absolute inset-0 z-[1] pointer-events-none mix-blend-overlay"
    >
      <div className="cinematic-noise will-change-transform" />
    </motion.div>
  );
});

/**
 * Deep Radial Vignette
 * Pushes the user's focal point to the center of the screen.
 */
const VignetteLayer = React.memo(function VignetteLayer() {
  return (
    <div 
      className="absolute inset-0 z-[2] pointer-events-none"
      style={{
        background: 'radial-gradient(circle at center, transparent 0%, #09090b 85%)',
      }}
      aria-hidden="true"
    />
  );
});

// ─── Main Component ─────────────────────────────────────────────────────────

/**
 * CinematicOverlay
 * The foundational layer of the application. Provides noise, vignette, and 
 * an interactive ambient brand glow that reacts to the user's cursor.
 * * @param {Object} props
 * @param {number} props.opacity - Base opacity of the entire overlay (default: 1)
 * @param {boolean} props.interactive - Whether the glow tracks the mouse (default: true)
 */
export default function CinematicOverlay({ opacity = 1, interactive = true }) {
  const { smoothX, smoothY } = useSmoothMouseTracking();
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Capture window size for relative transformations
  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Map mouse position to a subtle background shift (-15% to 15% movement)
  // This ensures the glow moves slightly in the direction of the mouse.
  const glowX = useTransform(smoothX, [0, windowSize.width], ['-65%', '-35%']);
  const glowY = useTransform(smoothY, [0, windowSize.height], ['20%', '60%']);

  return (
    <motion.div 
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-zinc-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: opacity }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* 1. Base Grain Layer */}
      <NoiseLayer />
      
      {/* 2. Deep Focus Vignette */}
      <VignetteLayer />
      
      {/* 3. Interactive Brand Glow Layer */}
      {/* We use translate3d to force hardware acceleration on the GPU */}
      <motion.div 
        className="absolute bottom-0 left-1/2 h-[80vh] w-[100vw] rounded-full blur-[120px] pointer-events-none z-[3]"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.12) 0%, transparent 60%)',
          x: interactive && windowSize.width > 0 ? glowX : '-50%',
          y: interactive && windowSize.height > 0 ? glowY : '40%',
          // Add a subtle breathing pulse independent of the mouse
          scale: 1, 
        }}
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* 4. Top Ambient Light Wash (Imitates overhead studio lighting) */}
      <div 
        className="absolute top-0 left-0 w-full h-32 pointer-events-none z-[3]"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.02) 0%, transparent 100%)'
        }}
      />
    </motion.div>
  );
}