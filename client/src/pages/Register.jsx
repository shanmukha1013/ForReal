import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import { Button, Input, Card } from '@/components';
import { toast } from 'react-hot-toast';

import { usePageTitle } from '@/hooks';

export const Register = () => {
  usePageTitle('Register');
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const { register: registerUser, isLoading } = useAuthStore();
  
  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      const res = await registerUser({
        username: data.username,
        email: data.email,
        password: data.password
      });
      toast.success(res.message || 'Account created successfully!');
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    }
  };

  return (
    <Card className="w-full">
      <div className="mb-8 text-center">
        <h2 className="text-[28px] font-black text-white tracking-tight leading-tight">Create account</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Input
          label="Username"
          type="text"
          id="username"
          error={errors.username?.message}
          {...register('username', { 
            required: 'Username is required',
            minLength: { value: 3, message: 'Minimum 3 characters' }
          })}
        />

        <Input
          label="Email address"
          type="email"
          id="email"
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
          error={errors.password?.message}
          {...register('password', { 
            required: 'Password is required',
            minLength: { value: 6, message: 'Minimum 6 characters' }
          })}
        />

        <Input
          label="Confirm Password"
          type="password"
          id="confirmPassword"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', { 
            required: 'Please confirm your password',
            validate: value => value === password || 'Passwords do not match'
          })}
        />

        <Button type="submit" isLoading={isLoading} className="mt-4 w-full">
          Sign Up
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:text-primary-hover font-medium transition-property-common">
          Sign in
        </Link>
      </div>
    </Card>
  );
};
