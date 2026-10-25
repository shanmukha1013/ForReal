import React from 'react';
import { Button, Wordmark } from '@/components/ui';
import { usePageTitle } from '@/hooks';

export default function NotFound() {
  usePageTitle('Not found');
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <Wordmark surface="ember" className="mb-10 text-4xl" />
      <p className="font-display text-[clamp(7rem,30vw,16rem)] leading-none text-ivory">404</p>
      <h1 className="font-display mt-2 text-4xl">Claim not found.</h1>
      <p className="mt-3 max-w-md text-base font-semibold">
        This page doesn’t exist — and we don’t make things up. Head back to the floor.
      </p>
      <div className="mt-8 flex gap-3">
        <Button to="/">Go home</Button>
        <Button to="/debates" variant="outline">Browse debates</Button>
      </div>
    </main>
  );
}
