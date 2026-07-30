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
    <div className="max-w-5xl mx-auto pb-32">
      {/* Hero Header */}
      <div className="relative mb-16 pt-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-bg-dark to-bg-dark pointer-events-none -z-10" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 tracking-tight mb-4">
            Discover Truth.
          </h1>
          <p className="text-text-muted text-lg md:text-xl max-w-2xl mx-auto">
            Search the ForReal network for logic-driven debates, intellectual peers, and pressing topics.
          </p>
        </motion.div>
        
        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl mx-auto relative group z-10"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-bright rounded-3xl blur-md opacity-25 group-hover:opacity-50 transition duration-500"></div>
          <div className="relative flex items-center bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-2 shadow-2xl">
            <div className="bg-white/5 p-3 rounded-2xl ml-1">
              <Search className="text-primary" size={24} />
            </div>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search concepts, debates, or logicians..."
              className="w-full bg-transparent border-none py-4 px-4 text-xl text-white placeholder-text-muted/60 focus:outline-none focus:ring-0"
            />
            {isSearching && (
              <div className="mr-4">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {!query.trim() ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-20 px-4 md:px-0">
          
          {/* Topics */}
          <section>
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
              <Hash size={18} className="text-primary" /> Fields of Inquiry
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
              {topics.map((topic, i) => (
                <motion.button 
                  key={topic}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setQuery(topic)}
                  className="snap-start shrink-0 px-8 py-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-primary/10 hover:border-primary/30 transition-all text-white font-semibold tracking-wide whitespace-nowrap shadow-lg backdrop-blur-sm"
                >
                  {topic}
                </motion.button>
              ))}
            </div>
          </section>

          {/* Trending Debates */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-text-muted uppercase tracking-[0.2em] flex items-center gap-3">
                <Activity size={18} className="text-primary" /> Trending Discourse
              </h2>
            </div>
            
            {isLoadingTrending ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {trendingDebates.map(debate => (
                  <Link 
                    key={debate._id} 
                    to={`/debates/${debate._id}`} 
                    className="group flex flex-col justify-between bg-[#111] border border-white/5 p-6 md:p-8 rounded-[2rem] hover:border-primary/40 transition-all duration-300 shadow-xl hover:shadow-[0_8px_32px_rgba(0,200,255,0.15)] relative overflow-hidden transform hover:-translate-y-1"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] group-hover:bg-primary/20 transition-colors pointer-events-none -mr-20 -mt-20" />
                    
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-5">
                        <StatusBadge status={debate.status} />
                        <span className="text-xs uppercase tracking-[0.15em] text-primary/80 font-bold px-3 py-1.5 bg-primary/10 rounded-lg">
                          {debate.category}
                        </span>
                      </div>
                      <h3 className="font-black text-white text-2xl leading-tight mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-primary-bright transition-all line-clamp-2">
                        {debate.title}
                      </h3>
                      <p className="text-base text-text-muted/80 leading-relaxed line-clamp-3 mb-6">
                        {debate.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10 mt-auto">
                      <div className="flex items-center gap-3">
                        <Avatar src={debate.creator?.profile?.avatar} username={debate.creator?.username} size="sm" />
                        <span className="text-sm font-bold text-white/90">{debate.creator?.username}</span>
                      </div>
                      <span className="text-sm font-bold text-text-muted flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl">
                        <User size={14} /> {debate.stats?.participantCount || 0}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Recommended Users */}
          <section>
            <h2 className="text-sm font-bold text-text-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
              <TrendingUp size={18} className="text-primary" /> Prominent Logicians
            </h2>
            
            {isLoadingTrending ? (
              <div className="flex gap-6 overflow-x-auto pb-6">
                <div className="w-56 h-64 bg-[#111] border border-white/5 rounded-[2rem] shrink-0 animate-pulse"></div>
                <div className="w-56 h-64 bg-[#111] border border-white/5 rounded-[2rem] shrink-0 animate-pulse"></div>
              </div>
            ) : (
              <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x">
                {recommendedUsers.map(user => (
                  <Link 
                    key={user._id} 
                    to={`/profile/${user.username}`} 
                    className="snap-start shrink-0 w-56 flex flex-col items-center justify-center text-center bg-[#111] border border-white/5 p-8 rounded-[2rem] hover:border-primary/40 hover:bg-white/[0.02] transition-all duration-300 group shadow-xl hover:-translate-y-2 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="mb-5 relative z-10">
                      <div className="p-1 rounded-full border-2 border-transparent group-hover:border-primary/30 transition-colors">
                        <Avatar src={user.profile?.avatar} username={user.username} size="xl" />
                      </div>
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-bg-dark rounded-full p-1.5 border border-white/10 shadow-xl">
                        <CredibilityBadge score={user.credibilityScore || 50} size="md" />
                      </div>
                    </div>
                    <span className="font-bold text-xl text-white mb-2 group-hover:text-primary transition-colors relative z-10">{user.username}</span>
                    <span className="text-sm font-medium text-text-muted/70 relative z-10">{user.followers?.length || 0} Followers</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 px-4 md:px-0">
          
          {!isSearching && results.users.length === 0 && results.debates.length === 0 && (
            <div className="text-center py-24 bg-[#111] border border-white/5 rounded-[2rem] shadow-2xl">
              <Search className="mx-auto text-text-muted mb-6 opacity-40" size={56} />
              <h3 className="text-2xl font-black text-white mb-3">Void.</h3>
              <p className="text-text-muted text-lg max-w-sm mx-auto">We couldn't locate any data matching your parameters.</p>
            </div>
          )}

          {!isSearching && results.debates.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                <MessageCircle size={18} className="text-primary" /> Active Discourse
              </h3>
              <div className="grid gap-4">
                {results.debates.map(debate => (
                  <Link 
                    key={debate._id} 
                    to={`/debates/${debate._id}`} 
                    className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#111] border border-white/5 p-6 rounded-[1.5rem] hover:border-primary/40 hover:bg-white/[0.02] transition-all duration-300 group shadow-lg"
                  >
                    <div className="mb-4 md:mb-0 max-w-2xl">
                      <h4 className="font-black text-white text-xl leading-tight mb-2 group-hover:text-primary transition-colors">{debate.title}</h4>
                      <div className="flex items-center gap-3 text-sm font-medium text-text-muted/80">
                        <span className="uppercase tracking-widest text-white/50">{debate.category}</span>
                        <span>•</span>
                        <span>{debate.stats?.participantCount || 0} participants</span>
                      </div>
                    </div>
                    <StatusBadge status={debate.status} />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {!isSearching && results.users.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-[0.2em] mb-6 mt-12 flex items-center gap-3">
                <User size={18} className="text-primary" /> Network Identities
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {results.users.map(user => (
                  <Link 
                    key={user._id} 
                    to={`/profile/${user.username}`} 
                    className="flex items-center gap-5 bg-[#111] border border-white/5 p-4 rounded-[1.5rem] hover:border-primary/40 hover:bg-white/[0.02] transition-all duration-300 group shadow-lg"
                  >
                    <div className="p-0.5 rounded-full border-2 border-transparent group-hover:border-primary/30 transition-colors">
                      <Avatar src={user.profile?.avatar} username={user.username} size="lg" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-lg text-white group-hover:text-primary transition-colors">{user.username}</span>
                        <CredibilityBadge score={user.credibilityScore || 50} size="sm" />
                      </div>
                      <p className="text-sm font-medium text-text-muted">{user.followers?.length || 0} Followers</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {hasMore && (
            <div className="flex justify-center pt-8">
              <button 
                onClick={loadMore}
                disabled={isSearching}
                className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-white text-sm font-bold tracking-widest uppercase hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 backdrop-blur-sm"
              >
                {isSearching ? 'Processing...' : 'Load More Data'}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
