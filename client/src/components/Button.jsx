import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  fullWidth = false,
  ...props
}) => {
  const baseStyles = "relative inline-flex items-center justify-center font-semibold transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] rounded-xl outline-none select-none";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover shadow-[0_4px_14px_0_rgba(193,18,31,0.39)] hover:shadow-[0_6px_20px_rgba(193,18,31,0.23)] hover:-translate-y-[1px] disabled:bg-border-subtle disabled:text-text-muted disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed",
    secondary: "bg-card-dark text-white border border-border-subtle hover:bg-[#1a1a1a] hover:border-[#333] hover:-translate-y-[1px] disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed",
    ghost: "bg-transparent text-text-muted hover:text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed",
    danger: "bg-error/10 text-error hover:bg-error/20 hover:text-error disabled:opacity-50 disabled:cursor-not-allowed"
  };

  const sizes = {
    sm: "px-4 h-9 text-sm",
    md: "px-6 h-12 text-sm",
    lg: "px-8 h-14 text-base"
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      disabled={isDisabled}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <Loader2 className="animate-spin w-5 h-5 text-current" />
        </span>
      ) : null}
      
      <span className={`flex items-center justify-center gap-2 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </span>
    </button>
  );
};
