import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePageTitle } from '@/hooks';
import {
  Search, TrendingUp, Flame, Users, MessageSquare,
  Scale, Hash, Loader2, ArrowRight, ChevronRight,
  Cpu, Landmark, Lightbulb, FlaskConical, TrendingUp as ChartUp, 
  Scale as ScaleIcon, Trophy, Globe
} from 'lucide-react';
import apiClient from '@/services/api';
import { Link } from 'react-router-dom';
import { StatusBadge, Avatar } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Category pills ──────────────────────────────────── */
const CATEGORIES = [
  { label: 'Technology', icon: Cpu },
  { label: 'Politics', icon: Landmark },
  { label: 'Philosophy', icon: Lightbulb },
  { label: 'Science', icon: FlaskConical },
  { label: 'Economics', icon: ChartUp },
  { label: 'Ethics', icon: ScaleIcon },
  { label: 'Sports', icon: Trophy },
  { label: 'Climate', icon: Globe },
];

/* ─── Debate card ─────────────────────────────────────── */
const DebateResult = ({ debate, index }) => {
  const totalVotes = debate.stats?.totalVotes || 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        to={`/debates/${debate._id}`}
        className="group flex flex-col sm:flex-row sm:items-center gap-4 bg-card-dark border border-border-subtle hover:border-primary/40 rounded-xl p-5 transition-all duration-200 hover:shadow-[0_0_24px_rgba(0,200,255,0.08)]"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={debate.status} />
            {debate.category && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-2 py-0.5 bg-white/[0.04] rounded-full border border-border-subtle">
                {debate.category}
              </span>
            )}
          </div>
          <h3 className="text-white font-bold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-1">
            {debate.title}
          </h3>
          <p className="text-text-muted text-xs line-clamp-1">{debate.description}</p>
        </div>
        <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {debate.stats?.participantCount || totalVotes}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={12} />
            {debate.stats?.totalComments || 0}
          </span>
          <ChevronRight size={14} className="hidden sm:block text-text-muted group-hover:text-primary transition-colors" />
        </div>
      </Link>
    </motion.div>
  );
};

/* ─── User card ───────────────────────────────────────── */
const UserResult = ({ user, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
  >
    <Link
      to={`/profile/${user.username}`}
      className="group flex items-center gap-4 bg-card-dark border border-border-subtle hover:border-primary/40 rounded-xl p-4 transition-all duration-200"
    >
      <Avatar src={user.profile?.avatar} username={user.username} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm group-hover:text-primary transition-colors truncate">
          {user.username}
        </p>
        {user.profile?.bio ? (
          <p className="text-text-muted text-xs truncate mt-0.5">{user.profile.bio}</p>
        ) : (
          <p className="text-text-muted text-xs mt-0.5">{user.followers?.length || 0} followers</p>
        )}
      </div>
      <ChevronRight size={14} className="text-text-muted group-hover:text-primary transition-colors shrink-0" />
    </Link>
  </motion.div>
);

/* ─── Trending debate card ────────────────────────────── */
const TrendingCard = ({ debate, rank }) => {
  const totalVotes = debate.stats?.totalVotes || 0;
  const options = debate.options || [];
  const leadingOption = options.reduce((a, b) => (a.votes > b.votes ? a : b), options[0] || {});
  const leadPct = totalVotes > 0 ? Math.round(((leadingOption?.votes || 0) / totalVotes) * 100) : 0;

  return (
    <Link
      to={`/debates/${debate._id}`}
      className="group bg-card-dark border border-border-subtle hover:border-primary/30 rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,200,255,0.1)] relative overflow-hidden"
    >
      {/* Rank watermark */}
      <span className="absolute top-3 right-4 text-5xl font-black text-white/[0.04] select-none leading-none">
        #{rank}
      </span>

      <div className="flex items-start justify-between gap-2 relative z-10">
        <StatusBadge status={debate.status} />
        {debate.category && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 shrink-0">
            {debate.category}
          </span>
        )}
      </div>

      <h3 className="text-white font-bold text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2 relative z-10">
        {debate.title}
      </h3>

      {/* Vote preview */}
      {options.length > 0 && (
        <div className="relative z-10">
          <div className="flex justify-between text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-wider">
            <span className="truncate max-w-[45%]">{options[0]?.label}</span>
            {options[1] && <span className="truncate max-w-[45%] text-right">{options[1]?.label}</span>}
          </div>
          <div className="h-1.5 bg-border-subtle rounded-full overflow-hidden flex">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: totalVotes > 0 ? `${Math.round((options[0]?.votes / totalVotes) * 100)}%` : '50%',
                backgroundColor: options[0]?.color || '#00C8FF',
              }}
            />
            <div className="flex-1 h-full" style={{ backgroundColor: options[1]?.color || '#FF3B30', opacity: 0.6 }} />
          </div>
          <p className="text-text-muted text-[10px] mt-1.5 font-medium">
            {totalVotes} votes · {leadPct}% leading
          </p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50 relative z-10">
        <div className="flex items-center gap-2">
          <Avatar src={debate.creator?.profile?.avatar} username={debate.creator?.username} size="sm" />
          <span className="text-xs text-text-muted font-medium">{debate.creator?.username}</span>
        </div>
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <MessageSquare size={11} />
          {debate.stats?.totalComments || 0}
        </span>
      </div>
    </Link>
  );
};

