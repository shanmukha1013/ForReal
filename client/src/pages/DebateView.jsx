import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import useDebateStore from '@/store/useDebateStore';
import apiClient from '@/services/api';
import { Loader } from '@/components';
import { StatusBadge, CredibilityBadge, Avatar } from '@/components/ui';
import { Trash2 } from 'lucide-react';
import { VotePanel } from '@/features/debates/VotePanel';
import { AIAnalysisPanel } from '@/features/debates/AIAnalysisPanel';
import { DebateComment } from '@/features/debates/DebateComment';
import { DebateCommentForm } from '@/features/debates/DebateCommentForm';
import { toast } from 'react-hot-toast';

import { socketService } from '@/services/socket';

export const DebateView = () => {
  const { id } = useParams();
  const { currentDebate, getDebate, addComment, isLoading, error } = useDebateStore();
  const [comments, setComments] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  
  useEffect(() => {
    const fetchDebateData = async () => {
      try {
        await getDebate(id);
        const res = await useDebateStore.getState().fetchComments(id);
        setComments(res.comments || []);
      } catch (err) {
        // handled in store
      }
    };
    fetchDebateData();
  }, [id]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('join_debate', id);

      socket.on('new_comment', (comment) => {
        setComments((prev) => [comment, ...prev]);
      });

      socket.on('debate_updated', (updatedDebate) => {
        useDebateStore.setState({ currentDebate: updatedDebate });
      });
      
      socket.on('debate_typing', (data) => {
        if (data.username !== useAuthStore.getState().user?.username) {
          setTypingUser(data.username);
        }
      });
      
      socket.on('debate_stop_typing', () => {
        setTypingUser(null);
      });

      return () => {
        socket.emit('leave_debate', id);
        socket.off('new_comment');
        socket.off('debate_updated');
        socket.off('debate_typing');
        socket.off('debate_stop_typing');
      };
    }
  }, [id]);

  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (isLoading && !currentDebate) return <Loader fullScreen />;
  if (error) return <div className="p-8 text-center text-error">Failed to load debate: {error}</div>;
  if (!currentDebate) return <div className="p-8 text-center text-text-muted">Debate not found</div>;

  const handlePostComment = async (data) => {
    try {
      const newComment = await addComment(id, data);
      setComments([newComment, ...comments]);
      toast.success('Argument posted!');
    } catch (err) {
      toast.error('Failed to post argument');
    }
  };

  const handleDeleteDebate = async () => {
    if (window.confirm('Are you sure you want to permanently delete this debate?')) {
      try {
        await apiClient.delete(`/debates/${id}`);
        toast.success('Debate deleted successfully');
        navigate('/debates');
      } catch (err) {
        toast.error(err.message || 'Failed to delete debate');
      }
    }
  };

  const isCreator = user?._id === currentDebate?.creator?._id;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusBadge status={currentDebate.status} />
            <span className="text-sm font-medium text-text-muted uppercase tracking-widest">{currentDebate.category}</span>
          </div>
          {isCreator && (
            <button 
              onClick={handleDeleteDebate}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-error bg-error/10 hover:bg-error/20 rounded-lg transition-colors border border-error/20"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
        
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-6">
          {currentDebate.title}
        </h1>
        
        <div className="flex items-center gap-4 text-sm bg-surface p-4 rounded-xl border border-border-subtle shadow-subtle">
          <Avatar src={currentDebate.creator?.profile?.avatar} username={currentDebate.creator?.username} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{currentDebate.creator?.username}</span>
              <CredibilityBadge score={currentDebate.creator?.credibilityScore || 50} size="sm" />
            </div>
            <span className="text-text-muted text-xs">Initiated the debate</span>
          </div>
        </div>
      </motion.div>

      {/* Context/Rules */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-card-dark rounded-xl border border-border-subtle p-6 mb-8 text-text-muted leading-relaxed"
      >
        <h3 className="text-white font-bold mb-2">Context & Parameters</h3>
        <p>{currentDebate.description}</p>
      </motion.div>

      {/* Logic Engine Analysis */}
      {currentDebate.aiAnalysis && (
        <AIAnalysisPanel analysis={currentDebate.aiAnalysis} />
      )}

      {/* Voting */}
      <VotePanel debate={currentDebate} />

      {/* Debate Floor (Comments/Arguments) */}
      <div className="mt-12">
        <h3 className="text-2xl font-black text-white tracking-tight mb-6 flex items-center gap-2">
          Debate Floor
          <span className="bg-border-subtle text-white text-xs px-2 py-1 rounded-full font-medium">
            {currentDebate.stats?.totalComments || 0} arguments
          </span>
        </h3>

        <DebateCommentForm 
          debateId={currentDebate._id} 
          debateOptions={currentDebate.options} 
          onSubmit={handlePostComment} 
        />

        <AnimatePresence>
          {typingUser && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-text-muted italic mb-4 flex items-center gap-2 px-2"
            >
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </span>
              {typingUser} is drafting an argument...
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {comments.length > 0 ? (
            comments.map(comment => (
              <DebateComment key={comment._id} comment={comment} debateOptions={currentDebate.options} />
            ))
          ) : (
            <div className="text-center py-12 text-text-muted border border-dashed border-border-subtle rounded-xl">
              No arguments have been presented yet. Be the first to logic.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
