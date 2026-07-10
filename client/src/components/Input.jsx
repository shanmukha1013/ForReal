import React from 'react';

export const Input = React.forwardRef(({
  label,
  error,
  id,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-muted">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`w-full bg-card-dark border ${error ? 'border-error focus:border-error focus:ring-error/20' : 'border-border-subtle focus:border-primary focus:ring-primary/20'} rounded-md px-4 py-2.5 text-white placeholder:text-text-muted/50 transition-property-common duration-fast focus:outline-none focus:ring-4 ${className}`}
        {...props}
      />
      {error && (
        <span className="text-xs text-error mt-0.5">{error}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