/* ─── Main page ───────────────────────────────────────── */
export const Explore = () => {
  usePageTitle('Explore — ForReal');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], debates: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [trendingDebates, setTrendingDebates] = useState([]);
  const [newestDebates, setNewestDebates] = useState([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);

  const inputRef = useRef(null);

  // Fetch trending on mount — no fake users
  useEffect(() => {
    const fetchExploreData = async () => {
      setIsLoadingTrending(true);
      try {
        const [trending, newest] = await Promise.all([
          apiClient.get('/debates?sort=trending&limit=6'),
          apiClient.get('/debates?sort=newest&limit=3'),
        ]);
        setTrendingDebates(trending.data?.debates || []);
        setNewestDebates(newest.data?.debates || []);
      } catch (err) {
        console.error('Explore data failed:', err);
      } finally {
        setIsLoadingTrending(false);
      }
    };
    fetchExploreData();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ users: [], debates: [] });
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/search?q=${encodeURIComponent(query.trim())}&page=1`);
        setResults(res.data || { users: [], debates: [] });
      } catch (err) {
        setSearchError('Search failed. Try again.');
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const hasResults = results.users.length > 0 || results.debates.length > 0;
  const noResults = !isSearching && query.trim() && !hasResults && !searchError;

  return (
    <div className="max-w-4xl mx-auto pb-24">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="mb-8 pt-2">
        <h1 className="text-4xl font-black text-white tracking-tight leading-tight mb-2">
          Explore
        </h1>
        <p className="text-text-muted text-sm">
          Discover active debates, search topics, and find what's being argued right now.
        </p>
      </div>

      {/* ── Search bar ─────────────────────────────────── */}
      <div className="relative mb-8">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
          {isSearching ? (
            <Loader2 size={18} className="animate-spin text-primary" />
          ) : (
            <Search size={18} />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search debates, topics, or users…"
          className="w-full bg-card-dark border border-border-subtle rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white text-xs font-bold transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Category chips ─────────────────────────────── */}
      {!query && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-10 scrollbar-hide">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.label}
                onClick={() => { setQuery(cat.label); inputRef.current?.focus(); }}
                className="shrink-0 flex items-center gap-2 px-4 py-2 bg-card-dark border border-border-subtle hover:border-primary/50 hover:bg-primary/5 rounded-full text-sm font-semibold text-text-muted hover:text-white transition-all duration-200 whitespace-nowrap"
              >
                <Icon size={16} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Search results ─────────────────────────────── */}
        {query.trim() ? (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Error */}
            {searchError && (
              <div className="text-center py-12 text-text-muted">
                <p className="text-sm">{searchError}</p>
              </div>
            )}

            {/* No results */}
            {noResults && (
              <div className="text-center py-20 border border-dashed border-border-subtle rounded-2xl bg-card-dark">
                <Search size={32} className="mx-auto text-text-muted mb-3 opacity-40" />
                <h3 className="text-lg font-bold text-white mb-1">No results found</h3>
                <p className="text-text-muted text-sm max-w-xs mx-auto">
                  Try a different keyword or browse categories below.
                </p>
              </div>
            )}

            {/* Debates */}
            {results.debates.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Scale size={14} className="text-primary" />
                  Debates
                  <span className="text-primary ml-1">{results.debates.length}</span>
                </h2>
                <div className="space-y-3">
                  {results.debates.map((d, i) => (
                    <DebateResult key={d._id} debate={d} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Users */}
            {results.users.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Users size={14} className="text-primary" />
                  People
                  <span className="text-primary ml-1">{results.users.length}</span>
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {results.users.map((u, i) => (
                    <UserResult key={u._id} user={u} index={i} />
                  ))}
                </div>
              </section>
            )}
          </motion.div>
        ) : (
          /* ── Discovery view (no query) ─────────────────── */
          <motion.div
            key="discover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-12"
          >
            {/* Trending */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Flame size={16} className="text-orange-400" />
                  Trending Now
                </h2>
                <Link
                  to="/debates"
                  className="text-xs text-text-muted hover:text-primary font-bold flex items-center gap-1 transition-colors"
                >
                  All debates <ArrowRight size={12} />
                </Link>
              </div>

              {isLoadingTrending ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-card-dark border border-border-subtle rounded-2xl p-5 animate-pulse h-48" />
                  ))}
                </div>
              ) : trendingDebates.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trendingDebates.map((debate, i) => (
                    <TrendingCard key={debate._id} debate={debate} rank={i + 1} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 border border-dashed border-border-subtle rounded-2xl bg-card-dark">
                  <Scale size={28} className="mx-auto text-text-muted mb-3 opacity-40" />
                  <p className="text-text-muted text-sm">No debates yet.</p>
                  <Link to="/debates" className="mt-3 inline-block text-primary text-sm font-bold hover:underline">
                    Start the first debate →
                  </Link>
                </div>
              )}
            </section>

            {/* Recently opened */}
            {newestDebates.length > 0 && (
              <section>
                <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-5">
                  <TrendingUp size={16} className="text-primary" />
                  Just Opened
                </h2>
                <div className="space-y-3">
                  {newestDebates.map((d, i) => (
                    <DebateResult key={d._id} debate={d} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Topics grid */}
            <section>
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-5">
                <Hash size={16} className="text-primary" />
                Browse by Topic
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.label}
                      onClick={() => { setQuery(cat.label); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="flex flex-col items-center justify-center gap-2 bg-card-dark border border-border-subtle hover:border-primary/40 hover:bg-primary/5 rounded-xl py-5 transition-all duration-200 group"
                    >
                      <Icon size={24} className="text-text-muted group-hover:text-primary transition-colors" />
                      <span className="text-xs font-bold text-text-muted group-hover:text-white transition-colors">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
