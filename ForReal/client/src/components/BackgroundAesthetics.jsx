import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedGrid = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-2]">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
  </div>
);

export const AmbientGlow = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none mix-blend-screen z-[-1]">
    {/* Top center indigo glow */}
    <motion.div
      animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 rounded-[100%] blur-[120px]"
    />
    
    {/* Bottom right fuchsia glow */}
    <motion.div
      animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.2, 1] }}
      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      className="absolute -bottom-[300px] -right-[100px] w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[150px]"
    />
    
    {/* Bottom left deep violet accent */}
    <motion.div
      animate={{ opacity: [0.1, 0.2, 0.1] }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      className="absolute -bottom-[200px] -left-[200px] w-[500px] h-[500px] bg-violet-900/30 rounded-full blur-[150px]"
    />
  </div>
);

export const Spotlight = () => (
  <div className="fixed inset-0 bg-[radial-gradient(circle_800px_at_50%_-30%,rgba(99,102,241,0.08),transparent)] pointer-events-none z-[-1]" />
);

export default function BackgroundAesthetics() {
  return (
    <>
      <div className="fixed inset-0 bg-dark-base z-[-3] pointer-events-none" />
      <AnimatedGrid />
      <AmbientGlow />
      <Spotlight />
    </>
  );
}
