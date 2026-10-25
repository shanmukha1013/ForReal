import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import apiClient from '@/services/api';
import { debateService } from '@/services/debateService';
import { DebateCard } from '@/features/debates/DebateCard';
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton, SkeletonList, StatusBadge } from '@/components/ui';
import { RichText } from '@/components/feed/TalkContent';
import { usePageTitle } from '@/hooks';
import { CATEGORIES } from '@/lib/constants';
import { displayName, plural, timeAgo } from '@/lib/format';

const Section = ({ title, count, children }) => (
  <section className="space-y-3">
    <h2 className="eyebrow flex items-center gap-2">
      {title} <span className="rounded-full border-2 border-ink bg-ivory px-1.5 tabular">{count}</span>
    </h2>
    {children}
  </section>
);

const SearchResults = ({ query }) => {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, status: 'loading' }));
    // Debounce typing; abort superseded requests.
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get('/search', { params: { q: query }, signal: controller.signal });
        setState({ status: 'ready', data: res.data, error: null });
      } catch (error) {
        if (!controller.signal.aborted) setState({ status: 'error', data: null, error: error.message });
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  if (state.status === 'loading' && !state.data) return <SkeletonList count={2} />;
  if (state.status === 'error') return <ErrorState title="Search failed." message={state.error} />;

  const { users = [], debates = [], talks = [] } = state.data || {};
  if (!users.length && !debates.length && !talks.length) {
    return (
      <EmptyState icon={Search} title="No results.">
        Nothing matches “{query}”. Try a broader word, or open a debate about it.
      </EmptyState>
    );
  }

  return (
    <div className={`space-y-8 transition-opacity ${state.status === 'loading' ? 'opacity-60' : ''}`}>
      {debates.length > 0 && (
        <Section title="Debates" count={debates.length}>
          <div className="space-y-4">{debates.map((d) => <DebateCard key={d._id} debate={d} />)}</div>
        </Section>
      )}
      {users.length > 0 && (
        <Section title="People" count={users.length}>
          <div className="grid gap-3 sm:grid-cols-2">
            {users.map((u) => (
              <Link key={u._id} to={`/profile/${u.username}`} className="card card-interactive flex items-center gap-3 p-4">
                <Avatar src={u.profile?.avatar} username={u.username} size="md" />
                <span className="min-w-0">
                  <span className="block truncate font-extrabold">{displayName(u)}</span>
                  <span className="block truncate text-xs text-ink/70">@{u.username} · {plural(u.followerCount, 'follower')}</span>
                </span>
              </Link>
            ))}
          </div>
        </Section>
      )}
      {talks.length > 0 && (
        <Section title="Talks" count={talks.length}>
          <div className="space-y-3">
            {talks.map((t) => (
              <Link key={t._id} to={`/talks/${t._id}`} className="card card-interactive block p-4">
                <span className="mb-1 flex items-center gap-2 text-xs font-bold">
                  <Avatar src={t.author?.profile?.avatar} username={t.author?.username} size="xs" />
                  @{t.author?.username} · {timeAgo(t.createdAt)}
                </span>
                <span className="line-clamp-3 text-sm">{t.content}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

const Discover = () => {
  const [state, setState] = useState({ status: 'loading', trending: [], closed: [] });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      debateService.list({ sort: 'trending', status: 'open', limit: 4 }),
      debateService.list({ status: 'finished', sort: 'newest', limit: 3 }),
    ])
      .then(([trending, closed]) => {
        if (!cancelled) setState({ status: 'ready', trending: trending.data.debates, closed: closed.data.debates });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', error: error.message, trending: [], closed: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="eyebrow mb-3">Browse by topic</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              to={`/debates?category=${encodeURIComponent(c)}`}
              className="card card-interactive flex h-16 items-center justify-center px-2 text-center text-sm font-extrabold"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="eyebrow">Live and trending</h2>
          <Link to="/debates" className="inline-flex items-center gap-1 text-xs font-extrabold underline underline-offset-4">
            All debates <ArrowRight size={13} strokeWidth={3} />
          </Link>
        </div>
        {state.status === 'loading' ? (
          <div className="space-y-4"><Skeleton className="h-48 w-full" /><Skeleton className="h-48 w-full" /></div>
        ) : state.status === 'error' ? (
          <ErrorState title="Couldn’t load debates." message={state.error} />
        ) : state.trending.length ? (
          <div className="space-y-4">{state.trending.map((d, i) => <DebateCard key={d._id} debate={d} rank={i + 1} />)}</div>
        ) : (
          <EmptyState title="Nothing live right now.">Open a debate and it will show up here.</EmptyState>
        )}
      </section>

      {state.closed.length > 0 && (
        <section>
          <h2 className="eyebrow mb-3">Recently decided</h2>
          <div className="space-y-2">
            {state.closed.map((d) => (
              <Link key={d._id} to={`/debates/${d._id}`} className="card card-interactive flex items-center justify-between gap-3 p-4">
                <span className="min-w-0">
                  <span className="block truncate font-extrabold">{d.title}</span>
                  <span className="block truncate text-xs text-ink/70">{d.finalVerdict?.communityVerdict || d.category}</span>
                </span>
                <StatusBadge status={d.status} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="card p-5">
        <h2 className="eyebrow mb-2">Search tips</h2>
        <RichText
          className="text-sm"
          text={'Search debates by topic or wording, people by name, and talks by phrase. Hashtags work too — try #attention.'}
        />
      </section>
    </div>
  );
};

export default function Explore() {
  usePageTitle('Explore');
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q') || '';
  const [input, setInput] = useState(urlQuery);
  const inputRef = useRef(null);
  const pushedQuery = useRef(urlQuery);
  const urlTimer = useRef(null);
  const query = input.trim();

  // The input is the source of truth while typing; the URL is updated after a
  // short pause. Router navigations commit asynchronously, so writing the URL
  // on every keystroke let stale values overwrite newer typing. The input is
  // only re-synced when the URL changes from outside (e.g. a hashtag link).
  useEffect(() => {
    if (urlQuery !== pushedQuery.current) {
      pushedQuery.current = urlQuery;
      setInput(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => () => clearTimeout(urlTimer.current), []);

  const update = (value, { immediate = false } = {}) => {
    setInput(value);
    clearTimeout(urlTimer.current);
    const write = () => {
      pushedQuery.current = value.trim() ? value : '';
      setParams((current) => {
        const next = new URLSearchParams(current);
        if (value.trim()) next.set('q', value);
        else next.delete('q');
        return next;
      }, { replace: true });
    };
    if (immediate) write();
    else urlTimer.current = setTimeout(write, 400);
  };

  return (
    <div>
      <PageHeader eyebrow="Discover" title="Explore" description="Find the questions being argued right now — and the people arguing them." />

      <div className="relative mb-8">
        <Search size={20} strokeWidth={2.5} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <label htmlFor="explore-search" className="sr-only">Search ForReal</label>
        <input
          id="explore-search"
          ref={inputRef}
          type="search"
          value={input}
          onChange={(e) => update(e.target.value)}
          placeholder="Search debates, people, talks or #hashtags"
          className="field h-14 pl-12 pr-12 text-base font-semibold shadow-hard"
          autoComplete="off"
        />
        {input && (
          <button
            type="button"
            onClick={() => { update('', { immediate: true }); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[4px] hover:bg-ink hover:text-ivory"
            aria-label="Clear search"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {query.length >= 1 && query !== '#' ? <SearchResults query={query} /> : <Discover />}
      <span className="sr-only" aria-live="polite">{query ? `Showing results for ${query}` : ''}</span>
    </div>
  );
}
