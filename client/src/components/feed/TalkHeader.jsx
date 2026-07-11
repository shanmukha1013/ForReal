import React, { useState } from 'react';
import { MoreHorizontal, Trash2, AlertCircle } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import { Button } from '../Button';
import { motion, AnimatePresence } from 'framer-motion';

export const TalkHeader = React.memo(({ talk, onDelete }) => {
  const { user } = useAuthStore();
  const isOwner = user?.id === talk.author._id;
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatDate = (dateString) => {
    const options = { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleDelete = () => {
    onDelete(talk._id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="flex justify-between items-start mb-3 relative">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
          {talk.author.username?.[0]?.toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{talk.author.username}</span>
            <span className="text-text-muted text-sm">@{talk.author.username}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>{formatDate(talk.createdAt)}</span>
            {talk.isEdited && <span>• Edited</span>}
          </div>
        </div>
      </div>

      {isOwner && (
        <div className="relative">
          <button 
            className="p-2 rounded-full hover:bg-bg-dark text-text-muted hover:text-white transition-property-common"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreHorizontal size={18} />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-10 w-48 bg-bg-dark border border-border-subtle rounded-md shadow-xl z-10 overflow-hidden"
              >
                <button
                  className="w-full text-left px-4 py-3 text-sm text-error hover:bg-error/10 flex items-center gap-2"
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                >
                  <Trash2 size={16} />
                  Delete Talk
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Premium Delete Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-card-dark border border-border-subtle rounded-xl max-w-sm w-full p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-error mb-4">
                <AlertCircle size={24} />
                <h3 className="text-lg font-semibold text-white">Delete Talk?</h3>
              </div>
              <p className="text-text-muted mb-6 text-sm">
                This action cannot be undone. This will permanently delete your talk, reactions, and all comments.
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button variant="primary" className="bg-error hover:bg-error/80 text-white" onClick={handleDelete}>Delete</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

TalkHeader.displayName = 'TalkHeader';
