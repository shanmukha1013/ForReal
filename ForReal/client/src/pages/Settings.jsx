// -----------------------------------------------------------------------------
// Settings Page – Premium Account & Preferences Hub
// -----------------------------------------------------------------------------
// Enterprise‑grade settings dashboard with tabbed navigation,
// animated panels, toggle switches, save feedback, and responsive design.
// Integrates with AuthContext for user data and updateUser.
// -----------------------------------------------------------------------------

import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  UserCircleIcon,
  DocumentIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  BellAlertIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  UserGroupIcon,
  AtSymbolIcon,
  RadioIcon,
  SparklesIcon as ZapIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  ChevronRightIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// Backward-compatible icon aliases (removes lucide-react dependency)
const Sparkles = SparklesIcon;
const User = UserCircleIcon;
const Save = DocumentIcon;
const Info = InformationCircleIcon;
const Shield = ShieldCheckIcon;
const Calendar = CalendarDaysIcon;
const Lock = LockClosedIcon;
const Eye = EyeIcon;
const EyeOff = EyeSlashIcon;
const Globe = GlobeAltIcon;
const MessageSquare = ChatBubbleLeftRightIcon;
const Bell = BellIcon;
const BellOff = BellAlertIcon;
const Moon = MoonIcon;
const Sun = SunIcon;
const Monitor = ComputerDesktopIcon;
const Users = UserGroupIcon;
const AtSign = AtSymbolIcon;
const Radio = RadioIcon;
const Zap = ZapIcon;
const AlertTriangle = ExclamationTriangleIcon;
const Check = CheckIcon;
const X = XMarkIcon;
const Loader = ClockIcon;
const Upload = ArrowUpTrayIcon;
const Trash2 = TrashIcon;
const ChevronRight = ChevronRightIcon;
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification';
import axios from '../api/axios';
import { storageCache } from '../lib/storageCache';

// -----------------------------------------------------------------------------
// Animation Variants (consistent with the rest of the app)
// -----------------------------------------------------------------------------
const pageEnter = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const tabContentVariant = {
  hidden: { opacity: 0, x: 10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.15 } },
};

const sectionVariant = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const skeletonPulse = {
  animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.8 } },
};

