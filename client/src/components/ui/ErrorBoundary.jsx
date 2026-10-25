import React from 'react';

// Catches render errors so one broken component never blanks the whole app.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  // Clear the error when the route (resetKey) changes.
  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) {
      return { error: null, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('UI error boundary caught:', error, info);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    // Lazy-loaded chunks can disappear after a new deploy: reloading fetches
    // the new build.
    const isChunkError = /dynamically imported module|Loading chunk|Importing a module script/i.test(
      this.state.error?.message || ''
    );

    return (
      <div role="alert" className="card mx-auto my-12 max-w-lg px-6 py-10 text-center">
        <p className="eyebrow mb-2">Unexpected error</p>
        <h2 className="font-display text-4xl">
          {isChunkError ? 'A new version is out.' : 'That didn’t go as planned.'}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-ink/70">
          {isChunkError
            ? 'Reload to get the latest ForReal.'
            : 'This part of the page failed to load. Your data is safe — try again.'}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => (isChunkError ? window.location.reload() : this.setState({ error: null }))}
            className="inline-flex h-11 items-center rounded-[4px] border-2 border-ink bg-ink px-5 text-sm font-bold text-ivory"
          >
            {isChunkError ? 'Reload' : 'Try again'}
          </button>
          <a href="/" className="inline-flex h-11 items-center rounded-[4px] border-2 border-ink px-5 text-sm font-bold">
            Go home
          </a>
        </div>
      </div>
    );
  }
}
