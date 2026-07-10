import React from 'react';

export const Card = ({ children, className = '', hover = false }) => {
  return (
    <div className={`bg-card-dark border border-border-subtle rounded-xl p-6 ${hover ? 'transition-property-common duration-normal hover:border-primary/30 hover:shadow-glow' : ''} ${className}`}>
      {children}
    </div>
  );
};
