import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useFieldArray } from 'react-hook-form';
import { X, Plus, Trash2, ShieldCheck, Zap } from 'lucide-react';
import { Button, Input } from '@/components';
import { AnimatedButton } from '@/components/ui';
import useDebateStore from '@/store/useDebateStore';
import { toast } from 'react-hot-toast';

export const CreateDebateModal = ({ isOpen, onClose }) => {
  const { register, control, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      title: '',
      description: '',
      category: 'Technology',
      durationMinutes: 1440,
      options: [
        { label: '', color: '#00C8FF' },
        { label: '', color: '#8AE9FF' }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "options"
  });

  const { fetchDebates } = useDebateStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const apiClient = (await import('@/services/api')).default;
      await apiClient.post('/debates', data);
      toast.success('Debate created successfully!');
      fetchDebates();
      reset();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to create debate');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#020202]/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-surface border border-border-subtle shadow-premium rounded-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-subtle/50">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap size={20} className="text-primary" />
                Initialize Debate
              </h2>
              <p className="text-sm text-text-muted mt-1">Configure logic parameters and debate structure.</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-text-muted hover:text-white hover:bg-white/5 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[70vh]">
            <div className="space-y-6">
              
              <Input
                label="Proposition / Topic"
                placeholder="e.g. Artificial General Intelligence will be achieved before 2030."
                error={errors.title?.message}
                {...register('title', { required: 'Topic is required', maxLength: 200 })}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-muted">Context & Rules</label>
                <textarea
                  className="w-full bg-bg-dark border border-border-muted rounded-xl p-3 text-white placeholder-text-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all resize-y min-h-[100px] text-sm"
                  placeholder="Provide background context and define the parameters of this debate..."
                  {...register('description', { required: 'Context is required' })}
                ></textarea>
                {errors.description && <span className="text-xs text-error mt-1">{errors.description.message}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-muted">Category</label>
                  <select 
                    className="w-full bg-bg-dark border border-border-muted rounded-xl p-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-sm appearance-none"
                    {...register('category')}
                  >
                    <option value="Technology">Technology</option>
                    <option value="Science">Science</option>
                    <option value="Philosophy">Philosophy</option>
                    <option value="Politics">Politics</option>
                    <option value="Culture">Culture</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-muted">Duration</label>
                  <select 
                    className="w-full bg-bg-dark border border-border-muted rounded-xl p-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-sm appearance-none"
                    {...register('durationMinutes', { valueAsNumber: true })}
                  >
                    <option value={1440}>24 Hours</option>
                    <option value={2880}>48 Hours</option>
                    <option value={10080}>1 Week</option>
                    <option value={60}>1 Hour (Blitz)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-border-subtle/50 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-white flex items-center gap-2">
                    Debate Options
                  </label>
                  {fields.length < 5 && (
                    <button 
                      type="button" 
                      onClick={() => append({ label: '', color: '#38D9FF' })}
                      className="text-xs flex items-center gap-1 text-primary hover:text-primary-bright transition-colors"
                    >
                      <Plus size={14} /> Add Option
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-start gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          className="w-full bg-bg-dark border border-border-muted rounded-xl p-3 text-white placeholder-text-muted/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-sm"
                          placeholder={`Option ${index + 1}`}
                          {...register(`options.${index}.label`, { required: 'Required' })}
                        />
                        {errors?.options?.[index]?.label && (
                          <span className="text-xs text-error mt-1">{errors.options[index].label.message}</span>
                        )}
                      </div>
                      <div className="shrink-0 h-12 w-12 rounded-xl border border-border-muted overflow-hidden">
                        <input
                          type="color"
                          className="w-16 h-16 -ml-2 -mt-2 cursor-pointer"
                          {...register(`options.${index}.color`)}
                        />
                      </div>
                      {index >= 2 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="shrink-0 p-3 mt-0.5 text-text-muted hover:text-error hover:bg-error/10 rounded-xl transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Moderation Note */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="text-primary mt-0.5 shrink-0" size={18} />
                <div className="text-xs text-text-muted leading-relaxed">
                  <span className="text-primary-bright font-medium block mb-1">AI Logic Engine Active</span>
                  Arguments will be evaluated for logical consistency, fallacies, and factual accuracy. The credibility score of participants will affect their influence in this debate.
                </div>
              </div>

            </div>
          </form>

          {/* Footer */}
          <div className="p-6 border-t border-border-subtle/50 flex justify-end gap-3 bg-surface">
            <AnimatedButton variant="ghost" onClick={onClose}>
              Cancel
            </AnimatedButton>
            <AnimatedButton variant="primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? 'Initializing...' : 'Launch Debate'}
            </AnimatedButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
