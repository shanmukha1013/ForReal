import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-bg-dark flex flex-col items-center justify-center p-4">
      <h1 className="text-9xl font-black text-border-subtle">404</h1>
      <h2 className="text-2xl font-bold text-white mt-4 tracking-tight">Page not found</h2>
      <p className="text-text-muted mt-2 mb-8 text-center max-w-md">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <Button>Go Back Home</Button>
      </Link>
    </div>
  );
};
