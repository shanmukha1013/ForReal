import React, { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { useTalkActions } from '@/hooks/useTalkActions';
import { EmptyState, ErrorState, SkeletonList } from '@/components/ui/Feedback';
import { Spinner } from '@/components/ui/Spinner';
import { TalkCard } from './TalkCard';

// Renders a paginated list of talks from a useFeed() instance with infinite
// scroll, loading, error and empty states.
export const TalkFeed = ({ feed, empty }) => {
  const { talks, isLoading, hasMore, hasLoaded, error, fetchTalks, updateTalk, removeTalk, prependTalk } = feed;
  const actions = useTalkActions({ talks, updateTalk, removeTalk, prependTalk });
  const sentinelRef = useRef(null);

  useEffect(() => {
    fetchTalks({ refresh: true });
  }, [fetchTalks]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || error) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchTalks();
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchTalks, hasMore, error, talks.length]);

  if (!hasLoaded && isLoading) return <SkeletonList count={3} />;

  if (error && talks.length === 0) {
    return <ErrorState title="The feed didn’t load." message={error} onRetry={() => fetchTalks({ refresh: true })} />;
  }

  if (hasLoaded && talks.length === 0) {
    return empty || <EmptyState icon={MessageSquare} title="Nothing here yet." />;
  }

  return (
    <div className="space-y-4">
      {talks.map((talk) => (
        <TalkCard
          key={talk._id}
          talk={talk}
          onReaction={actions.handleReaction}
          onBookmark={actions.handleBookmark}
          onDelete={actions.handleDelete}
          onUpdate={actions.handleUpdate}
          onPatch={updateTalk}
        />
      ))}

      <div ref={sentinelRef} aria-hidden="true" />

      {isLoading && talks.length > 0 && (
        <div className="flex justify-center py-6 text-ink"><Spinner size={22} /></div>
      )}
      {error && talks.length > 0 && (
        <div className="py-4 text-center text-sm font-bold">
          Couldn’t load more. <button type="button" className="underline" onClick={() => fetchTalks()}>Retry</button>
        </div>
      )}
      {!hasMore && talks.length > 0 && (
        <p className="eyebrow py-6 text-center">You’re all caught up</p>
      )}
    </div>
  );
};
