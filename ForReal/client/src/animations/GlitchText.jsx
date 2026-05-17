import React, { useState, useEffect, forwardRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import './Intro.css';

/**
 * GlitchText - Premium Chromatic Aberration Text Component
 * * @param {string} text - The string to render and glitch.
 * @param {elementType} as - Polymorphic prop to render as h1, p, span, etc.
 * @param {string} trigger - 'mount' | 'hover' | 'interval' | 'none'
 * @param {number} delay - Initial animation delay in seconds.
 * @param {number} intervalDelay - Ms between glitches if trigger="interval"
 * @param {number} glitchDuration - Ms the glitch effect lasts per trigger
 */
const GlitchText = forwardRef(({
  text,
  as: Component = "span",
  className = "",
  delay = 0,
  trigger = "mount", 
  intervalDelay = 6000,
  glitchDuration = 800,
  ...props
}, ref) => {
  const [isGlitching, setIsGlitching] = useState(false);

  // Memoize the trigger function so it doesn't cause unnecessary re-renders in effects
  const triggerGlitch = useCallback(() => {
    if (isGlitching) return;
    setIsGlitching(true);
    
    // Stop the glitch after the configured duration
    setTimeout(() => setIsGlitching(false), glitchDuration);
  }, [isGlitching, glitchDuration]);

  // Handle Mount & Interval based triggers
  useEffect(() => {
    let startTimer;
    let intervalTimer;

    if (trigger === "mount") {
      // Trigger once after the initial reveal delay + 500ms for dramatic effect
      startTimer = setTimeout(triggerGlitch, (delay * 1000) + 500);
    } 
    else if (trigger === "interval") {
      // Wait for reveal, trigger once, then loop
      startTimer = setTimeout(() => {
        triggerGlitch();
        intervalTimer = setInterval(triggerGlitch, intervalDelay);
      }, (delay * 1000) + 500);
    }

    return () => {
      clearTimeout(startTimer);
      clearInterval(intervalTimer);
    };
  }, [trigger, delay, triggerGlitch, intervalDelay]);

  // Handle Hover triggers
  const handleMouseEnter = (e) => {
    if (trigger === 'hover') triggerGlitch();
    if (props.onMouseEnter) props.onMouseEnter(e);
  };

  // Convert the chosen DOM element into a Framer Motion component dynamically
  const MotionComponent = motion(Component);

  return (
    <MotionComponent
      ref={ref}
      onMouseEnter={handleMouseEnter}
      initial={{ opacity: 0, filter: "blur(12px)", y: 15 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ 
        duration: 0.9, 
        delay, 
        ease: [0.16, 1, 0.3, 1] // Apple-grade cinematic cubic-bezier
      }}
      className={`relative inline-block isolate ${className}`}
      {...props}
    >
      {/* Base visible layer. 
        Subtly jitters 1px when glitching to enhance the physical feel.
      */}
      <span 
        className={`relative z-10 transition-transform duration-75 ${
          isGlitching ? 'translate-x-[1px]' : 'translate-x-0'
        }`}
      >
        {text}
      </span>
      
      {/* The GPU-accelerated Glitch Layers 
        We use strict accessibility attributes so screen readers don't read the text 3 times.
      */}
      {isGlitching && (
        <span 
          className="absolute inset-0 z-0 text-glitch-premium select-none pointer-events-none" 
          data-text={text}
          aria-hidden="true"
        >
          {text}
        </span>
      )}
    </MotionComponent>
  );
});

GlitchText.displayName = "GlitchText";

export default GlitchText;