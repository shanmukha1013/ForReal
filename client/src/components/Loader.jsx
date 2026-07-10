import React from 'react';

export const Loader = ({ fullScreen = false }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-b-2 border-primary/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      <span className="text-text-muted text-sm tracking-widest uppercase">Loading</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-bg-dark z-[var(--z-index-modal)] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return <div className="w-full flex justify-center py-12">{content}</div>;
};
