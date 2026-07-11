import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import { Button, Input, Card } from '@/components';
import { toast } from 'react-hot-toast';

import { usePageTitle } from '@/hooks';

export const Login = () => {
  usePageTitle('Login');
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
      <div className="mb-8 text-center">
        <h2 className="text-[28px] font-black text-white tracking-tight leading-tight">Welcome back</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Input
          label="Username or Email"
          type="text"
          id="identifier"
          error={errors.identifier?.message}
          {...register('identifier', { 
            required: 'Username or email is required'
          })}
        />

        <div className="flex flex-col gap-2">
          <Input
            label="Password"
            type="password"
            id="password"
            error={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />
          <div className="flex justify-end">
            <a href="#" className="text-sm text-text-muted hover:text-white transition-property-common">Forgot password?</a>
          </div>
        </div>

        <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
          Sign In
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-text-muted">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary hover:text-primary-hover font-medium transition-property-common">
          Sign up
        </Link>
      </div>
    </Card>
  );
};
