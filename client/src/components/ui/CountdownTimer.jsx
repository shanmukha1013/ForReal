import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { timeLeft } from '@/lib/format';

export const CountdownTimer = ({ targetDate, className = '' }) => {
  const [label, setLabel] = useState(() => timeLeft(targetDate));

  useEffect(() => {
    setLabel(timeLeft(targetDate));
    const timer = setInterval(() => setLabel(timeLeft(targetDate)), 30000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <span className={`tabular inline-flex items-center gap-1 text-xs font-bold ${className}`}>
      <Clock size={13} strokeWidth={2.5} aria-hidden="true" />
      {label ? `${label} left` : 'Closing…'}
    </span>
  );
};
