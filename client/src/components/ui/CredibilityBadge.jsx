import React from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

export const CredibilityBadge = ({ score = 50, size = 'md' }) => {
  // Score out of 100
  
  let Icon = Shield;
  let colorClass = 'text-text-muted';
  let bgClass = 'bg-border-subtle/30';
  let textClass = 'text-text-muted';

  if (score >= 80) {
    Icon = ShieldCheck;
    colorClass = 'text-primary';
    bgClass = 'bg-primary/10 border-primary/20 shadow-[0_0_10px_rgba(0,200,255,0.15)]';
    textClass = 'text-primary-bright';
  } else if (score < 30) {
    Icon = ShieldAlert;
    colorClass = 'text-error';
    bgClass = 'bg-error/10 border-error/20';
    textClass = 'text-error';
  }

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2'
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 16
  };

  return (
    <div 
      className={`inline-flex items-center rounded-full border border-transparent font-medium tracking-wide ${bgClass} ${sizeClasses[size]}`}
      title={`Credibility Score: ${score}`}
    >
      <Icon size={iconSizes[size]} className={colorClass} strokeWidth={2.5} />
      <span className={textClass}>{score}</span>
    </div>
  );
};
