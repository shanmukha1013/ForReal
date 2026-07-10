import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import { Button, Input, Card } from '@/components';
import { toast } from 'react-hot-toast';

export const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login, isLoading } = useAuthStore();

  const onSubmit = async (data) => {
    try {
      const res = await login(data);
      toast.success(res.message || 'Welcome back to ForReal');
    } catch (error) {
      toast.error(error.message || 'Login failed');
    }
  };

  return (
    <Card className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Log in</h2>
        <p className="text-sm text-text-muted mt-1">Enter your credentials to continue</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Input
          label="Email address"
          type="email"
          id="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', { 
            required: 'Email is required',
            pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' }
          })}
        />

        <Input
          label="Password"
          type="password"
          id="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password', { required: 'Password is required' })}
        />

        <div className="flex justify-between items-center text-sm">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" className="rounded border-border-subtle bg-bg-dark text-primary focus:ring-primary focus:ring-offset-bg-dark transition-property-common" />
            <span className="text-text-muted group-hover:text-white transition-property-common">Remember me</span>
          </label>
          <a href="#" className="text-primary hover:text-primary-hover transition-property-common">Forgot password?</a>
        </div>

        <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
          Sign In
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-text-muted">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary hover:text-primary-hover font-medium transition-property-common">
          Sign up
        </Link>
      </div>
    </Card>
  );
};
