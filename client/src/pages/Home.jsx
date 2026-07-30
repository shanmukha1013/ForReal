import React, { useEffect, useRef, useCallback } from 'react';
import { CreateTalk, TalkCard } from '@/components';
import { useFeed, useTalkActions } from '@/hooks';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';

// Skeleton loader for initial feed loading state
const TalkSkeleton = () => (
  <div className="bg-card-dark rounded-xl border border-border-subtle p-4 sm:p-5 mb-4 animate-pulse">
    <div className="flex gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-border-subtle shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3.5 bg-border-subtle rounded w-32" />
        <div className="h-3 bg-border-subtle rounded w-20" />
      </div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-3.5 bg-border-subtle rounded w-full" />
      <div className="h-3.5 bg-border-subtle rounded w-5/6" />
      <div className="h-3.5 bg-border-subtle rounded w-3/4" />
    </div>
    <div className="flex gap-4 pt-3 border-t border-border-subtle">
      <div className="h-4 bg-border-subtle rounded w-8" />
      <div className="h-4 bg-border-subtle rounded w-8" />
      <div className="h-4 bg-border-subtle rounded w-8" />
      <div className="h-4 bg-border-subtle rounded w-8" />
    </div>
  </div>
);

export const Home = () => {
  const { 
    talks, 
    isLoading, 
    hasMore, 
    feedError,
    fetchTalks, 
    addTalkToFeed, 
    removeTalkFromFeed, 
    updateTalkInFeed 
  } = useFeed();
  
  const { 
    handleReaction, 
    handleBookmark, 
    handleDelete, 
    handleUpdate 
  } = useTalkActions(updateTalkInFeed, removeTalkFromFeed);

  // Track initial load vs. subsequent loads
  const isInitialLoad = talks.length === 0 && isLoading;

  // Intersection Observer for Infinite Scroll
  const observer = useRef();
  const lastTalkElementRef = useCallback(node => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchTalks();
      }
    }, { rootMargin: '200px' });
    
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, fetchTalks]);

  // Initial load
  useEffect(() => {
    fetchTalks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const composerRef = useRef(null);

  const focusComposer = () => {
    composerRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Identity statement — compact, leads into composer */}
      <div className="flex flex-col mb-5">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-1.5 uppercase leading-tight">
          <span className="text-white">SAY WHAT YOU </span>
          <span className="text-primary">MEAN.</span>
        </h1>
        <p className="text-text-muted text-sm font-medium">
          No filters. No fake engagement. Start a real conversation.
        </p>
      </div>

      <CreateTalk onTalkCreated={addTalkToFeed} composerRef={composerRef} />
      
      <div className="space-y-0 pb-20">
        {/* Initial loading skeletons */}
        {isInitialLoad && (
          <>
            <TalkSkeleton />
            <TalkSkeleton />
            <TalkSkeleton />
          </>
        )}

        {/* Feed error state */}
        {feedError && talks.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
            <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
              <AlertCircle size={24} className="text-error" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Reconnecting to the network...</h2>
              <p className="text-text-muted text-sm mb-4">We're experiencing temporary turbulence. Your feed will resume shortly.</p>
            </div>
            <button
              onClick={() => fetchTalks(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border-subtle text-sm font-medium text-white hover:bg-white/5 transition-colors"
            >
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        )}

        {/* Talk cards */}
        {talks.map((talk, index) => {
          const isLast = talks.length === index + 1;
          return (
            <div ref={isLast ? lastTalkElementRef : null} key={talk._id}>
              <TalkCard 
                talk={talk} 
                onReaction={(id, type) => handleReaction(id, type, talks)}
                onBookmark={(id) => handleBookmark(id, talks)}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            </div>
          );
        })}

        {/* Loading more indicator */}
        {isLoading && talks.length > 0 && (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-primary" size={24} />
          </div>
        )}

        {/* End of feed */}
        {!hasMore && talks.length > 0 && !isLoading && (
          <div className="text-center text-text-muted py-8 text-sm font-medium">
            You've caught up.
          </div>
        )}

        {/* Empty feed (only when no error, not loading, and truly empty) */}
        {!isLoading && !feedError && talks.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
            <h2 className="text-lg font-bold text-white">Too quiet in here.</h2>
            <p className="text-text-muted text-sm">
              Say something real.
            </p>
            <button
              onClick={focusComposer}
              className="mt-1 text-primary text-sm font-semibold hover:underline"
            >
              Start a Talk
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
