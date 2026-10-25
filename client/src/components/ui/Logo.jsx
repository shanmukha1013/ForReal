import React from 'react';

// The wordmark adapts to its surface: on ember, "FOR" is ivory and "REAL" ink;
// on ivory, "FOR" is ink and "REAL" ember; on ink, "FOR" ivory and "REAL" ember.
const SURFACES = {
  ember: { for: 'text-ivory', real: 'text-ink' },
  ivory: { for: 'text-ink', real: 'text-ember' },
  ink: { for: 'text-ivory', real: 'text-ember' },
};

export const Wordmark = ({ surface = 'ember', className = '' }) => {
  const tone = SURFACES[surface] || SURFACES.ember;
  return (
    <span className={`font-display inline-flex leading-none ${className}`} aria-label="ForReal">
      <span className={tone.for} aria-hidden="true">For</span>
      <span className={tone.real} aria-hidden="true">Real</span>
    </span>
  );
};

export const LogoMark = ({ size = 36, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
    <rect x="1" y="1" width="62" height="62" rx="6" className="fill-ink" />
    <path d="M17 47V17h20v7H25v6h11v7H25v10z" className="fill-ivory" />
    <circle cx="45" cy="42" r="5" className="fill-ember" />
  </svg>
);
