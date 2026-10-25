import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from './Spinner';

const VARIANTS = {
  // Ink is the strongest action on both ember and ivory surfaces.
  primary: 'bg-ink text-ivory border-2 border-ink hover:bg-ink/88 shadow-hard-sm hover:shadow-hard active:shadow-none active:translate-x-[2px] active:translate-y-[2px]',
  // Ember call-to-action with ink text (4.56:1).
  accent: 'bg-ember text-ink border-2 border-ink shadow-hard-sm hover:shadow-hard active:shadow-none active:translate-x-[2px] active:translate-y-[2px]',
  outline: 'bg-transparent text-ink border-2 border-ink hover:bg-ink hover:text-ivory',
  ivory: 'bg-ivory text-ink border-2 border-ink shadow-hard-sm hover:shadow-hard active:shadow-none active:translate-x-[2px] active:translate-y-[2px]',
  ghost: 'bg-transparent text-ink border-2 border-transparent hover:bg-ink/8',
  'ghost-ivory': 'bg-transparent text-ivory border-2 border-transparent hover:bg-ivory/10',
  danger: 'bg-ivory text-ink border-2 border-dashed border-ink hover:bg-ink hover:text-ivory hover:border-solid',
};

const SIZES = {
  xs: 'h-8 px-3 text-xs gap-1.5',
  sm: 'h-9 px-3.5 text-sm gap-2',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
  icon: 'h-10 w-10 justify-center',
  'icon-sm': 'h-8 w-8 justify-center',
};

const base = 'relative inline-flex items-center justify-center font-bold tracking-tight rounded-[4px] whitespace-nowrap select-none transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-snap)] disabled:opacity-45 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:pointer-events-none';

const buttonClasses = ({ variant = 'primary', size = 'md', fullWidth = false, className = '' } = {}) =>
  `${base} ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${fullWidth ? 'w-full' : ''} ${className}`;

export const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  type = 'button',
  to,
  ...props
}, ref) => {
  const classes = buttonClasses({ variant, size, fullWidth, className });

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={classes}
      {...props}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={18} />
        </span>
      )}
      <span className={`inline-flex items-center gap-[inherit] ${isLoading ? 'invisible' : ''}`}>{children}</span>
    </button>
  );
});

Button.displayName = 'Button';
