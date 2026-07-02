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
      className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#C1121F]/10 rounded-[100%] blur-[120px]"
    />
  </div>
);

export const Spotlight = () => (
  <div className="fixed inset-0 bg-[radial-gradient(circle_800px_at_50%_-30%,rgba(193,18,31,0.05),transparent)] pointer-events-none z-[-1]" />
);

export const Noise = () => (
  <div className="fixed inset-0 z-[-1] pointer-events-none opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
);

export default function BackgroundAesthetics() {
  return (
    <>
      <div className="fixed inset-0 bg-[#000000] z-[-3] pointer-events-none" />
      <AmbientGlow />
      <Spotlight />
      <Noise />
    </>
  );
}
