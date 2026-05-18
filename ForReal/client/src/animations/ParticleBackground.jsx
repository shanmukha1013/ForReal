import { useMemo, useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Enterprise Particle Engine
 * Generates a hardware-accelerated, organic atmospheric background.
 * Automatically scales down for mobile and respects accessibility preferences.
 */
export default function ParticleBackground({ 
  baseCount = 40, 
  color = "bg-emerald-500" 
}) {
  const shouldReduceMotion = useReducedMotion();
  const [particleCount, setParticleCount] = useState(baseCount);

  // Responsive scaling: Reduce particle count on mobile to save battery/CPU
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setParticleCount(Math.floor(baseCount * 0.5)); // 50% fewer particles on mobile
      } else {
        setParticleCount(baseCount);
      }
    };

    // Initial check
    handleResize();

    // Debounced resize listener
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 200);
    };

    window.addEventListener('resize', debouncedResize, { passive: true });
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [baseCount]);

  // Memoize the particle generation to prevent re-calculations
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map((_, i) => {
      // Create a pseudo-random depth calculation
      const depth = Math.random(); // 0 (far) to 1 (close)
      
      // Far particles are small and sharp, close particles are large and blurred
      const size = depth * 4 + 1; // 1px to 5px
      const blur = depth > 0.6 ? `${(depth - 0.6) * 10}px` : '0px';
      
      // Calculate organic X-axis sway distance based on size
      const sway = (Math.random() * 40 - 20) * (depth + 0.5); // -30px to +30px sway

      return {
        id: i,
        size: `${size}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 20 + 100}%`, // Start below the viewport (100% - 120%)
        duration: Math.random() * 20 + 15, // Ultra-smooth slow movement (15s to 35s)
        delay: Math.random() * -30, // Negative delay means they are already on screen when loaded
        baseOpacity: depth * 0.4 + 0.1, // Far = dimmer (0.1), Close = brighter (0.5)
        blur: blur,
        swayX: sway,
      };
    });
  }, [particleCount]);

  return (
    <div 
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true" // Hide from screen readers, purely decorative
    >
      {particles.map((p) => {
        // If reduced motion is preferred, render static glowing dots
        if (shouldReduceMotion) {
          return (
            <div
              key={p.id}
              className={`absolute rounded-full ${color}`}
              style={{
                width: p.size,
                height: p.size,
                left: p.left,
                top: `${Math.random() * 100}%`, // Scatter statically across screen
                opacity: p.baseOpacity,
                filter: `blur(${p.blur})`,
              }}
            />
          );
        }

        // Full cinematic animation
        return (
          <motion.div
            key={p.id}
            className={`absolute rounded-full ${color} will-change-transform`}
            style={{
              width: p.size,
              height: p.size,
              left: p.left,
              top: p.top,
              filter: `blur(${p.blur})`,
            }}
            initial={{ 
              opacity: 0, 
              y: 0, 
              x: 0 
            }}
            animate={{
              // Drift upward off-screen
              y: "-150vh", 
              // Organic sine-wave-like sway on the X axis
              x: [0, p.swayX, -p.swayX, 0], 
              // Fade in, hold, fade out
              opacity: [0, p.baseOpacity, p.baseOpacity, 0], 
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "linear",
              // Use independent easing for the sway to make it feel natural, not mechanical
              x: {
                duration: p.duration * 0.6,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
              }
            }}
          />
        );
      })}
    </div>
  );
}