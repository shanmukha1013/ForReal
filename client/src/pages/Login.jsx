import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import { Button, Input, Card } from '@/components';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Card className="w-full backdrop-blur-xl bg-card-dark/60 border-border-subtle/40 shadow-premium">
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="mb-8 text-center">
          <h2 className="text-[28px] font-black text-white tracking-tight leading-tight">Welcome back</h2>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <motion.div variants={itemVariants}>
            <Input
              label="Username"
              type="text"
              id="username"
              error={errors.username?.message}
              {...register('username', { 
                required: 'Username is required'
              })}
            />
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-col gap-2">
            <Input
              label="Password"
              type="password"
              id="password"
              error={errors.password?.message}
              {...register('password', { required: 'Password is required' })}
            />
            <div className="flex justify-between items-center mt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    {...register('rememberMe')}
                  />
                  <div className="w-4 h-4 rounded border border-border-muted peer-checked:bg-primary peer-checked:border-primary transition-colors"></div>
                  <svg className="absolute w-3 h-3 text-bg-dark opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-text-muted group-hover:text-white transition-colors">Remember me</span>
              </label>
              
              <a href="#" className="text-sm text-text-muted hover:text-white transition-property-common">Forgot password?</a>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Button type="submit" isLoading={isLoading} className="mt-2 w-full shadow-glow">
              Sign In
            </Button>
          </motion.div>
        </form>

        <motion.div variants={itemVariants} className="mt-8 text-center text-sm text-text-muted">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:text-primary-bright font-medium transition-property-common">
            Sign up
          </Link>
        </motion.div>
      </motion.div>
    </Card>
  );
};
