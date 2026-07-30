import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePageTitle } from '@/hooks';
import { Search, TrendingUp, User, MessageCircle, ChevronRight, Hash, Activity } from 'lucide-react';
import apiClient from '@/services/api';
import { Link, useNavigate } from 'react-router-dom';
import { StatusBadge, CredibilityBadge, SkeletonCard, Avatar } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';

export const Explore = () => {
  usePageTitle('Explore | ForReal');
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], debates: [] });
  const [isSearching, setIsSearching] = useState(false);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [trendingDebates, setTrendingDebates] = useState([]);
  const [recommendedUsers, setRecommendedUsers] = useState([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);

  // Fetch trending and recommended on mount
  useEffect(() => {
    const fetchExploreData = async () => {
      try {
        const [debatesRes, usersRes] = await Promise.all([
          apiClient.get('/debates?sort=trending&limit=4'),
          apiClient.get('/search?q=e&type=users&limit=4') // basic way to get some active users
        ]);
        
        setTrendingDebates(debatesRes.data.debates || []);
        setRecommendedUsers(usersRes.data.users || []);
      } catch (err) {
        console.error('Failed to load explore data', err);
      } finally {
        setIsLoadingTrending(false);
      }
    };
    fetchExploreData();
  }, []);

  // Debounce search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ users: [], debates: [] });
      setIsSearching(false);
      setPage(1);
      return;
    }

    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/search?q=${query}&page=1`);
        setResults(res.data || { users: [], debates: [] });
        setPage(1);
        setHasMore((res.data.users?.length || 0) === 10 || (res.data.debates?.length || 0) === 10);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const loadMore = async () => {
    if (isSearching || !hasMore) return;
    const nextPage = page + 1;
    setIsSearching(true);
    try {
      const res = await apiClient.get(`/search?q=${query}&page=${nextPage}`);
      const newUsers = res.data.users || [];
      const newDebates = res.data.debates || [];
      
      setResults(prev => ({
        users: [...prev.users, ...newUsers],
        debates: [...prev.debates, ...newDebates]
      }));
      setPage(nextPage);
      setHasMore(newUsers.length === 10 || newDebates.length === 10);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const topics = ['Philosophy', 'Technology', 'Politics', 'Science', 'Economics', 'Ethics'];

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Search Header */}
      <div className="mb-10 relative">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6">Explore</h1>
        
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-primary-bright rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative flex items-center bg-card-dark border border-border-subtle rounded-2xl p-2 shadow-xl">
            <Search className="text-text-muted ml-3 mr-2" size={24} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users, debates, and logical topics..."
              className="w-full bg-transparent border-none py-3 px-2 text-lg text-white placeholder-text-muted focus:outline-none focus:ring-0"
            />
          </div>
        </div>
      </div>

      {!query.trim() ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
          
          {/* Topics Carousel */}
          <div>
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
              <Hash size={16} /> Discover Topics
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {topics.map((topic, i) => (
                <motion.button 
                  key={topic}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setQuery(topic)}
                  className="snap-start shrink-0 px-6 py-3 rounded-full border border-border-subtle bg-bg-dark hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all text-white font-medium whitespace-nowrap"
                >
                  {topic}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Trending Debates */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-primary" /> Trending Debates
              </h2>
              <button className="text-xs text-primary hover:text-primary-bright font-bold uppercase tracking-widest flex items-center">
                View All <ChevronRight size={14} />
              </button>
            </div>
            
            {isLoadingTrending ? (
              <div className="grid md:grid-cols-2 gap-4">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {trendingDebates.map(debate => (
                  <Link 
                    key={debate._id} 
                    to={`/debates/${debate._id}`} 
                    className="group flex flex-col justify-between bg-card-dark border border-border-subtle p-5 rounded-2xl hover:border-primary/50 transition-all shadow-subtle hover:shadow-[0_0_20px_rgba(0,200,255,0.1)] relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
                    
                    <div>
                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <StatusBadge status={debate.status} />
                        <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold px-2 py-1 bg-white/5 rounded">
                          {debate.category}
                        </span>
                      </div>
                      <h3 className="font-black text-white text-lg leading-tight mb-3 group-hover:text-primary transition-colors relative z-10 line-clamp-2">
                        {debate.title}
                      </h3>
                      <p className="text-sm text-text-muted line-clamp-2 mb-4 relative z-10">
                        {debate.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-border-subtle relative z-10">
                      <div className="flex items-center gap-2">
                        <Avatar src={debate.creator?.profile?.avatar} username={debate.creator?.username} size="sm" />
                        <span className="text-xs font-bold text-white">{debate.creator?.username}</span>
                      </div>
                      <span className="text-xs font-medium text-text-muted flex items-center gap-1 bg-white/5 px-2 py-1 rounded-full">
                        <User size={12} /> {debate.stats?.participantCount || 0}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recommended Users */}
          <div>
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={16} /> Featured Logicians
            </h2>
            
            {isLoadingTrending ? (
              <div className="flex gap-4 overflow-x-auto pb-4">
                <div className="w-48 h-48 bg-card-dark border border-border-subtle rounded-2xl shrink-0 animate-pulse"></div>
                <div className="w-48 h-48 bg-card-dark border border-border-subtle rounded-2xl shrink-0 animate-pulse"></div>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {recommendedUsers.map(user => (
                  <Link 
                    key={user._id} 
                    to={`/profile/${user.username}`} 
                    className="snap-start shrink-0 w-48 flex flex-col items-center text-center bg-card-dark border border-border-subtle p-5 rounded-2xl hover:border-primary/50 transition-all group"
                  >
                    <div className="mb-3 relative">
                      <Avatar src={user.profile?.avatar} username={user.username} size="xl" />
                      <div className="absolute -bottom-2 -right-2 bg-bg-dark rounded-full p-1 border border-border-subtle">
                        <CredibilityBadge score={user.credibilityScore || 50} size="sm" />
                      </div>
                    </div>
                    <span className="font-bold text-white mb-1 group-hover:text-primary transition-colors">{user.username}</span>
                    <span className="text-xs text-text-muted">{user.followers?.length || 0} Followers</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          {isSearching && (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}
          
          {!isSearching && results.users.length === 0 && results.debates.length === 0 && (
            <div className="text-center py-16 bg-card-dark border border-border-subtle rounded-2xl">
              <Search className="mx-auto text-text-muted mb-4 opacity-50" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
              <p className="text-text-muted text-sm">We couldn't find anything matching "{query}".</p>
            </div>
          )}

          {!isSearching && results.debates.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <MessageCircle size={16} /> Debates
              </h3>
              <div className="grid gap-3">
                {results.debates.map(debate => (
                  <Link 
                    key={debate._id} 
                    to={`/debates/${debate._id}`} 
                    className="flex justify-between items-center bg-card-dark border border-border-subtle p-4 rounded-xl hover:border-primary/50 hover:bg-white/5 transition-all group"
                  >
                    <div>
                      <h4 className="font-bold text-white leading-tight mb-1 group-hover:text-primary transition-colors">{debate.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span>{debate.stats?.participantCount || 0} participants</span>
                        <span>•</span>
                        <span className="uppercase">{debate.category}</span>
                      </div>
                    </div>
                    <StatusBadge status={debate.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!isSearching && results.users.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 mt-8 flex items-center gap-2">
                <User size={16} /> Users
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {results.users.map(user => (
                  <Link 
                    key={user._id} 
                    to={`/profile/${user.username}`} 
                    className="flex items-center gap-4 bg-card-dark border border-border-subtle p-3 rounded-xl hover:border-primary/50 transition-all group"
                  >
                    <Avatar src={user.profile?.avatar} username={user.username} size="lg" />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-white group-hover:text-primary transition-colors">{user.username}</span>
                        <CredibilityBadge score={user.credibilityScore || 50} size="sm" />
                      </div>
                      <p className="text-xs text-text-muted">{user.followers?.length || 0} Followers</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center mt-8">
              <button 
                onClick={loadMore}
                disabled={isSearching}
                className="px-6 py-2 bg-card-dark border border-border-subtle rounded-full text-white text-sm font-medium hover:border-primary/50 transition-colors"
              >
                {isSearching ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
