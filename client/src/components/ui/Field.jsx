import React, { forwardRef, useId } from 'react';
import { AlertTriangle } from 'lucide-react';

const FieldShell = ({ id, label, hint, error, counter, children, className = '' }) => (
  <div className={`flex w-full flex-col gap-1.5 ${className}`}>
    {(label || counter) && (
      <div className="flex items-baseline justify-between gap-3">
        {label && (
          <label htmlFor={id} className="text-sm font-bold text-ink">
            {label}
          </label>
        )}
        {counter && <span className="tabular text-xs font-semibold text-ink/70">{counter}</span>}
      </div>
    )}
    {children}
    {error ? (
      <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 text-xs font-bold text-ink">
        <AlertTriangle size={14} className="mt-px shrink-0 text-ember" strokeWidth={2.5} aria-hidden="true" />
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="text-xs text-ink/70">{hint}</p>
    ) : null}
  </div>
);

const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export const Input = forwardRef(({ label, hint, error, counter, id, className = '', wrapperClassName = '', ...props }, ref) => {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} counter={counter} className={wrapperClassName}>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={`field h-12 ${className}`}
        {...props}
      />
    </FieldShell>
  );
});
Input.displayName = 'Input';

export const Textarea = forwardRef(({ label, hint, error, counter, id, className = '', wrapperClassName = '', ...props }, ref) => {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} counter={counter} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={`field min-h-28 resize-y ${className}`}
        {...props}
      />
    </FieldShell>
  );
});
Textarea.displayName = 'Textarea';

export const Select = forwardRef(({ label, hint, error, id, className = '', wrapperClassName = '', children, ...props }, ref) => {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} className={wrapperClassName}>
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={`field h-12 appearance-none pr-10 font-semibold ${className}`}
          {...props}
        >
          {children}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      </div>
    </FieldShell>
  );
});
Select.displayName = 'Select';
