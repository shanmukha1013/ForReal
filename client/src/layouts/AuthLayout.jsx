import React from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import { Loader, Wordmark } from '@/components/ui';

const RULES = ['Challenge ideas.', 'Defend your opinions.', 'Respect the conversation.'];

export const AuthLayout = () => {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status === 'checking') return <Loader fullScreen label="Restoring your session" />;
  if (status === 'authenticated') {
    return <Navigate to={location.state?.from?.pathname || '/debates'} replace />;
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Manifesto panel */}
      <aside className="relative hidden overflow-hidden border-r-2 border-ink bg-ember p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="grain pointer-events-none absolute inset-0 opacity-25" aria-hidden="true" />
        <Link to="/" className="relative w-fit text-4xl" aria-label="ForReal home">
          <Wordmark surface="ember" />
        </Link>
        <div className="relative">
          <p className="eyebrow mb-5">A debate platform</p>
          <h2 className="font-display text-[clamp(4rem,7.5vw,7.5rem)] text-ink">
            Less noise.
            <br />
            <span className="text-ivory">More truth.</span>
          </h2>
          <p className="mt-6 max-w-md text-lg font-semibold text-ink">
            Open a question. Take a side. Back it with evidence. Let the best argument win.
          </p>
        </div>
        <ol className="relative grid grid-cols-3 gap-4 border-t-2 border-ink pt-6">
          {RULES.map((rule, i) => (
            <li key={rule} className="text-sm font-bold text-ink">
              <span className="tabular mb-1 block font-display text-3xl">0{i + 1}</span>
              {rule}
            </li>
          ))}
        </ol>
      </aside>

      {/* Form column */}
      <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-8">
        <Link to="/" className="mb-8 text-5xl lg:hidden" aria-label="ForReal home">
          <Wordmark surface="ember" />
        </Link>
        <div className="w-full max-w-[440px] animate-rise">
          <Outlet />
        </div>
        <Link to="/welcome?replay=1" className="mt-8 text-sm font-bold text-ink underline decoration-2 underline-offset-4">
          New here? Watch what ForReal is about
        </Link>
      </main>
    </div>
  );
};
