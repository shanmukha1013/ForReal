import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { talkService } from '@/services/talkService';
import { TalkCard } from '@/components/feed';
import { ErrorState, PostSkeleton } from '@/components/ui';
import { usePageTitle, useTalkActions } from '@/hooks';

export default function TalkView() {
  usePageTitle('Talk');
  const { talkId } = useParams();
  const navigate = useNavigate();
  const [talk, setTalk] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await talkService.getTalk(talkId);
      setTalk(res.data);
    } catch (err) {
      setError(err);
    }
  }, [talkId]);

  useEffect(() => {
    setTalk(null);
    load();
  }, [load]);

  const talks = useMemo(() => (talk ? [talk] : []), [talk]);
  const updateTalk = useCallback((id, updates) => setTalk((t) => (t && t._id === id ? { ...t, ...updates } : t)), []);
  const removeTalk = useCallback(() => navigate('/home', { replace: true }), [navigate]);
  const actions = useTalkActions({ talks, updateTalk, removeTalk });

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))}
        className="mb-5 inline-flex items-center gap-2 text-sm font-extrabold"
      >
        <ArrowLeft size={16} strokeWidth={2.75} /> Back
      </button>

      {error ? (
        <ErrorState
          title={error.status === 404 ? 'This talk is gone.' : 'This talk didn’t load.'}
          message={error.status === 404 ? 'It may have been deleted by its author.' : error.message}
          onRetry={error.status === 404 ? undefined : load}
        />
      ) : !talk ? (
        <PostSkeleton />
      ) : (
        <TalkCard
          talk={talk}
          onReaction={actions.handleReaction}
          onBookmark={actions.handleBookmark}
          onDelete={actions.handleDelete}
          onUpdate={actions.handleUpdate}
          onPatch={updateTalk}
          defaultCommentsOpen
        />
      )}
    </div>
  );
}
