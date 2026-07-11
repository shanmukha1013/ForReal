import React from 'react';

export const Logo = ({ className = "", size = "md", showWordmark = true }) => {
  const sizes = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl",
    xl: "text-8xl",
  };
  
  const selectedSize = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className={`${selectedSize} font-black tracking-tighter leading-none`}>
        <span className="text-white">F</span>
        <span className="text-primary">R</span>
      </div>
      
      {showWordmark && (
        <div className={`${size === 'xl' ? 'text-5xl' : size === 'lg' ? 'text-3xl' : 'text-xl'} font-bold tracking-tight`}>
          <span className="text-white">For</span>
          <span className="text-primary">Real</span>
        </div>
      )}
    </div>
  );
};
