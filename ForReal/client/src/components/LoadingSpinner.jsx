import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingSpinner({ size = "md", fullScreen = false }) {
  const containerClasses = fullScreen 
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
    : "flex flex-col items-center justify-center p-8 w-full";

  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl"
  };

  return (
    <div className={containerClasses}>
      <motion.div
        animate={{ 
          opacity: [0.3, 1, 0.3],
          scale: [0.95, 1, 0.95],
          filter: ["blur(2px)", "blur(0px)", "blur(2px)"]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className={`font-black tracking-tight select-none ${sizeClasses[size]}`}
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <span style={{ color: "#000000", WebkitTextStroke: size === 'sm' ? "1px #ffffff" : "1.5px #ffffff" }}>FOR</span>
        <span style={{ color: "#C1121F" }}>REAL</span>
      </motion.div>
    </div>
  );
}
