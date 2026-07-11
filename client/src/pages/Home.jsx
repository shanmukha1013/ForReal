import React, { useEffect, useRef, useCallback } from 'react';
import { CreateTalk, TalkCard, Card } from '@/components';
import { useFeed, useTalkActions } from '@/hooks';
import { Loader2 } from 'lucide-react';

export const Home = () => {
  const { 
    talks, 
    isLoading, 
    hasMore, 
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

  // Intersection Observer for Infinite Scroll
  const observer = useRef();
  const lastTalkElementRef = useCallback(node => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchTalks();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore, fetchTalks]);

  // Initial load
  useEffect(() => {
    fetchTalks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white tracking-tight">Home</h1>
      </div>

      <CreateTalk onTalkCreated={addTalkToFeed} />
      
      <div className="space-y-4 pb-20">
        {talks.map((talk, index) => {
          if (talks.length === index + 1) {
            return (
              <div ref={lastTalkElementRef} key={talk._id}>
                <TalkCard 
                  talk={talk} 
                  onReaction={(id, type) => handleReaction(id, type, talks)}
                  onBookmark={handleBookmark}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              </div>
            );
          } else {
            return (
              <TalkCard 
                key={talk._id} 
                talk={talk} 
                onReaction={(id, type) => handleReaction(id, type, talks)}
                onBookmark={handleBookmark}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            );
          }
        })}

        {isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        )}

        {!hasMore && talks.length > 0 && (
          <div className="text-center text-text-muted py-8 font-medium">
            You've caught up! No more talks to show.
          </div>
        )}

        {!isLoading && talks.length === 0 && (
          <Card className="text-center py-16 border-dashed opacity-70">
            <h2 className="text-xl font-bold text-white mb-2">No Talks Yet</h2>
            <p className="text-text-muted mb-6 max-w-md mx-auto">
              The feed is looking a little empty. Be the first to start a conversation!
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