// -----------------------------------------------------------------------------
// Custom Hook: useSettings – fetch and update settings
// -----------------------------------------------------------------------------
const useSettings = () => {
  const { user, updateUser } = useContext(AuthContext);
  const notify = useNotification();

  // Account fields
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [coverImage, setCoverImage] = useState(user?.coverImage || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [location, setLocation] = useState(user?.location || '');
  const [email, setEmail] = useState(user?.email || '');
  const [username] = useState(user?.username || '');

  // Privacy fields
  const [profileVisibility, setProfileVisibility] = useState(user?.privacy?.profileVisibility || 'public');
  const [debatePrivacy, setDebatePrivacy] = useState(user?.privacy?.debatePrivacy || 'public');
  const [allowMessagesFrom, setAllowMessagesFrom] = useState(user?.privacy?.allowMessagesFrom || 'everyone');

  // Notification fields
  const [pushEnabled, setPushEnabled] = useState(user?.notifications?.push || false);
  const [debateAlerts, setDebateAlerts] = useState(user?.notifications?.debateAlerts !== false);
  const [roomNotifications, setRoomNotifications] = useState(user?.notifications?.roomNotifications !== false);
  const [creatorNotifications, setCreatorNotifications] = useState(user?.notifications?.creatorNotifications !== false);
  const [emailDigest, setEmailDigest] = useState(user?.notifications?.emailDigest || false);

  // Appearance fields
  const [theme] = useState('dark'); // currently only dark
  const [reducedMotion, setReducedMotion] = useState(user?.appearance?.reducedMotion || false);
  const [uiDensity, setUiDensity] = useState(user?.appearance?.uiDensity || 'comfortable');

  // Security (password change handled separately)
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });

  // Saving state per section
  const [savingSection, setSavingSection] = useState(null);

  // Fetch sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      setSessionsLoading(true);
      try {
        const result = await axios.get('/auth/sessions');
        setSessions(result.sessions || []);
      } catch {
        // silent
      } finally {
        setSessionsLoading(false);
      }
    };
    fetchSessions();
  }, []);

  // Generic save for a section
  const saveSection = useCallback(async (section, updates) => {
    setSavingSection(section);
    try {
      const result = await axios.put('/auth/update-settings', { section, ...updates });
        if (result.user) {
          updateUser(result.user);
        }
      notify.success('Settings saved');
    } catch (err) {
      // Fallback for mock API environment
      console.warn('API failed, saving locally via context/localStorage');
      updateUser(updates);
      
      // --- GLOBAL IDENTITY SYNC MOCK ---
      if (section === 'account') {
        const payload = { displayName, bio, avatar, coverImage, website, location };
        const myId = user?._id || user?.id || user?.username;
        
        const posts = storageCache.getPosts();
        const updatedPosts = posts.map(p => {
          const pUpdate = { ...p };
          if (String(pUpdate.author?._id || pUpdate.author?.id || pUpdate.author?.username) === String(myId)) {
            pUpdate.author = { ...pUpdate.author, ...payload };
          }
          if (pUpdate.comments) {
            pUpdate.comments = pUpdate.comments.map(c => {
              if (String(c.author?._id || c.author?.id || c.author?.username) === String(myId)) {
                return { ...c, author: { ...c.author, ...payload } };
              }
              return c;
            });
          }
          return pUpdate;
        });
        storageCache.setPosts(updatedPosts);
        
        try {
          const convs = JSON.parse(localStorage.getItem('forreal_conversations') || '[]');
          const updatedConvs = convs.map(c => {
          const cUpdate = { ...c };
          if (cUpdate.participants) {
            cUpdate.participants = cUpdate.participants.map(p => {
              if (String(p._id || p.id || p.username || p) === String(myId)) {return { ...p, ...payload };}
              return p;
            });
          }
          return cUpdate;
          });
          localStorage.setItem('forreal_conversations', JSON.stringify(updatedConvs));
        } catch(e) { console.warn('Settings: failed to update conversations', e); }
        
        window.dispatchEvent(new Event('storage'));
      }

      notify.success('Settings saved (locally)');
    } finally {
      setSavingSection(null);
    }
  }, [updateUser, notify, displayName, bio, avatar, coverImage, website, location, user]);

  // Save handlers for each tab
  const saveAccount = () => saveSection('account', { displayName, bio, avatar, coverImage, website, location, email });
  const savePrivacy = () => saveSection('privacy', { profileVisibility, debatePrivacy, allowMessagesFrom });
  const saveNotifications = () => saveSection('notifications', {
    push: pushEnabled,
    debateAlerts,
    roomNotifications,
    creatorNotifications,
    emailDigest,
  });
  const saveAppearance = () => saveSection('appearance', { reducedMotion, uiDensity });

  // Password change
  const changePassword = async () => {
    const { current, new: newPass, confirm } = passwordData;
    if (!current || !newPass || !confirm) {
      notify.error('All fields required');
      return;
    }
    if (newPass !== confirm) {
      notify.error('Passwords do not match');
      return;
    }
    setSavingSection('security');
    try {
      await axios.post('/auth/change-password', { currentPassword: current, newPassword: newPass });
      notify.success('Password updated');
      setPasswordData({ current: '', new: '', confirm: '' });
      setShowPasswordFields(false);
    } catch (err) {
      notify.error(err?.response?.data?.message || 'Password change failed');
    } finally {
      setSavingSection(null);
    }
  };

  const terminateSession = async (sessionId) => {
    try {
      await axios.delete(`/auth/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      notify.success('Session terminated');
    } catch {
      notify.error('Failed to terminate session');
    }
  };

  return {
    // Account
    displayName, setDisplayName,
    bio, setBio,
    avatar, setAvatar,
    coverImage, setCoverImage,
    website, setWebsite,
    location, setLocation,
    email, setEmail,
    username,
    // Privacy
    profileVisibility, setProfileVisibility,
    debatePrivacy, setDebatePrivacy,
    allowMessagesFrom, setAllowMessagesFrom,
    // Notifications
    pushEnabled, setPushEnabled,
    debateAlerts, setDebateAlerts,
    roomNotifications, setRoomNotifications,
    creatorNotifications, setCreatorNotifications,
    emailDigest, setEmailDigest,
    // Appearance
    theme,
    reducedMotion, setReducedMotion,
    uiDensity, setUiDensity,
    // Security
    sessions,
    sessionsLoading,
    showPasswordFields, setShowPasswordFields,
    passwordData, setPasswordData,
    terminateSession,
    // Actions
    savingSection,
    saveAccount,
    savePrivacy,
    saveNotifications,
    saveAppearance,
    changePassword,
  };
};

// -----------------------------------------------------------------------------
// Subcomponents
// -----------------------------------------------------------------------------

// Animated Toggle
const Toggle = React.memo(({ enabled, onChange, label, disabled = false }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={() => !disabled && onChange(!enabled)}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
      enabled ? 'bg-brand' : 'bg-white/10'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    aria-pressed={enabled}
    aria-label={label}
  >
    <motion.span
      layout
      className="inline-block h-5 w-5 rounded-full bg-white shadow-md"
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      animate={{ x: enabled ? 22 : 2 }}
    />
  </motion.button>
));
Toggle.displayName = 'Toggle';

// Settings Section Wrapper
const Section = React.memo(({ title, icon: Icon, children, onSave, saving, saveLabel = 'Save' }) => (
  <motion.div
    variants={sectionVariant}
    className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
  >
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-brand" />
          <h2 className="text-white font-semibold text-lg">{title}</h2>
        </div>
        {onSave && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white font-bold text-sm disabled:opacity-50 transition"
          >
            {saving === title ? (
              <>
                <Loader className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> {saveLabel}
              </>
            )}
          </motion.button>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  </motion.div>
));
Section.displayName = 'Section';

// Setting Row (label + control)
const SettingRow = React.memo(({ label, description, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-white/5 last:border-0">
    <div className="flex-1">
      <p className="text-white text-sm font-medium">{label}</p>
      {description && <p className="text-gray-400 text-xs mt-0.5">{description}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
));
SettingRow.displayName = 'SettingRow';

// Tab Bar
const Tabs = React.memo(({ tabs, active, onChange }) => (
  <div className="flex gap-2 overflow-x-auto pb-3 mb-5 scrollbar-hide">
    {tabs.map(({ key, label, icon: Icon }) => (
      <motion.button
        key={key}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onChange(key)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
          active === key
            ? 'bg-brand/10 border-brand/30 text-brand shadow-glow-sm'
            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
        }`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </motion.button>
    ))}
  </div>
));
Tabs.displayName = 'Tabs';

