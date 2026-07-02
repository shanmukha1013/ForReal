import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedGrid = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-2]">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
  </div>
);

export const AmbientGlow = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none mix-blend-screen z-[-1]">
    {/* Subtle central green glow */}
    <motion.div
      animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.05, 1] }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#22C55E]/10 rounded-[100%] blur-[120px]"
    />
  </div>
);

export const Spotlight = () => (
  <div className="fixed inset-0 bg-[radial-gradient(circle_800px_at_50%_-30%,rgba(34,197,94,0.05),transparent)] pointer-events-none z-[-1]" />
);

export default function BackgroundAesthetics() {
  return (
    <>
      <div className="fixed inset-0 bg-[#050505] z-[-3] pointer-events-none" />
      <AnimatedGrid />
      <AmbientGlow />
      <Spotlight />
    </>
  );
}
