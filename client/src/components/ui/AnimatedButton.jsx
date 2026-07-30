import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '', 
  disabled = false,
  type = 'button'
}) => {
  const baseStyles = "relative px-4 py-2 rounded-xl font-medium overflow-hidden transition-colors flex items-center justify-center gap-2 text-sm";
  
  const variants = {
    primary: "bg-card-elevated text-white border border-primary/40 hover:border-primary shadow-glow hover:bg-card-elevated/80",
    secondary: "bg-card-dark text-white border border-border-muted hover:border-white/40",
    ghost: "bg-transparent text-text-muted hover:text-white hover:bg-white/5",
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {/* Optional subtle inner glow for primary */}
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-primary/10 opacity-0 hover:opacity-100 transition-opacity" />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};