// -----------------------------------------------------------------------------
// Main Settings Component
// -----------------------------------------------------------------------------
export default function Settings() {
  const {
    // Account
    displayName, setDisplayName,
    bio, setBio,
    avatar, setAvatar,
    coverImage, setCoverImage,
    website, setWebsite,
    location, setLocation,
    email, setEmail,
    username,
    // Privacy
    profileVisibility, setProfileVisibility,
    debatePrivacy, setDebatePrivacy,
    allowMessagesFrom, setAllowMessagesFrom,
    // Notifications
    pushEnabled, setPushEnabled,
    debateAlerts, setDebateAlerts,
    roomNotifications, setRoomNotifications,
    creatorNotifications, setCreatorNotifications,
    emailDigest, setEmailDigest,
    // Appearance
    reducedMotion, setReducedMotion,
    uiDensity, setUiDensity,
    // Security
    sessions,
    sessionsLoading,
    showPasswordFields, setShowPasswordFields,
    passwordData, setPasswordData,
    terminateSession,
    // Actions
    savingSection,
    saveAccount,
    savePrivacy,
    saveNotifications,
    saveAppearance,
    changePassword,
  } = useSettings();

  const [activeTab, setActiveTab] = useState('account');

  const tabs = useMemo(
    () => [
      { key: 'account', label: 'Account', icon: User },
      { key: 'privacy', label: 'Privacy', icon: Lock },
      { key: 'notifications', label: 'Notifications', icon: Bell },
      { key: 'appearance', label: 'Appearance', icon: Monitor },
      { key: 'security', label: 'Security', icon: Shield },
    ],
    []
  );

  const bioLength = bio.length;
  const isBioValid = bioLength <= 160;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <motion.div
          variants={pageEnter}
          initial="hidden"
          animate="visible"
          className="relative"
        >
          <div className="absolute inset-x-0 -top-10 h-24 bg-brand/10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand/10 border border-brand/30">
              <Sparkles className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Settings</h1>
              <p className="text-gray-400 text-sm">Customize your experience and manage your account.</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {/* Panels */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariant}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Account Tab */}
            {activeTab === 'account' && (
              <Section
                title="Account"
                icon={User}
                onSave={saveAccount}
                saving={savingSection === 'account'}
              >
                <SettingRow label="Username" description="Your unique handle (cannot be changed)">
                  <span className="text-white font-mono text-sm">@{username}</span>
                </SettingRow>

                <div className="py-3 border-b border-white/5">
                  <label className="text-white text-sm font-medium block mb-3">Profile Picture</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="relative group w-16 h-16 flex-shrink-0">
                      <img 
                        src={avatar || `https://ui-avatars.com/api/?name=${displayName || username}&background=0F0F0F&color=22c55e&bold=true`} 
                        alt="Avatar" 
                        className="w-16 h-16 rounded-full object-cover border-2 border-brand/30 bg-black/40" 
                      />
                      <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-medium cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {return window.alert("Image must be smaller than 2MB");}
                              const reader = new FileReader();
                              reader.onloadend = () => setAvatar(reader.result);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <Upload className="w-4 h-4" />
                        Upload New Image
                      </label>
                      <p className="text-xs text-gray-500 mt-2">Recommended: Square JPG, PNG. Max 2MB.</p>
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
                      placeholder="How you appear to others"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Avatar URL</label>
                    <input
                      type="text"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition font-mono text-sm"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Cover Image URL</label>
                    <input
                      type="text"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition font-mono text-sm"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Website</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
                    placeholder="https://your-website.com"
                  />
                </div>

                <div className="py-3 border-b border-white/5">
                  <label className="text-white text-sm font-medium block mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand/70 transition text-sm"
                  />
                </div>

                <div className="py-3">
                  <label className="text-white text-sm font-medium block mb-2">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 160))}
                    placeholder="Tell the world your truth..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand/70 transition text-sm resize-none"
                  />
                  <div className="flex justify-end mt-1">
                    <span className={`text-xs ${bioLength > 160 ? 'text-red-400' : bioLength > 140 ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {bioLength}/160
                    </span>
                  </div>
                </div>
              </Section>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <Section
                title="Privacy"
                icon={Lock}
                onSave={savePrivacy}
                saving={savingSection === 'privacy'}
              >
                <SettingRow label="Profile Visibility" description="Control who can see your profile">
                  <select
                    value={profileVisibility}
                    onChange={(e) => setProfileVisibility(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50"
                  >
                    <option value="public">Public</option>
                    <option value="followers">Followers Only</option>
                    <option value="private">Private</option>
                  </select>
                </SettingRow>

                <SettingRow label="Debate Room Privacy" description="Default privacy when creating rooms">
                  <select
                    value={debatePrivacy}
                    onChange={(e) => setDebatePrivacy(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50"
                  >
                    <option value="public">Public</option>
                    <option value="followers">Followers Only</option>
                    <option value="invite">Invite Only</option>
                  </select>
                </SettingRow>

                <SettingRow label="Allow Messages From" description="Who can send you direct messages">
                  <select
                    value={allowMessagesFrom}
                    onChange={(e) => setAllowMessagesFrom(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="followers">Followers</option>
                    <option value="none">No one</option>
                  </select>
                </SettingRow>

                <SettingRow label="Blocked Users" description="Manage blocked accounts">
                  <button className="text-brand text-sm hover:underline flex items-center gap-1">
                    View list <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </SettingRow>
              </Section>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <Section
                title="Notifications"
                icon={Bell}
                onSave={saveNotifications}
                saving={savingSection === 'notifications'}
              >
                <SettingRow label="Push Notifications" description="Receive alerts on your device">
                  <Toggle enabled={pushEnabled} onChange={setPushEnabled} />
                </SettingRow>
                <SettingRow label="Debate Alerts" description="When debates you follow start or end">
                  <Toggle enabled={debateAlerts} onChange={setDebateAlerts} />
                </SettingRow>
                <SettingRow label="Room Notifications" description="Activity in rooms you belong to">
                  <Toggle enabled={roomNotifications} onChange={setRoomNotifications} />
                </SettingRow>
                <SettingRow label="Creator Updates" description="From creators you admire">
                  <Toggle enabled={creatorNotifications} onChange={setCreatorNotifications} />
                </SettingRow>
                <SettingRow label="Email Digest" description="Weekly summary of top debates">
                  <Toggle enabled={emailDigest} onChange={setEmailDigest} />
                </SettingRow>
              </Section>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <Section
                title="Appearance"
                icon={Monitor}
                onSave={saveAppearance}
                saving={savingSection === 'appearance'}
              >
                <SettingRow label="Theme" description="ForReal only supports Dark for now">
                  <span className="flex items-center gap-2 text-white text-sm">
                    <Moon className="w-4 h-4 text-brand" /> Dark
                  </span>
                </SettingRow>
                <SettingRow label="Reduce Motion" description="Minimize animations for accessibility">
                  <Toggle enabled={reducedMotion} onChange={setReducedMotion} />
                </SettingRow>
                <SettingRow label="Interface Density" description="Adjust spacing and size">
                  <select
                    value={uiDensity}
                    onChange={(e) => setUiDensity(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand/50"
                  >
                    <option value="compact">Compact</option>
                    <option value="comfortable">Comfortable</option>
                    <option value="spacious">Spacious</option>
                  </select>
                </SettingRow>
              </Section>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <>
                <Section
                  title="Change Password"
                  icon={Lock}
                >
                  {!showPasswordFields ? (
                    <button
                      onClick={() => setShowPasswordFields(true)}
                      className="text-brand text-sm hover:underline"
                    >
                      Change your password
                    </button>
                  ) : (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="space-y-3"
                    >
                      <input
                        type="password"
                        placeholder="Current password"
                        value={passwordData.current}
                        onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                        className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand/70 text-sm"
                      />
                      <input
                        type="password"
                        placeholder="New password"
                        value={passwordData.new}
                        onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                        className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand/70 text-sm"
                      />
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        value={passwordData.confirm}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                        className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand/70 text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setShowPasswordFields(false)}
                          className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={changePassword}
                          disabled={savingSection === 'security'}
                          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand text-white font-bold text-sm disabled:opacity-50"
                        >
                          {savingSection === 'security' ? (
                            <><Loader className="w-4 h-4 animate-spin" /> Saving...</>
                          ) : (
                            'Update Password'
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </Section>

                <Section
                  title="Active Sessions"
                  icon={Monitor}
                >
                  {sessionsLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map(i => (
                        <motion.div key={i} variants={skeletonPulse} animate="animate" className="h-12 bg-white/5 rounded-xl" />
                      ))}
                    </div>
                  ) : sessions.length === 0 ? (
                    <p className="text-gray-400 text-sm">No active sessions detected.</p>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <div key={session._id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                          <div>
                            <p className="text-white text-sm">{session.device} – {session.location}</p>
                            <p className="text-gray-400 text-xs">IP: {session.ip} · {new Date(session.lastActive).toLocaleString()}</p>
                          </div>
                          <button
                            onClick={() => terminateSession(session._id)}
                            className="text-red-400 text-xs hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> End
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
}