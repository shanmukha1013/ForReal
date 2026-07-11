import React from 'react';

export const Card = ({ children, className = '', noPadding = false, ...props }) => {
  return (
    <div 
      className={`
        w-full
        bg-[#0C0C0C]
        border border-white/[0.04]
        rounded-[28px]
        shadow-[0_16px_40px_-8px_rgba(0,0,0,0.8)]
        overflow-hidden
        ${noPadding ? '' : 'p-8 md:p-10'}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
