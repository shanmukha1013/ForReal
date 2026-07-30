import React, { useState, useEffect } from 'react';

export const Avatar = ({ src, username, size = 'md', className = '' }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-2xl'
  };

  const initial = username ? username.charAt(0).toUpperCase() : '?';

  // ALWAYS keep as relative path so Vite proxy correctly forwards to the backend.
  // Never construct an absolute http://localhost URL here.
  const rawSrc = src?.trim();
  // If it starts with /uploads, keep it as-is (Vite proxy will handle it).
  // If it's a full http/https URL (e.g., from a CDN), keep it as-is.
  // If empty/null, no image.
  const imgUrl = rawSrc || null;

  const showFallback = !imgUrl || hasError;

  return (
    <div
      className={`relative rounded-full bg-primary/10 shrink-0 overflow-hidden border border-border-subtle flex items-center justify-center ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      {/* Initials fallback - always present as background */}
      <span className="font-bold text-primary select-none" aria-hidden="true">
        {initial}
      </span>

      {/* Image overlaid on top — hides the initials when loaded */}
      {!showFallback && (
        <img
          src={imgUrl}
          alt={username ? `${username}'s avatar` : 'User avatar'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
};
