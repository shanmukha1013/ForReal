import React, { useState } from 'react';

export const Avatar = ({ src, username, size = 'md', className = '' }) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-24 h-24 text-3xl'
  };

  const initial = username ? username.charAt(0).toUpperCase() : '?';
  
  // Format local API URL if the image is a relative path
  const imgUrl = src && src.startsWith('/') 
    ? (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') + src : `http://localhost:5000${src}`) 
    : src;

  return (
    <div className={`rounded-full bg-bg-dark shrink-0 flex items-center justify-center overflow-hidden border border-border-subtle ${sizeClasses[size]} ${className}`}>
      {imgUrl && !hasError ? (
        <img 
          src={imgUrl} 
          alt={username || 'avatar'} 
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="w-full h-full bg-primary/10 flex items-center justify-center font-bold text-primary">
          {initial}
        </div>
      )}
    </div>
  );
};
