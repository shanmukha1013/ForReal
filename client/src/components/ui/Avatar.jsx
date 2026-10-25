import React, { useState } from 'react';
import { resolveMediaUrl } from '@/lib/media';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-3xl',
  '2xl': 'h-28 w-28 text-4xl',
};

export const Avatar = ({ src, username, size = 'md', className = '' }) => {
  const imgUrl = resolveMediaUrl(src);
  // Remember which URL failed so a new URL is retried without an effect.
  const [failedUrl, setFailedUrl] = useState(null);
  const showImage = imgUrl && failedUrl !== imgUrl;
  const initial = username ? username.charAt(0).toUpperCase() : '?';

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-ink font-display text-ivory ${SIZES[size] || SIZES.md} ${className}`}
    >
      <span aria-hidden="true" className="leading-none">{initial}</span>
      {showImage && (
        <img
          src={imgUrl}
          alt={username ? `${username}'s avatar` : 'Avatar'}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailedUrl(imgUrl)}
        />
      )}
      {!showImage && <span className="sr-only">{username ? `${username}'s avatar` : 'Avatar'}</span>}
    </span>
  );
};
