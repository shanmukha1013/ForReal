import React, { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks';
import { User, Shield, Upload, Camera } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import apiClient from '@/services/api';
import { toast } from 'react-hot-toast';
import { Button, Input } from '@/components';
import { Avatar } from '@/components/ui';

const SETTINGS_SECTIONS = [
  {
    id: 'account',
    icon: User,
    label: 'Account',
    description: 'Update your profile photo and bio',
    active: true,
  },
  {
    id: 'security',
    icon: Shield,
    label: 'Security',
    description: 'Update your password',
    active: true,
  },
];

export const Settings = () => {
  usePageTitle('Settings — ForReal');
  const [activeSection, setActiveSection] = useState('account');
  const { user, updateUser, checkAuth } = useAuthStore();

  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setBio(user.profile.bio || '');
      // Only reset preview from server if we don't have a local file selected
      if (!avatarFile) {
        setAvatarPreview(user.profile.avatar || null);
      }
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveAccount = async () => {
    setIsSaving(true);
    try {
      let newAvatarUrl = user?.profile?.avatar || null;

      // 1. Upload avatar first if a new file was selected
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const avatarRes = await apiClient.post('/users/profile-picture', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        // avatarRes = { success, data: { avatarUrl } }
        newAvatarUrl = avatarRes.data?.avatarUrl || newAvatarUrl;
      }

      // 2. Save bio
      await apiClient.put('/users/profile', { bio });

      // 3. Immediately patch the store so all components re-render with new avatar
      updateUser({
        profile: {
          ...(user?.profile || {}),
          avatar: newAvatarUrl,
          bio,
        },
      });

      // 4. Also do a full refresh in background to sync other fields
      checkAuth().catch(() => {});

      setAvatarFile(null);
      toast.success('Profile saved successfully.');
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.message || 'Could not save profile. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    if (!password) return toast.error('Enter a new password.');
    if (password.length < 6) return toast.error('Password must be at least 6 characters.');
    if (password !== confirmPassword) return toast.error('Passwords do not match.');
    setIsSaving(true);
    try {
      await apiClient.put('/users/profile', { password });
      toast.success('Password updated.');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Could not update password. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Settings</h1>
        <p className="text-text-muted text-sm mt-1">Manage your ForReal account.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="md:w-60 shrink-0">
          <div className="bg-card-dark border border-border-subtle rounded-xl overflow-hidden">
            {SETTINGS_SECTIONS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-5 py-4 text-sm font-bold transition-colors border-b border-border-subtle/50 last:border-b-0 ${
                  activeSection === id
                    ? 'text-white bg-white/5 border-l-2 border-l-primary'
                    : 'text-text-muted hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <Icon size={18} className={activeSection === id ? 'text-primary' : 'text-text-muted'} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-card-dark border border-border-subtle rounded-xl overflow-hidden">
          {activeSection === 'account' && (
            <div className="animate-in fade-in duration-200">
              <div className="px-6 py-5 border-b border-border-subtle flex items-center gap-3 bg-surface">
                <User size={20} className="text-primary" />
                <div>
                  <h2 className="font-bold text-white text-lg">Account</h2>
                  <p className="text-text-muted text-xs mt-0.5">Update your profile photo and bio</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Avatar section */}
                <div className="flex items-center gap-6">
                  <div className="relative group shrink-0">
                    <Avatar
                      src={avatarPreview}
                      username={user?.username}
                      size="xl"
                    />
                    <label className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                      <Camera size={20} className="text-white mb-1" />
                      <span className="text-[9px] text-white font-bold uppercase tracking-wider">Change</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-1">Profile Photo</h3>
                    <p className="text-text-muted text-xs leading-relaxed max-w-xs">
                      JPG, PNG or WebP. Max 5MB. Hover the photo to change it.
                    </p>
                    {avatarFile && (
                      <p className="text-primary text-xs font-semibold mt-2">
                        New photo selected — save to apply.
                      </p>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-white font-bold text-sm mb-2">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell the world what you stand for…"
                    maxLength={200}
                    className="w-full bg-bg-dark border border-border-muted rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all min-h-[100px] resize-y"
                  />
                  <p className="text-text-muted text-xs mt-1 text-right">{bio.length}/200</p>
                </div>

                <div className="pt-4 border-t border-border-subtle flex justify-end">
                  <Button onClick={handleSaveAccount} isLoading={isSaving} className="px-8">
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="animate-in fade-in duration-200">
              <div className="px-6 py-5 border-b border-border-subtle flex items-center gap-3 bg-surface">
                <Shield size={20} className="text-primary" />
                <div>
                  <h2 className="font-bold text-white text-lg">Security</h2>
                  <p className="text-text-muted text-xs mt-0.5">Keep your account protected</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <Input
                  label="New Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                />
                <div className="pt-4 border-t border-border-subtle flex justify-end">
                  <Button onClick={handleSaveSecurity} isLoading={isSaving} className="px-8" variant="outline">
                    Update Password
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
