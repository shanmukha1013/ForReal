import React from 'react';

// Empty, error and skeleton states share one visual language.

export const EmptyState = ({ icon: Icon, title, children, action, className = '' }) => (
  <div className={`card flex flex-col items-center px-6 py-14 text-center ${className}`}>
    {Icon && (
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-ember">
        <Icon size={24} strokeWidth={2.25} aria-hidden="true" />
      </span>
    )}
    <h3 className="font-display text-3xl">{title}</h3>
    {children && <p className="mt-2 max-w-sm text-sm text-ink/70 text-pretty">{children}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export const ErrorState = ({ title = 'Something broke on our side.', message, onRetry, className = '' }) => (
  <div role="alert" className={`card border-dashed px-6 py-10 text-center ${className}`}>
    <p className="eyebrow mb-2">Error</p>
    <h3 className="font-display text-2xl">{title}</h3>
    {message && <p className="mx-auto mt-2 max-w-sm text-sm text-ink/70">{message}</p>}
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex h-10 items-center rounded-[4px] border-2 border-ink px-4 text-sm font-bold hover:bg-ink hover:text-ivory"
      >
        Try again
      </button>
    )}
  </div>
);

export const Skeleton = ({ className = '' }) => <div className={`skeleton ${className}`} aria-hidden="true" />;

export const PostSkeleton = () => (
  <div className="card p-5" aria-hidden="true">
    <div className="mb-4 flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-5/6" />
      <Skeleton className="h-3.5 w-2/3" />
    </div>
  </div>
);

export const SkeletonList = ({ count = 3 }) => (
  <div className="space-y-4" role="status" aria-label="Loading">
    {Array.from({ length: count }, (_, i) => <PostSkeleton key={i} />)}
  </div>
);

export const PageHeader = ({ eyebrow, title, accent, description, actions }) => (
  <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && <p className="eyebrow mb-2 text-ink">{eyebrow}</p>}
      <h1 className="font-display text-5xl text-ink sm:text-6xl">
        {title}
        {accent && <span className="font-accent ml-2 text-ivory normal-case">{accent}</span>}
      </h1>
      {description && <p className="mt-3 max-w-xl text-base font-medium text-ink">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
  </header>
);

export const Tabs = ({ tabs, value, onChange, label, className = '' }) => (
  <div role="tablist" aria-label={label} className={`no-scrollbar flex gap-1 overflow-x-auto ${className}`}>
    {tabs.map((tab) => {
      const active = tab.value === value;
      return (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(tab.value)}
          className={`eyebrow h-9 shrink-0 rounded-[4px] border-2 px-3.5 transition-colors ${
            active ? 'border-ink bg-ink text-ivory' : 'border-ink/0 text-ink hover:border-ink'
          }`}
        >
          {tab.label}
          {typeof tab.count === 'number' && <span className="tabular ml-1.5 opacity-80">{tab.count}</span>}
        </button>
      );
    })}
  </div>
);
