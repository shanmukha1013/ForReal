import React, { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';

export const Input = forwardRef(({ 
  label, 
  error, 
  className = '', 
  id, 
  type = 'text', 
  ...props 
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <label 
          htmlFor={id} 
          className={`text-sm font-medium transition-colors duration-300 ${isFocused ? 'text-white' : 'text-text-muted'}`}
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          id={id}
          ref={ref}
          type={type}
          onFocus={(e) => {
            setIsFocused(true);
            if (props.onFocus) props.onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (props.onBlur) props.onBlur(e);
          }}
          className={`
            w-full 
            h-12
            bg-[#0F0F0F] 
            border 
            ${error ? 'border-error' : isFocused ? 'border-primary' : 'border-white/[0.04]'}
            text-text-main 
            rounded-2xl 
            px-4
            text-sm
            outline-none
            transition-all duration-300
            hover:border-white/[0.08]
            placeholder:text-transparent
            autofill:bg-[#0F0F0F] autofill:text-white
            ${className}
          `}
          {...props}
        />
        
        {/* Subtle glow on focus */}
        {isFocused && !error && (
          <motion.div 
            layoutId={`glow-${id}`}
            className="absolute inset-0 rounded-xl pointer-events-none shadow-[0_0_12px_rgba(193,18,31,0.3)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>

      {error && (
        <span className="text-error text-xs font-medium mt-1">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
