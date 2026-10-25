import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, MessageCircle, Scale, MessageSquare, Quote } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/services/api';
import { debateService } from '@/services/debateService';
import useAuthStore from '@/store/useAuthStore';
import { useFeed, usePageTitle } from '@/hooks';
import { TalkFeed } from '@/components/feed';
import { Avatar, Button, EmptyState, ErrorState, Skeleton, SkeletonList, StatusBadge, Tabs } from '@/components/ui';
import { DebateCard } from '@/features/debates/DebateCard';
import { SideChip } from '@/features/debates/ArgumentCard';
import { compact, displayName, timeAgo } from '@/lib/format';

const DebatesTab = ({ username, isSelf }) => {
  const [state, setState] = useState({ status: 'loading', debates: [] });
  useEffect(() => {
    let cancelled = false;
    debateService.list({ username, sort: 'newest', limit: 20 })
      .then((res) => !cancelled && setState({ status: 'ready', debates: res.data.debates }))
      .catch((error) => !cancelled && setState({ status: 'error', error: error.message, debates: [] }));
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (state.status === 'loading') return <SkeletonList count={2} />;
  if (state.status === 'error') return <ErrorState title="Debates didn’t load." message={state.error} />;
  if (!state.debates.length) {
    return (
      <EmptyState icon={Scale} title="No debates yet." action={isSelf && <Button to="/debates?new=1" variant="accent">Open a debate</Button>}>
        {isSelf ? 'Ask a question worth arguing about.' : `@${username} hasn’t opened a debate yet.`}
      </EmptyState>
    );
  }
  return <div className="space-y-4">{state.debates.map((d) => <DebateCard key={d._id} debate={d} />)}</div>;
};

const ArgumentsTab = ({ username, isSelf }) => {
  const [state, setState] = useState({ status: 'loading', items: [] });
  useEffect(() => {
    let cancelled = false;
    debateService.argumentsBy(username)
      .then((res) => !cancelled && setState({ status: 'ready', items: res.data.arguments }))
      .catch((error) => !cancelled && setState({ status: 'error', error: error.message, items: [] }));
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (state.status === 'loading') return <SkeletonList count={2} />;
  if (state.status === 'error') return <ErrorState title="Arguments didn’t load." message={state.error} />;
  if (!state.items.length) {
    return (
      <EmptyState icon={Quote} title="No arguments yet." action={isSelf && <Button to="/debates" variant="accent">Find a debate</Button>}>
        {isSelf ? 'Pick a side somewhere and make your case.' : `@${username} hasn’t argued anywhere yet.`}
      </EmptyState>
    );
  }
  return (
    <ul className="space-y-3">
      {state.items.map((arg) => (
        <li key={arg._id}>
          <Link to={`/debates/${arg.debate._id}`} className="card card-interactive block p-4">
            <span className="mb-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={arg.debate.status} />
              {!arg.parentComment && <SideChip options={arg.debate.options} optionId={arg.optionId} />}
              {arg.parentComment && <span className="eyebrow">Reply</span>}
              <span className="ml-auto text-xs font-semibold text-ink/70">{timeAgo(arg.createdAt)}</span>
            </span>
            <span className="block text-xs font-extrabold uppercase tracking-wide text-ink/70">On: {arg.debate.title}</span>
            <span className="mt-1 line-clamp-3 block text-sm">{arg.content}</span>
            <span className="mt-2 block text-xs font-bold text-ink/70">
              {arg.reactionsCount?.like || 0} endorsements · {arg.repliesCount || 0} replies
              {arg.references?.length ? ' · sourced' : ''}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

const TalksTab = ({ username, isSelf }) => {
  const feed = useFeed({ author: username });
  return (
    <TalkFeed
      feed={feed}
      empty={(
        <EmptyState icon={MessageSquare} title="No talks yet." action={isSelf && <Button to="/home" variant="accent">Write a talk</Button>}>
          {isSelf ? 'Say something you actually believe.' : `@${username} hasn’t posted yet.`}
        </EmptyState>
      )}
    />
  );
};

export default function Profile() {
  const { username } = useParams();
  usePageTitle(`@${username}`);
  const viewerId = useAuthStore((s) => s.user?._id);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('debates');
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await apiClient.get(`/users/${encodeURIComponent(username)}`);
      setProfile(res.data);
    } catch (err) {
      setError(err);
    }
  }, [username]);

  useEffect(() => {
    setProfile(null);
    setTab('debates');
    load();
  }, [load]);

  const toggleFollow = async () => {
    if (!profile || followBusy) return;
    setFollowBusy(true);
    const wasFollowing = profile.isFollowing;
    setProfile((p) => ({
      ...p,
      isFollowing: !wasFollowing,
      stats: { ...p.stats, followerCount: Math.max(0, p.stats.followerCount + (wasFollowing ? -1 : 1)) },
    }));
    try {
      const res = await apiClient.post(`/users/${profile._id}/${wasFollowing ? 'unfollow' : 'follow'}`);
      setProfile((p) => ({ ...p, isFollowing: res.data.isFollowing, stats: { ...p.stats, followerCount: res.data.followerCount } }));
    } catch (err) {
      setProfile((p) => ({
        ...p,
        isFollowing: wasFollowing,
        stats: { ...p.stats, followerCount: Math.max(0, p.stats.followerCount + (wasFollowing ? 1 : -1)) },
      }));
      toast.error(err.message);
    } finally {
      setFollowBusy(false);
    }
  };

  if (error) {
    return (
      <ErrorState
        title={error.status === 404 ? 'No one by that name.' : 'This profile didn’t load.'}
        message={error.status === 404 ? `There’s no ForReal account called @${username}.` : error.message}
        onRetry={error.status === 404 ? undefined : load}
      />
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading profile">
        <Skeleton className="h-44 w-full" />
        <SkeletonList count={2} />
      </div>
    );
  }

  const isSelf = profile.isSelf || profile._id === viewerId;

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="relative h-28 border-b-2 border-ink bg-ink sm:h-32">
          <div className="absolute inset-0 text-ember/40 hatched" aria-hidden="true" />
          <span className="font-display absolute bottom-2 right-4 text-5xl text-ember/80" aria-hidden="true">@{profile.username}</span>
        </div>
        <div className="px-5 pb-5 sm:px-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-3">
            <Avatar src={profile.profile?.avatar} username={profile.username} size="2xl" className="shadow-hard" />
            <div className="flex gap-2 pb-1">
              {isSelf ? (
                <Button to="/settings" variant="outline" size="sm">Edit profile</Button>
              ) : (
                <>
                  <Button to={`/messages?user=${profile._id}`} variant="outline" size="sm">
                    <MessageCircle size={15} strokeWidth={2.5} /> Message
                  </Button>
                  <Button variant={profile.isFollowing ? 'outline' : 'primary'} size="sm" onClick={toggleFollow} disabled={followBusy}>
                    {profile.isFollowing ? 'Following' : 'Follow'}
                  </Button>
                </>
              )}
            </div>
          </div>

          <h1 className="font-display mt-4 text-5xl">{displayName(profile)}</h1>
          <p className="text-sm font-semibold text-ink/70">@{profile.username}</p>
          {profile.profile?.bio ? (
            <p className="mt-3 max-w-xl whitespace-pre-wrap text-[15px]">{profile.profile.bio}</p>
          ) : (
            <p className="mt-3 text-sm italic text-ink/70">{isSelf ? 'Add a bio so people know what you stand for.' : 'No bio yet.'}</p>
          )}

          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex gap-1.5"><dt className="sr-only">Followers</dt><dd><strong className="tabular">{compact(profile.stats.followerCount)}</strong> {profile.stats.followerCount === 1 ? 'follower' : 'followers'}</dd></div>
            <div className="flex gap-1.5"><dt className="sr-only">Following</dt><dd><strong className="tabular">{compact(profile.stats.followingCount)}</strong> following</dd></div>
            <div className="flex items-center gap-1.5 text-ink/70">
              <CalendarDays size={14} aria-hidden="true" />
              <dt className="sr-only">Joined</dt>
              <dd>Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</dd>
            </div>
          </dl>
        </div>
      </section>

      <Tabs
        label="Profile sections"
        tabs={[
          { value: 'debates', label: 'Debates' },
          { value: 'arguments', label: 'Arguments' },
          { value: 'talks', label: 'Talks' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'debates' && <DebatesTab username={profile.username} isSelf={isSelf} />}
      {tab === 'arguments' && <ArgumentsTab username={profile.username} isSelf={isSelf} />}
      {tab === 'talks' && <TalksTab username={profile.username} isSelf={isSelf} />}
    </div>
  );
}
