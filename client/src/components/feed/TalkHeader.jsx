import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Trash2, AlertCircle, Edit2 } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import { Button } from '../Button';
import { Avatar } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';

const formatRelativeTime = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const TalkHeader = React.memo(({ talk, onDelete, onEdit }) => {
  const { user } = useAuthStore();
  // Compare as strings since MongoDB ObjectIds may not ===
  const isOwner = user?.id 
    ? user.id.toString() === (talk.author?._id || talk.author)?.toString()
    : false;
    
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleDelete = () => {
    onDelete(talk._id);
    setShowDeleteConfirm(false);
  };

  const authorUsername = talk.author?.username || 'unknown';

  return (
    <div className="flex justify-between items-start mb-3 relative">
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <Avatar src={talk.author?.profile?.avatar} username={authorUsername} size="md" />
        {/* Author info */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-white text-sm leading-tight">
              {authorUsername}
            </span>
            <span className="text-text-muted text-xs">@{authorUsername}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
            <span>{formatRelativeTime(talk.createdAt)}</span>
            {talk.isEdited && <span className="opacity-70">· edited</span>}
            {talk.isOptimistic && <span className="opacity-60">· posting…</span>}
          </div>
        </div>
      </div>

      {/* Three-dot menu — only for owner, not for optimistic talks */}
      {isOwner && !talk.isOptimistic && (
        <div className="relative shrink-0 ml-2" ref={menuRef}>
          <button 
            className="p-1.5 rounded-full hover:bg-white/5 text-text-muted hover:text-white transition-colors"
            onClick={() => setShowMenu(prev => !prev)}
            aria-label="Talk options"
            aria-expanded={showMenu}
          >
            <MoreHorizontal size={18} />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-8 w-44 bg-[#1a1a1a] border border-border-subtle rounded-xl shadow-xl z-20 overflow-hidden"
              >
                <button
                  className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 flex items-center gap-2.5 border-b border-border-subtle/50"
                  onClick={() => {
                    setShowMenu(false);
                    if (onEdit) onEdit();
                  }}
                >
                  <Edit2 size={15} className="text-text-muted" />
                  Edit Talk
                </button>
                <button
                  className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/10 flex items-center gap-2.5"
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                >
                  <Trash2 size={15} />
                  Delete Talk
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1a1a1a] border border-border-subtle rounded-2xl max-w-sm w-full p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-error mb-3">
                <AlertCircle size={22} />
                <h3 className="text-base font-bold text-white">Delete this Talk?</h3>
              </div>
              <p className="text-text-muted text-sm mb-6 leading-relaxed">
                This is permanent. Your Talk, reactions, and all comments will be removed.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  className="!bg-error hover:!bg-error/80" 
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

TalkHeader.displayName = 'TalkHeader';
