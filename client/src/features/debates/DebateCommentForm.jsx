import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AnimatedButton } from '@/components/ui';

export const DebateCommentForm = ({ debateId, debateOptions, onSubmit }) => {
  const { register, handleSubmit, reset } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitHandler = async (data) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="bg-surface rounded-xl border border-border-subtle p-4 mb-6 shadow-subtle">
      <div className="mb-3">
        <select 
          className="bg-bg-dark border border-border-muted rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary mb-3"
          {...register('optionId')}
        >
          <option value="">I am impartial (Neutral)</option>
          {debateOptions.map(opt => (
            <option key={opt._id} value={opt._id}>Supporting: {opt.label}</option>
          ))}
        </select>
        
        <textarea
          className="w-full bg-bg-dark border border-border-muted rounded-xl p-3 text-white placeholder-text-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all resize-y min-h-[100px] text-sm"
          placeholder="Present your argument. Logic engine will fact-check references..."
          {...register('content', { required: true })}
        ></textarea>
      </div>
      
      <div className="flex justify-end">
        <AnimatedButton type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Post Argument'}
        </AnimatedButton>
      </div>
    </form>
  );
};
