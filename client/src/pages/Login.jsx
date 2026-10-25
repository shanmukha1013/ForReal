import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import { Button, Input } from '@/components/ui';
import { usePageTitle } from '@/hooks';

export default function Login() {
  usePageTitle('Sign in');
  const login = useAuthStore((s) => s.login);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: { username: '', password: '', rememberMe: true },
  });

  const onSubmit = async (data) => {
    try {
      await login({ ...data, username: data.username.trim() });
      toast.success('Welcome back.');
    } catch (error) {
      if (error.status === 401) {
        setError('password', { message: 'That username and password don’t match.' });
      } else {
        toast.error(error.message);
      }
    }
  };

  return (
    <div className="card p-6 sm:p-8">
      <p className="eyebrow mb-2">Welcome back</p>
      <h1 className="font-display text-5xl">Sign in</h1>
      <p className="mt-2 text-sm text-ink/70">Pick up the argument where you left it.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 flex flex-col gap-5" noValidate>
        <Input
          label="Username or email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.username?.message}
          {...register('username', { required: 'Enter your username or email.' })}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: 'Enter your password.' })}
        />
        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4" {...register('rememberMe')} />
          Keep me signed in for 30 days
        </label>
        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>Sign in</Button>
      </form>

      <p className="mt-7 border-t-2 border-ink/15 pt-5 text-center text-sm">
        New to ForReal?{' '}
        <Link to="/register" className="font-extrabold underline decoration-ember decoration-2 underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}
