import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import { Button, Input } from '@/components/ui';
import { usePageTitle } from '@/hooks';

export default function Register() {
  usePageTitle('Create account');
  const registerUser = useAuthStore((s) => s.register);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm({
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  });
  const password = watch('password');

  const onSubmit = async ({ username, email, password: pw }) => {
    try {
      await registerUser({ username: username.trim().toLowerCase(), email: email.trim(), password: pw });
      toast.success('Welcome to ForReal. Pick a debate and take a side.');
    } catch (error) {
      if (/username/i.test(error.message)) setError('username', { message: error.message });
      else if (/email/i.test(error.message)) setError('email', { message: error.message });
      else toast.error(error.message);
    }
  };

  return (
    <div className="card p-6 sm:p-8">
      <p className="eyebrow mb-2">Join the floor</p>
      <h1 className="font-display text-5xl">Create account</h1>
      <p className="mt-2 text-sm text-ink/70">Your opinions, on the record — and ready to be defended.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 flex flex-col gap-5" noValidate>
        <Input
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          hint="3–20 characters: letters, numbers and underscores."
          error={errors.username?.message}
          {...register('username', {
            required: 'Choose a username.',
            pattern: { value: /^[a-zA-Z0-9_]{3,20}$/, message: 'Use 3–20 letters, numbers or underscores.' },
          })}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Enter your email.',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, message: 'Enter a valid email address.' },
          })}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password?.message}
          {...register('password', {
            required: 'Choose a password.',
            minLength: { value: 8, message: 'Use at least 8 characters.' },
            maxLength: { value: 128, message: 'Use at most 128 characters.' },
          })}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Confirm your password.',
            validate: (value) => value === password || 'The passwords don’t match.',
          })}
        />
        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>Create account</Button>
      </form>

      <p className="mt-7 border-t-2 border-ink/15 pt-5 text-center text-sm">
        Already have an account?{' '}
        <Link to="/login" className="font-extrabold underline decoration-ember decoration-2 underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
