import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import useDebateStore from '@/store/useDebateStore';
import { Loader } from '@/components';
import { StatusBadge, CredibilityBadge } from '@/components/ui';
import { VotePanel } from '@/features/debates/VotePanel';
import { AIAnalysisPanel } from '@/features/debates/AIAnalysisPanel';
import { DebateComment } from '@/features/debates/DebateComment';
import { DebateCommentForm } from '@/features/debates/DebateCommentForm';
import { toast } from 'react-hot-toast';

export const DebateView = () => {
  const { id } = useParams();
  const { currentDebate, getDebate, addComment, isLoading, error } = useDebateStore();
  const [comments, setComments] = useState([]);
  
  useEffect(() => {
    const fetchDebateData = async () => {
      try {
        await getDebate(id);
        // Also fetch comments (stubbed here, should go through store/api)
        // const res = await apiClient.get(`/debates/${id}/comments`);
        // setComments(res.data);
      } catch (err) {
        // handled in store
      }
    };
    fetchDebateData();
  }, [id]);

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

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <StatusBadge status={currentDebate.status} />
          <span className="text-sm font-medium text-text-muted uppercase tracking-widest">{currentDebate.category}</span>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-6">
          {currentDebate.title}
        </h1>
        
        <div className="flex items-center gap-4 text-sm bg-surface p-4 rounded-xl border border-border-subtle shadow-subtle">
          <div className="w-10 h-10 rounded-full bg-border-subtle overflow-hidden">
            {currentDebate.creator?.profile?.avatar ? (
               <img src={currentDebate.creator.profile.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
               <div className="w-full h-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                 {currentDebate.creator?.username?.charAt(0).toUpperCase()}
               </div>
            )}
          </div>
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
