import React, { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { debateService } from '@/services/debateService';
import { Button, Input, Modal, Select, Textarea } from '@/components/ui';
import { CATEGORIES, DURATIONS } from '@/lib/constants';
import { sideLetter, sideTone } from '@/lib/sides';

const defaults = {
  title: '',
  description: '',
  category: 'Technology',
  durationMinutes: 1440,
  evidenceRequired: false,
  options: [{ label: '' }, { label: '' }],
};

export const CreateDebateModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm({ defaultValues: defaults });
  const { fields, append, remove } = useFieldArray({ control, name: 'options' });
  const title = watch('title') || '';
  const description = watch('description') || '';

  const close = () => {
    if (isSubmitting) return;
    onClose();
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const res = await debateService.create({
        ...data,
        title: data.title.trim(),
        description: data.description.trim(),
        durationMinutes: Number(data.durationMinutes),
        options: data.options.map((o) => ({ label: o.label.trim() })),
      });
      toast.success('The floor is open.');
      reset(defaults);
      onClose();
      navigate(`/debates/${res.data._id}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Open a debate"
      description="Frame a clear question. Define the sides. Set the clock."
      size="lg"
      footer={(
        <>
          <Button variant="ghost" onClick={close} disabled={isSubmitting}>Cancel</Button>
          <Button variant="accent" type="submit" form="create-debate" isLoading={isSubmitting}>Open the floor</Button>
        </>
      )}
    >
      <form id="create-debate" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <Input
          label="The motion"
          placeholder="e.g. Social media should hide public like counts."
          counter={`${title.length}/200`}
          maxLength={200}
          error={errors.title?.message}
          {...register('title', {
            required: 'State the question being debated.',
            validate: (v) => v.trim().length >= 8 || 'Make the motion at least 8 characters.',
          })}
        />
        <Textarea
          label="Context"
          placeholder="Why does this matter? Define terms, scope and what a good argument looks like."
          counter={`${description.length}/2000`}
          maxLength={2000}
          rows={4}
          error={errors.description?.message}
          {...register('description', {
            required: 'Give people some context.',
            validate: (v) => v.trim().length > 0 || 'Give people some context.',
          })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" {...register('category')}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select label="Duration" {...register('durationMinutes', { valueAsNumber: true })}>
            {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
        </div>

        <fieldset className="rounded-[4px] border-2 border-ink p-4">
          <legend className="px-1 text-sm font-bold">Sides ({fields.length}/4)</legend>
          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <span
                  className={`mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border-2 border-ink font-display text-xl ${sideTone(index).chip}`}
                  aria-hidden="true"
                >
                  {sideLetter(index)}
                </span>
                <Input
                  aria-label={`Side ${sideLetter(index)}`}
                  placeholder={index === 0 ? 'e.g. Hide them' : index === 1 ? 'e.g. Keep them' : 'Another position'}
                  maxLength={80}
                  wrapperClassName="flex-1"
                  error={errors.options?.[index]?.label?.message}
                  {...register(`options.${index}.label`, {
                    validate: (v, all) => {
                      const value = v.trim();
                      if (!value) return 'Name this side.';
                      const dupes = all.options.filter((o) => o.label.trim().toLowerCase() === value.toLowerCase());
                      return dupes.length === 1 || 'Each side must be different.';
                    },
                  })}
                />
                {index >= 2 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="mt-1 inline-flex h-12 w-10 shrink-0 items-center justify-center rounded-[4px] border-2 border-transparent hover:border-ink"
                    aria-label={`Remove side ${sideLetter(index)}`}
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {fields.length < 4 && (
            <button
              type="button"
              onClick={() => append({ label: '' })}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold underline decoration-ember decoration-2 underline-offset-4"
            >
              <Plus size={16} strokeWidth={3} /> Add a side
            </button>
          )}
        </fieldset>

        <label className="flex cursor-pointer items-start gap-3 rounded-[4px] border-2 border-ink bg-ember/15 p-4">
          <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" {...register('evidenceRequired')} />
          <span>
            <span className="block text-sm font-extrabold">Require evidence</span>
            <span className="block text-sm text-ink/75">Every top-level argument must include a source link.</span>
          </span>
        </label>
      </form>
    </Modal>
  );
};
