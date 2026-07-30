import React, { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks';
import { User, Lock, Bell, Palette, Shield, Upload } from 'lucide-react';
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
    description: 'Manage your profile details and avatar',
    active: true,
  },
  {
    id: 'security',
    icon: Shield,
    label: 'Security',
    description: 'Update password and security settings',
    active: true,
  }
];

export const Settings = () => {
  usePageTitle('Settings — ForReal');
  const [activeSection, setActiveSection] = useState('account');
  const { user, checkAuth } = useAuthStore();
  
  // Form states
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.profile) {
      setBio(user.profile.bio || '');
      setAvatarPreview(user.profile.avatar || null);
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveAccount = async () => {
    setIsSaving(true);
    try {
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        await apiClient.post('/users/profile-picture', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      await apiClient.put('/users/profile', { bio });
      await checkAuth(); // refresh user context
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    if (!password) return toast.error('Enter a new password');
    setIsSaving(true);
    try {
      await apiClient.put('/users/profile', { password });
      toast.success('Password updated successfully');
      setPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Settings</h1>
        <p className="text-text-muted text-sm mt-1">Manage your logic engine preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar nav */}
        <div className="md:w-64 shrink-0">
          <div className="bg-card-dark border border-border-subtle rounded-xl overflow-hidden shadow-subtle">
            {SETTINGS_SECTIONS.map(({ id, icon: Icon, label, active: _active }) => (
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

        {/* Content area */}
        <div className="flex-1 bg-card-dark border border-border-subtle rounded-xl overflow-hidden shadow-subtle">
          {SETTINGS_SECTIONS.map(({ id, icon: Icon, label, description, active }) => (
            activeSection === id && (
              <div key={id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Section header */}
                <div className="px-6 py-5 border-b border-border-subtle flex items-center gap-3 bg-surface">
                  <Icon size={20} className="text-primary" />
                  <div>
                    <h2 className="font-bold text-white text-lg">{label}</h2>
                    <p className="text-text-muted text-xs mt-1">{description}</p>
                  </div>
                </div>

                {/* Section content */}
                {active ? (
                  <div className="p-6 space-y-6">
                    {id === 'account' && (
                      <div className="space-y-6">
                        <div className="flex items-center gap-6">
                          <div className="relative group shrink-0">
                            <Avatar src={avatarPreview} username={user?.username} size="xl" />
                            <label className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <Upload size={20} className="text-white mb-1" />
                              <span className="text-[10px] text-white font-bold uppercase tracking-wider">Change</span>
                              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                            </label>
                          </div>
                          <div>
                            <h3 className="text-white font-bold mb-1">Profile Avatar</h3>
                            <p className="text-text-muted text-xs leading-relaxed max-w-sm">
                              Upload a high-quality image. Recommended size is 256x256px.
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-white font-bold text-sm mb-2">Bio</label>
                          <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell the world about your logical prowess..."
                            className="w-full bg-bg-dark border border-border-muted rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all min-h-[100px] resize-y"
                          />
                        </div>

                        <div className="pt-4 border-t border-border-subtle flex justify-end">
                          <Button onClick={handleSaveAccount} isLoading={isSaving} className="px-8 shadow-glow">
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {id === 'security' && (
                      <div className="space-y-6">
                        <Input 
                          label="New Password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter a strong new password"
                        />
                        <div className="pt-4 border-t border-border-subtle flex justify-end">
                          <Button onClick={handleSaveSecurity} isLoading={isSaving} className="px-8" variant="outline">
                            Update Password
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-6 py-12 flex flex-col items-center text-center gap-3">
                    <Icon size={32} className="text-text-muted/40 mb-2" />
                    <div>
                      <p className="text-white font-black text-lg">{label} Settings</p>
                      <p className="text-text-muted text-sm mt-2 max-w-xs leading-relaxed">
                        {description}. Available in an upcoming update.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
};
