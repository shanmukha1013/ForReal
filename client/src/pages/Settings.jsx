import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Camera, LogOut, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/services/api';
import useAuthStore from '@/store/useAuthStore';
import { Avatar, Button, Input, PageHeader, Textarea } from '@/components/ui';
import { usePageTitle } from '@/hooks';

const Section = ({ title, description, children }) => (
  <section className="card p-5 sm:p-6">
    <h2 className="font-display text-3xl">{title}</h2>
    {description && <p className="mt-1 text-sm text-ink/70">{description}</p>}
    <div className="mt-5">{children}</div>
  </section>
);

const ProfileSection = () => {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);
  const { register, handleSubmit, watch, reset, setError, formState: { errors, isSubmitting, isDirty } } = useForm({
    defaultValues: {
      displayName: user?.profile?.displayName || '',
      username: user?.username || '',
      bio: user?.profile?.bio || '',
    },
  });
  const bio = watch('bio') || '';

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pickAvatar = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return toast.error('Use a JPG, PNG, WEBP or GIF image.');
    if (file.size > 5 * 1024 * 1024) return toast.error('Images must be under 5MB.');
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
    return undefined;
  };

  const onSubmit = async (values) => {
    try {
      let avatar = user?.profile?.avatar || '';
      if (avatarFile) {
        const form = new FormData();
        form.append('avatar', avatarFile);
        const res = await apiClient.post('/users/profile-picture', form);
        avatar = res.data.avatarUrl;
      }
      const res = await apiClient.put('/users/profile', {
        displayName: values.displayName.trim(),
        username: values.username.trim().toLowerCase(),
        bio: values.bio.trim(),
      });
      updateUser({ ...res.data, profile: { ...res.data.profile, avatar } });
      reset({ displayName: res.data.profile.displayName, username: res.data.username, bio: res.data.profile.bio });
      setAvatarFile(null);
      toast.success('Profile saved.');
    } catch (error) {
      if (/username/i.test(error.message)) setError('username', { message: error.message });
      else toast.error(error.message);
    }
  };

  return (
    <Section title="Profile" description="How you appear next to every argument you make.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar src={preview || user?.profile?.avatar} username={user?.username} size="xl" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink bg-ember hover:bg-ivory"
              aria-label="Change profile photo"
            >
              <Camera size={16} strokeWidth={2.5} />
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={pickAvatar} />
          </div>
          <div className="text-sm">
            <p className="font-bold">Profile photo</p>
            <p className="text-ink/70">JPG, PNG, WEBP or GIF, up to 5MB.</p>
            {avatarFile && <p className="mt-1 font-bold underline decoration-ember decoration-2">New photo selected — save to apply.</p>}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Display name"
            maxLength={50}
            placeholder="How people see you"
            error={errors.displayName?.message}
            {...register('displayName', { maxLength: { value: 50, message: 'Keep it under 50 characters.' } })}
          />
          <Input
            label="Username"
            autoCapitalize="none"
            spellCheck={false}
            error={errors.username?.message}
            {...register('username', {
              required: 'Username is required.',
              pattern: { value: /^[a-zA-Z0-9_]{3,20}$/, message: 'Use 3–20 letters, numbers or underscores.' },
            })}
          />
        </div>
        <Textarea
          label="Bio"
          maxLength={280}
          rows={3}
          counter={`${bio.length}/280`}
          placeholder="What do you stand for? What will you argue about?"
          {...register('bio')}
        />
        <div className="flex justify-end">
          <Button type="submit" isLoading={isSubmitting} disabled={!isDirty && !avatarFile}>Save profile</Button>
        </div>
      </form>
    </Section>
  );
};

const SecuritySection = () => {
  const { register, handleSubmit, watch, reset, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { currentPassword: '', password: '', confirm: '' },
  });
  const password = watch('password');

  const onSubmit = async ({ currentPassword, password: next }) => {
    try {
      await apiClient.put('/users/profile', { currentPassword, password: next });
      reset();
      toast.success('Password updated.');
    } catch (error) {
      if (/current password/i.test(error.message)) setError('currentPassword', { message: error.message });
      else toast.error(error.message);
    }
  };

  return (
    <Section title="Security" description="Changing your password requires your current one.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword', { required: 'Enter your current password.' })}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
            error={errors.password?.message}
            {...register('password', { required: 'Choose a new password.', minLength: { value: 8, message: 'Use at least 8 characters.' } })}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...register('confirm', { validate: (v) => v === password || 'The passwords don’t match.' })}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="outline" isLoading={isSubmitting}>Update password</Button>
        </div>
      </form>
    </Section>
  );
};

export default function Settings() {
  usePageTitle('Settings');
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow="Account" title="Settings" description="Your profile, your security, your session." />
      <ProfileSection />
      <SecuritySection />
      <Section title="Experience">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">Watch the ForReal introduction again.</p>
          <Button to="/welcome?replay=1" variant="outline" size="sm"><Play size={15} className="fill-current" /> Replay intro</Button>
        </div>
      </Section>
      <Section title="Session">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">Sign out of ForReal on this device.</p>
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut size={15} strokeWidth={2.5} /> Sign out
          </Button>
        </div>
      </Section>
    </div>
  );
}
