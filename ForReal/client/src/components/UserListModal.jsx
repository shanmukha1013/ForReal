import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, UserPlus, UserCheck, Loader } from 'lucide-react';
import api from '../api/api';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification';
import { storageCache } from '../lib/storageCache';

const InlineFollowButton = ({ user }) => {
  const { user: currentUser } = React.useContext(AuthContext);
  const notify = useNotification();
  const targetId = user?._id || user?.id;

  const [following, setFollowing] = useState(() => {
    const localFollows = storageCache.getFollows();
    return localFollows?.[targetId] || false;
  });
  const [loading, setLoading] = useState(false);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) return notify.error('Sign in to follow');
    
    setLoading(true);
    const prev = following;
    setFollowing(!prev);

    try {
      if (!prev) {
        storageCache.addFollow(targetId);
        await api.users.toggleFollow(targetId);
        window.dispatchEvent(new CustomEvent('forreal:follow:changed', { detail: { targetId, isFollowing: true } }));
      } else {
        storageCache.removeFollow(targetId);
        await api.users.toggleFollow(targetId); // This route handles POST/DELETE intelligently via .all or toggle
        window.dispatchEvent(new CustomEvent('forreal:follow:changed', { detail: { targetId, isFollowing: false } }));
      }
    } catch (err) {
      setFollowing(prev);
      notify.error('Could not update follow');
    } finally {
      setLoading(false);
    }
  };

  if (String(currentUser?._id || currentUser?.id) === String(targetId)) return null;

  return (
    <button
      disabled={loading || !currentUser}
      onClick={toggle}
      className={`ml-4 flex items-center gap-1 px-3 py-1.5 rounded-full font-semibold text-xs transition-all duration-200 border ${
        following
          ? 'bg-neon/10 border-neon/40 text-neon hover:bg-neon/20'
          : 'bg-neon text-black border-neon hover:bg-neon/90'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <Loader className="w-3 h-3 animate-spin" />
      ) : following ? (
        <UserCheck className="w-3 h-3" />
      ) : (
        <UserPlus className="w-3 h-3" />
      )}
      {following ? 'Following' : 'Follow'}
    </button>
  );
};

export default function UserListModal({ isOpen, onClose, title, fetchType, userId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && fetchType && userId) {
      setLoading(true);
      const fetchUsers = async () => {
        try {
          if (fetchType === 'followers') {
            const res = await api.users.getFollowers(userId);
            setUsers(res.data?.followers || []);
          } else if (fetchType === 'following') {
            const res = await api.users.getFollowing(userId);
            setUsers(res.data?.following || []);
          }
        } catch (err) {
          console.error(`Error fetching ${fetchType}:`, err);
        } finally {
          setLoading(false);
        }
      };
      fetchUsers();
    }
  }, [isOpen, fetchType, userId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#0F0F0F] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 space-y-4">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-white/5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/5 rounded w-1/3" />
                      <div className="h-3 bg-white/5 rounded w-1/4" />
                    </div>
                  </div>
                ))
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No users found.</p>
                </div>
              ) : (
                users.map(user => (
                  <div key={user._id} className="flex items-center justify-between group">
                    <Link
                      to={`/profile/${encodeURIComponent(user.username)}`}
                      onClick={onClose}
                      className="flex items-center gap-3 flex-1 overflow-hidden"
                    >
                      <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${user.username || 'user'}&background=0F0F0F&color=22c55e`}
                        alt={user.username}
                        className="w-12 h-12 rounded-full border border-neon/30 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate group-hover:text-neon transition-colors">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-gray-400 text-xs truncate">@{user.username}</p>
                      </div>
                    </Link>
                    <InlineFollowButton user={user} />
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
