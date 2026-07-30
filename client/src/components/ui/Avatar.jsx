import React, { useState, useEffect } from 'react';

export const Avatar = ({ src, username, size = 'md', className = '' }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-2xl'
  };

  const initial = username ? username.charAt(0).toUpperCase() : '?';
  const imgUrl = src?.trim() || null;
  const showFallback = !imgUrl || hasError;

  return (
    <div
      className={`relative rounded-full shrink-0 overflow-hidden border border-border-subtle flex items-center justify-center bg-primary/10 ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      {/* Initials fallback */}
      <span className="font-bold text-primary select-none absolute" aria-hidden="true">
        {initial}
      </span>

      {/* Image overlaid on top */}
      {!showFallback && (
        <img
          src={imgUrl}
          alt={username ? `${username}'s avatar` : 'User avatar'}
          className="absolute inset-0 w-full h-full object-cover z-10 bg-bg-dark"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
};
