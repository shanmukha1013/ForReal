import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedGrid = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-2]">
    <div
      className="absolute inset-[-100%] w-[300%] h-[300%] opacity-20"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        transform: 'perspective(1000px) rotateX(60deg) translateY(-100px) translateZ(-200px)',
        animation: 'gridMove 20s linear infinite',
      }}
    />
    <style>{`
      @keyframes gridMove {
        0% { transform: perspective(1000px) rotateX(60deg) translateY(0) translateZ(-200px); }
        100% { transform: perspective(1000px) rotateX(60deg) translateY(60px) translateZ(-200px); }
      }
    `}</style>
  </div>
);

export const GlowingBlobs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40 mix-blend-screen z-[-1]">
    <motion.div
      animate={{
        x: [0, 100, -50, 0],
        y: [0, -100, 50, 0],
        scale: [1, 1.2, 0.8, 1],
      }}
      transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-green-600/20 rounded-full blur-[100px]"
    />
    <motion.div
      animate={{
        x: [0, -100, 80, 0],
        y: [0, 80, -100, 0],
        scale: [1, 1.5, 0.9, 1],
      }}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-700/10 rounded-full blur-[120px]"
    />
    <motion.div
      animate={{
        opacity: [0.2, 0.5, 0.2],
      }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-[150px]"
    />
  </div>
);

export const Spotlight = () => (
  <motion.div
    animate={{
      opacity: [0.05, 0.15, 0.05],
    }}
    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
    className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.1)_0%,transparent_60%)] pointer-events-none z-[-1]"
  />
);

const floatingParticle = {
  animate: (i) => ({
    x: [0, Math.random() * 20 - 10, -Math.random() * 15 + 7, 0],
    y: [0, -Math.random() * 10, Math.random() * 15 - 5, 0],
    transition: {
      repeat: Infinity,
      duration: 5 + Math.random() * 5,
      ease: 'easeInOut',
      delay: i * 0.2,
    },
  }),
};

export const ParticleBackground = React.memo(() => {
  const particles = React.useRef(
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      width: 4 + Math.random() * 6,
      height: 4 + Math.random() * 6,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      opacity: 0.15 + Math.random() * 0.2,
      blur: Math.floor(Math.random() * 2) + 1,
    }))
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]" aria-hidden>
      {particles.current.map((p) => (
        <motion.div
          key={p.id}
          custom={p.id}
          variants={floatingParticle}
          animate="animate"
          className="absolute rounded-full bg-green-400"
          style={{
            width: p.width,
            height: p.height,
            top: p.top,
            left: p.left,
            opacity: p.opacity,
            filter: `blur(${p.blur}px)`,
          }}
        />
      ))}
    </div>
  );
});

export default function BackgroundAesthetics() {
  return (
    <>
      <div className="fixed inset-0 bg-[#050505] z-[-3] pointer-events-none" />
      <AnimatedGrid />
      <GlowingBlobs />
      <Spotlight />
      <ParticleBackground />
    </>
  );
}
