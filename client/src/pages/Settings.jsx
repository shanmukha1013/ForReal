import React, { useState } from 'react';
import { usePageTitle } from '@/hooks';
import { User, Lock, Bell, Palette, Shield } from 'lucide-react';

const SETTINGS_SECTIONS = [
  {
    id: 'account',
    icon: User,
    label: 'Account',
    description: 'Manage your username, email, and profile',
    active: true,
  },
  {
    id: 'privacy',
    icon: Lock,
    label: 'Privacy',
    description: 'Control who can see your Talks and activity',
    active: false,
  },
  {
    id: 'notifications',
    icon: Bell,
    label: 'Notifications',
    description: 'Manage what you are notified about',
    active: false,
  },
  {
    id: 'appearance',
    icon: Palette,
    label: 'Appearance',
    description: 'Theme and display preferences',
    active: false,
  },
  {
    id: 'security',
    icon: Shield,
    label: 'Security',
    description: 'Update password and security settings',
    active: false,
  },
];

export const Settings = () => {
  usePageTitle('Settings — ForReal');
  const [activeSection, setActiveSection] = useState('account');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-white tracking-tight">Settings</h1>
        <p className="text-text-muted text-sm mt-1">Manage your ForReal account and preferences.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Sidebar nav */}
        <div className="sm:w-52 shrink-0">
          <div className="bg-card-dark border border-border-subtle rounded-xl overflow-hidden">
            {SETTINGS_SECTIONS.map(({ id, icon: Icon, label, active: _active }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-border-subtle/50 last:border-b-0 ${
                  activeSection === id
                    ? 'text-white bg-white/5 border-l-2 border-l-primary'
                    : 'text-text-muted hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <Icon size={16} className={activeSection === id ? 'text-primary' : 'text-text-muted'} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 bg-card-dark border border-border-subtle rounded-xl overflow-hidden">
          {SETTINGS_SECTIONS.map(({ id, icon: Icon, label, description, active }) => (
            activeSection === id && (
              <div key={id}>
                {/* Section header */}
                <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-3">
                  <Icon size={18} className="text-primary" />
                  <div>
                    <h2 className="font-bold text-white text-sm">{label}</h2>
                    <p className="text-text-muted text-xs mt-0.5">{description}</p>
                  </div>
                </div>

                {/* Section content */}
                {active ? (
                  <div className="p-5">
                    <p className="text-text-muted text-sm">
                      Settings for this section will be available soon.
                    </p>
                  </div>
                ) : (
                  <div className="px-5 py-10 flex flex-col items-center text-center gap-3">
                    <Icon size={28} className="text-text-muted/40" />
                    <div>
                      <p className="text-white font-semibold text-sm">{label} Settings</p>
                      <p className="text-text-muted text-sm mt-1 max-w-xs leading-relaxed">
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
