import React from 'react';

export const Spinner = ({ size = 20, className = '', label = 'Loading' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={`animate-spin ${className}`}
    role="status"
    aria-label={label}
  >
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// Full-area loading state used by route fallbacks and session restore.
export const Loader = ({ fullScreen = false, label = 'Loading' }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 text-ink" role="status" aria-live="polite">
      <div className="font-display text-4xl leading-none" aria-hidden="true">
        <span className="text-ivory">FOR</span>REAL
      </div>
      <div className="h-1 w-28 overflow-hidden rounded-full bg-ink/15">
        <div className="h-full w-1/3 rounded-full bg-ink animate-[loader-slide_1s_var(--ease-snap)_infinite]" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );

  if (fullScreen) {
    return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ember">{content}</div>;
  }
  return <div className="flex w-full justify-center py-16">{content}</div>;
};
