// -----------------------------------------------------------------------------
// Debate Room – Realtime Immersive Experience
// -----------------------------------------------------------------------------
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
  useMemo,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheckIcon,
  UserGroupIcon,
  EyeIcon,
  ClockIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  MinusIcon,
  PlayIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  SparklesIcon,
  XMarkIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  FireIcon,
  EyeSlashIcon,
  FlagIcon,
  StarIcon,
  CpuChipIcon,
  LightBulbIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';

const Shield = ShieldCheckIcon;
const Users = UserGroupIcon;
const Eye = EyeIcon;
const Mic = MicrophoneIcon;
const Send = PaperAirplaneIcon;
const ThumbsUp = HandThumbUpIcon;
const ThumbsDown = HandThumbDownIcon;
const Minus = MinusIcon;
const Flame = FireIcon;
const Play = PlayIcon;
const MessageCircle = ChatBubbleLeftRightIcon;
const Clock = ClockIcon;
const Trophy = TrophyIcon;
const Zap = SparklesIcon;
const X = XMarkIcon;
const LinkIconAlias = LinkIcon;
const AlertTriangle = ExclamationTriangleIcon;
const EyeSlash = EyeSlashIcon;
const Flag = FlagIcon;
const Star = StarIcon;
const CpuChip = CpuChipIcon;
const LightBulb = LightBulbIcon;
const Scale = ScaleIcon;

import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification';
import axios from '../api/axios';
import { getSocket } from '../realtime/socket';
import { useCredibility, updateCredibility } from '../hooks/useCredibility';
import { useDebateEnergy } from '../hooks/useDebateEnergy';
import { useDebateTimeline } from '../hooks/useDebateTimeline';
import { useDebateSummary } from '../hooks/useDebateSummary';
import { useDebateVerdict } from '../hooks/useDebateVerdict';
import { storageCache } from '../lib/storageCache';

// -----------------------------------------------------------------------------
// Animation Variants
// -----------------------------------------------------------------------------
const containerEnter = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const panelVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const messageVariant = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2 } },
};

const typingIndicatorVariant = {
  animate: { opacity: [0.4, 1, 0.4], transition: { repeat: Infinity, duration: 1.2 } },
};

const skeletonPulse = {
  animate: { opacity: [0.3, 0.6, 0.3], transition: { repeat: Infinity, duration: 1.8 } },
};

// -----------------------------------------------------------------------------
// Utility
// -----------------------------------------------------------------------------
const formatTime = (totalSec) => {
  const s = Math.max(0, Number(totalSec || 0));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
};

const getMessageKey = (message) => message?.clientId || message?._id || message?.id;
const mergeChatMessages = (messages) => {
  const map = new Map();
  (messages || []).filter(Boolean).forEach((msg, index) => {
    const key = getMessageKey(msg) || 'idx_' + index;
    const existing = map.get(key);
    if (existing && String(existing._id).startsWith('msg_') && !String(msg._id).startsWith('msg_')) {return;}
    map.set(key, { ...existing, ...msg, _id: msg._id || existing?._id || msg.id });
  });
  return Array.from(map.values());
};
const profilePathFor = (user) => {
  const target = user?.username || user?._id || user?.id;
  return target ? `/profile/${encodeURIComponent(target)}` : null;
};

// Dynamic Color Palette for Custom Options
const OPTION_COLORS = [
  { text: 'text-brand', border: 'border-brand', bg: 'bg-brand/5', hover: 'hover:border-brand/50', buttonBg: 'bg-brand', buttonText: 'text-white' },
  { text: 'text-brand', border: 'border-blue-400', bg: 'bg-blue-400/5', hover: 'hover:border-blue-400/50', buttonBg: 'bg-blue-400', buttonText: 'text-brand' },
  { text: 'text-ai', border: 'border-ai', bg: 'bg-ai/5', hover: 'hover:border-ai/50', buttonBg: 'bg-ai', buttonText: 'text-brand' },
  { text: 'text-orange-400', border: 'border-orange-400', bg: 'bg-orange-400/5', hover: 'hover:border-orange-400/50', buttonBg: 'bg-orange-400', buttonText: 'text-brand' },
  { text: 'text-pink-400', border: 'border-pink-400', bg: 'bg-pink-400/5', hover: 'hover:border-pink-400/50', buttonBg: 'bg-pink-400', buttonText: 'text-brand' },
  { text: 'text-yellow-400', border: 'border-yellow-400', bg: 'bg-yellow-400/5', hover: 'hover:border-yellow-400/50', buttonBg: 'bg-yellow-400', buttonText: 'text-brand' },
];

const getOptionColor = (index) => OPTION_COLORS[index % OPTION_COLORS.length];

// -----------------------------------------------------------------------------
// Custom Hooks
// -----------------------------------------------------------------------------

const REACTION_TYPES = [
  { id: 'like', icon: '[+]', label: 'Like' },
  { id: 'dislike', icon: '[-]', label: 'Dislike' },
  { id: 'agree', icon: '[AGREE]', label: 'Agree' },
  { id: 'disagree', icon: '[DISAGREE]', label: 'Disagree' },
  { id: 'facts', icon: '[FACTS]', label: 'Facts' },
  { id: 'cap', icon: '[CAP]', label: 'Cap' },
  { id: 'misleading', icon: '[!]', label: 'Misleading' },
  { id: 'validPoint', icon: '[*]', label: 'Valid Point' },
];

const arrayKeyMap = {
  like: 'likes',
  dislike: 'dislikes',
  agree: 'agrees',
  disagree: 'disagrees',
  facts: 'facts',
  cap: 'caps',
  misleading: 'misleadings',
  validPoint: 'validPoints'
};

const useDebateRoom = (roomId) => {
  const { user } = useContext(AuthContext);
  const notify = useNotification();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [timerSec, setTimerSec] = useState(0);
  const [votes, setVotes] = useState({});
  const [score, setScore] = useState({});
  const [speaker, setSpeaker] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const chatContainerRef = useRef(null);

  const socketRef = useRef(getSocket());
  const userRef = useRef(user);

  const updateLocalRoom = useCallback((updates) => {
    const localRooms = storageCache.getRooms();
    const idx = localRooms.findIndex(r => r._id === roomId);
    if (idx !== -1) {
      localRooms[idx] = { ...localRooms[idx], ...updates };
      storageCache.updateRoom(roomId, localRooms[idx]);
    }
  }, [roomId]);

  const fetchRoom = useCallback(async () => {
    if (!roomId) {return;}
    setLoading(true);
    let fetchedRoom = null;
    try {
      const result = await axios.get(`/rooms/${roomId}`);
      fetchedRoom = result.room || result;
    } catch (err) {
      // Fallback
    } finally {
      const localRooms = storageCache.getRooms();
      const localRoom = localRooms.find(r => r._id === roomId);
      const roomData = localRoom || fetchedRoom;

      if (roomData) {
        setRoom(roomData);
        
        // Initialize dynamic maps for custom options
        const vMap = {};
        const sMap = {};
        const spMap = {};
        roomData.customOptions?.forEach(opt => {
           vMap[opt.name] = opt.votes || 0;
           sMap[opt.name] = opt.score || 0;
           spMap[opt.name] = opt.activeSpeaker || null;
        });

        setVotes(vMap);
        setScore(sMap);
        setSpeaker(spMap);
        setChatMessages(mergeChatMessages(roomData.messages || []));

        if (roomData.status === 'active' && roomData.debateTimer?.startedAt) {
          const endsAt = new Date(
            new Date(roomData.debateTimer.startedAt).getTime() +
              (roomData.debateTimer.duration || 3600) * 1000
          );
          const remaining = Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 1000));
          setTimerSec(remaining);
        } else {
          setTimerSec(roomData.debateTimer?.duration || 3600);
        }
        setError(null);
      } else {
        setError('Room not found or unavailable.');
        notify.error('Failed to load debate room');
      }
      setLoading(false);
    }
  }, [roomId, notify]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !roomId) {return;}

    socket.emit('room:join', { roomId });

    const onChat = (message) => {
      setChatMessages((prev) => {
        const incomingClientId = message?.clientId;
        const isMyMessage = String(message.author?._id || message.author?.id || message.sender?._id || message.sender) === String(userRef.current?._id || userRef.current?.id);
        
        let foundMatch = false;
        const updated = prev.map((existing) => {
          if (incomingClientId && existing.clientId === incomingClientId) {
            foundMatch = true;
            return { ...existing, ...message, _id: message._id || message.id };
          }
          if (!incomingClientId && isMyMessage && existing.text === message.text && String(existing._id).startsWith('msg_')) {
            foundMatch = true;
            return { ...existing, ...message, _id: message._id || message.id };
          }
          return existing;
        });
        
        if (foundMatch) {return mergeChatMessages(updated);}
        return mergeChatMessages([...updated, { ...message, _id: message._id || message.id }]);
      });
      setTypingUsers((prev) => prev.filter((u) => String(u._id) !== String(message.author?.id || message.sender?._id)));
    };

    const onTick = ({ remainingSec }) => setTimerSec(remainingSec);
    const onVotes = ({ votes: newVotes }) => setVotes(newVotes);
    const onScore = ({ scores }) => setScore(scores);
    const onSpeaker = ({ optionName, speakerId }) => setSpeaker(prev => ({ ...prev, [optionName]: speakerId }));
    const onStarted = () => fetchRoom();
    const onEnded = ({ room: endedRoom } = {}) => {
      setRoom((prev) => ({ ...(prev || {}), ...(endedRoom || {}), status: 'ended' }));
      setTimerSec(0);
    };
    const onDeleted = () => {
      setRoom((prev) => prev ? { ...prev, status: 'deleted', isActive: false } : prev);
      setTimerSec(0);
      setError('This debate was deleted.');
    };

    const onPresence = ({ optionStats, observerCount }) => {
      setRoom((r) => {
        if (!r) {return r;}
        const newOpts = r.customOptions.map(opt => ({
           ...opt,
           participants: new Array(optionStats?.[opt.name] || 0).fill(0)
        }));
        return {
           ...r,
           customOptions: newOpts,
           observers: new Array(observerCount || 0).fill(0),
        };
      });
    };

    const onTyping = ({ userId, username } = {}) => {
      if (!userId) {return;}
      setTypingUsers((prev) => {
        if (prev.find((u) => String(u._id) === String(userId))) {return prev;}
        return [...prev, { _id: userId, username }];
      });
    };
    const onStopTyping = ({ userId } = {}) => {
      if (!userId) {return;}
      setTypingUsers((prev) => prev.filter((u) => String(u._id) !== String(userId)));
    };

    socket.on('message:new', onChat);
    socket.on('debate:tick', onTick);
    socket.on('debate:votes', onVotes);
    socket.on('debate:score', onScore);
    socket.on('debate:speaker', onSpeaker);
    socket.on('debate:started', onStarted);
    socket.on('debate:ended', onEnded);
    socket.on('room:deleted', onDeleted);
    socket.on('debate:presence', onPresence);
    socket.on('typing:start', onTyping);
    socket.on('typing:stop', onStopTyping);

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('message:new', onChat);
      socket.off('debate:tick', onTick);
      socket.off('debate:votes', onVotes);
      socket.off('debate:score', onScore);
      socket.off('debate:speaker', onSpeaker);
      socket.off('debate:started', onStarted);
      socket.off('debate:ended', onEnded);
      socket.off('room:deleted', onDeleted);
      socket.off('debate:presence', onPresence);
      socket.off('typing:start', onTyping);
      socket.off('typing:stop', onStopTyping);
    };
  }, [roomId, fetchRoom]);

  useEffect(() => {
    let interval;
    if (room?.status === 'active') {
      interval = setInterval(() => {
        setTimerSec((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [room?.status]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const joinSide = useCallback(async (optionName) => {
      if (!user) {return;}
      try {
        const socket = socketRef.current;
        if (socket) {socket.emit('debate:joinSide', { roomId, optionName });}
        await axios.post(`/rooms/${roomId}/join`, { optionName });
      } catch(e) { console.warn('joinSide failed', e); }
      
      if (room && String(room.createdBy?._id || room.createdBy?.id || room.createdBy) !== String(user._id || user.id)) {
        storageCache.addNotification({
          _id: `notif_join_${Date.now()}`,
          type: 'debate',
          actor: user || { username: 'User' },
          text: `joined your debate supporting ${optionName || 'observe'}`,
          targetId: roomId,
          read: false,
          createdAt: new Date().toISOString()
        });
        window.dispatchEvent(new Event('local_notify'));
      }

      setRoom((prev) => {
        if (!prev) {return prev;}
        const updated = { ...prev, customOptions: [...(prev.customOptions||[])] };
        
        // Remove from all
        updated.customOptions.forEach(opt => {
           if (opt.participants) {opt.participants = opt.participants.filter(p => p._id !== user._id && p.username !== user.username);}
        });
        if (updated.observers) {updated.observers = updated.observers.filter(p => p._id !== user._id && p.username !== user.username);}
        
        // Add to new
        if (optionName && optionName !== 'observe') {
           const target = updated.customOptions.find(o => o.name === optionName);
           if (target) {
              if (!target.participants) {target.participants = [];}
              target.participants.push(user);
           }
        } else {
           if (!updated.observers) {updated.observers = [];}
           updated.observers.push(user);
        }
        
        updateLocalRoom(updated);
        return updated;
      });
      notify.success(`Joined ${optionName}`);
    },
    [roomId, user, updateLocalRoom, notify, room]
  );

  const vote = useCallback((optionName) => {
      try { socketRef.current?.emit('reaction:send', { roomId, reaction: optionName }); } catch(e) { /* empty */ }
      setVotes(prev => {
        const updated = { ...prev, [optionName]: (prev[optionName] || 0) + 1 };
        updateLocalRoom({ votes: updated });
        return updated;
      });
      notify.success('Vote cast!');
    },
    [roomId, updateLocalRoom, notify]
  );

  const startDebate = useCallback((durationSec = 3600) => {
      try { socketRef.current?.emit('debate:start', { roomId, durationSec }); } catch(e) { /* empty */ }
      setRoom(prev => {
        const updated = { ...prev, status: 'active', debateTimer: { startedAt: new Date().toISOString(), duration: durationSec } };
        updateLocalRoom(updated);
        return updated;
      });
      setTimerSec(durationSec);
      notify.success('Debate started!');
    },
    [roomId, updateLocalRoom, notify]
  );

  const endDebate = useCallback(async () => {
    try {
      const result = await axios.patch(`/rooms/${roomId}/end`);
      const endedRoom = result?.room || result;
      setRoom((prev) => {
        const updated = { ...(prev || {}), ...(endedRoom || {}), status: 'ended', endTime: endedRoom?.endTime || new Date().toISOString() };
        updateLocalRoom(updated);
        return updated;
      });
      setTimerSec(0);
      notify.success('Debate ended');
    } catch (err) {
      notify.error(err?.message || 'Failed to end debate');
      throw err;
    }
  }, [roomId, updateLocalRoom, notify]);

  const deleteDebate = useCallback(async () => {
    try {
      await axios.delete(`/rooms/${roomId}`);
      storageCache.deleteRoom(roomId);
      notify.success('Debate deleted');
    } catch (err) {
      notify.error(err?.message || 'Failed to delete debate');
      throw err;
    }
  }, [roomId, notify]);

  const adjustScore = useCallback((optionName, delta) => {
      try { socketRef.current?.emit('debate:score', { roomId, optionName, delta }); } catch(e) { /* empty */ }
      setScore(prev => {
        const updated = { ...prev, [optionName]: (prev[optionName] || 0) + delta };
        updateLocalRoom({ score: updated });
        return updated;
      });
    },
    [roomId, updateLocalRoom]
  );

  const sendChatMessage = useCallback((text, isAnon, associatedOption = null) => {
      const clientId = `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const newMsg = {
        _id: clientId,
        clientId,
        text,
        author: user || { username: 'Guest' },
        isAnonymous: isAnon,
        associatedOption,
        createdAt: new Date().toISOString(),
        likes: [],
        dislikes: [],
        agrees: [],
        disagrees: [],
        facts: [],
        caps: [],
        misleadings: [],
        validPoints: [],
      };
      
      setChatMessages(prev => {
        const updated = mergeChatMessages([...prev, newMsg]);
        updateLocalRoom({ messages: updated });
        return updated;
      });
      try {
        const socket = socketRef.current;
        if (socket) {socket.emit('message:send', {
          roomId,
          text,
          clientId,
          isAnonymous: isAnon,
          associatedOption,
        });}
      } catch(e) { /* empty */ }
    },
    [roomId, user, updateLocalRoom]
  );

  const reactToChatMessage = useCallback((messageId, reactionType) => {
    const myId = userRef.current?._id || userRef.current?.id;
    if (!myId) {return;}

    setChatMessages(prev => {
        const newMessages = prev.map(msg => {
            if (msg._id !== messageId) {return msg;}

            const updatedMsg = { ...msg };
            Object.values(arrayKeyMap).forEach(arrKey => {
                updatedMsg[arrKey] = updatedMsg[arrKey] || [];
            });

            const wasReacted = updatedMsg[arrayKeyMap[reactionType]]?.includes(myId);
            const authorId = msg.sender?._id || msg.sender?.id || msg.sender?.username;
            
            let oldReaction = null;
            Object.keys(arrayKeyMap).forEach(key => {
                if (updatedMsg[arrayKeyMap[key]]?.includes(myId)) {oldReaction = key;}
            });

            Object.values(arrayKeyMap).forEach(arrKey => {
                if (updatedMsg[arrKey]) {
                   updatedMsg[arrKey] = updatedMsg[arrKey].filter(id => id !== myId);
                }
            });
            
            if (oldReaction) {
               updateCredibility(authorId, oldReaction, false);
            }

            if (!wasReacted && reactionType) {
                updatedMsg[arrayKeyMap[reactionType]].push(myId);
                updateCredibility(authorId, reactionType, true);
            }
            return updatedMsg;
        });
        updateLocalRoom({ messages: newMessages });
        return newMessages;
    });
  }, [updateLocalRoom, userRef]);

  const emitTyping = useCallback((isTyping) => {
      try {
        socketRef.current?.emit(isTyping ? 'typing:start' : 'typing:stop', { roomId });
      } catch(e) { /* empty */ }
    },
    [roomId]
  );

  return {
    room,
    loading,
    error,
    timerSec,
    votes,
    score,
    speaker,
    chatMessages,
    typingUsers,
    joinSide,
    vote,
    startDebate,
    adjustScore,
    endDebate,
    deleteDebate,
    sendChatMessage,
    emitTyping,
    reactToChatMessage,
    refetch: fetchRoom,
    chatContainerRef
  };
};

// -----------------------------------------------------------------------------
// Subcomponents
// -----------------------------------------------------------------------------

const TimerRing = React.memo(({ seconds }) => {
  const total = 3600;
  const percentage = Math.min(100, (seconds / total) * 100);
  const circumference = 2 * Math.PI * 28;

  return (
    <motion.div
      className="relative w-16 h-16"
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
        <motion.circle
          cx="32" cy="32" r="28" stroke="#C1121F" strokeWidth="4" fill="none"
          strokeDasharray={`${circumference * (percentage / 100)} ${circumference}`} strokeLinecap="round"
          initial={false}
          animate={{ strokeDasharray: `${circumference * (percentage / 100)} ${circumference}` }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="text-sm font-mono text-brand"
          key={seconds}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {formatTime(seconds).slice(0, 5)}
        </motion.span>
      </div>
    </motion.div>
  );
});
TimerRing.displayName = 'TimerRing';

const ChatMessageReactions = ({ message, onReact }) => {
  const { user } = useContext(AuthContext);
  const myId = user?._id || user?.id;

  const [reaction, setReaction] = useState(() => {
    if (message.likes?.includes(myId)) {return 'like';}
    if (message.dislikes?.includes(myId)) {return 'dislike';}
    return null;
  });

  const handleReact = (type) => {
    const newReaction = reaction === type ? null : type;
    setReaction(newReaction);
    onReact(message._id, type);
  };

  return (
    <div className="absolute -bottom-3 right-2 flex items-center gap-1 bg-black/50 border border-white/10 rounded-full px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button onClick={() => handleReact('like')} className={`p-1 rounded-full hover:bg-white/10 ${reaction === 'like' ? 'text-brand' : 'text-gray-400'}`}>
        <ThumbsUp className="w-3 h-3" />
      </button>
      <button onClick={() => handleReact('dislike')} className={`p-1 rounded-full hover:bg-white/10 ${reaction === 'dislike' ? 'text-red-400' : 'text-gray-400'}`}>
        <ThumbsDown className="w-3 h-3" />
      </button>
    </div>
  );
};

// Side Panel Card for Custom Options
const SidePanel = React.memo(({ option, colorConfig, isActiveSpeaker, score, onJoin, isJoined, isLoading }) => {
  const Icon = isActiveSpeaker ? Mic : Users;

  return (
    <motion.div
      variants={panelVariant}
      className={`relative min-w-[280px] max-w-[320px] shrink-0 overflow-hidden rounded-2xl border backdrop-blur-xl transition-colors duration-300 ${
        isActiveSpeaker
          ? `shadow-[0_0_15px_rgba(193,18,31,0.3)] ${colorConfig.bg} ${colorConfig.border}`
          : isJoined
          ? ` ${colorConfig.border} ${colorConfig.bg}`
          : `border-white/10 bg-black/40 ${colorConfig.hover}`
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none`} />
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 max-w-[70%]">
            <Icon className={`w-4 h-4 shrink-0 ${isActiveSpeaker ? `animate-pulse ${colorConfig.text}` : 'text-gray-500'}`} />
            <h3 className={`text-lg font-bold truncate ${colorConfig.text}`}>{option.name}</h3>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <Users className="w-3.5 h-3.5" />
            {option.participants?.length || 0}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-baseline gap-1">
            <Trophy className={`w-4 h-4 ${colorConfig.text}`} />
            <span className="text-2xl font-bold text-brand">{score || 0}</span>
            <span className="text-xs text-gray-400">points</span>
          </div>
        </div>

        <div className="flex-1" />

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onJoin(option.name)}
          disabled={isLoading}
          className={`w-full mt-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            isJoined
              ? `${colorConfig.bg} border ${colorConfig.border} ${colorConfig.text}`
              : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
          }`}
        >
          {isJoined ? 'Joined' : `Join ${option.name}`}
        </motion.button>
      </div>
    </motion.div>
  );
});
SidePanel.displayName = 'SidePanel';

const ChatMessage = React.memo(({ message, isMine, onReact, anonymityMode, colorMap }) => {
  const activeReactions = REACTION_TYPES.filter(rt => message[arrayKeyMap[rt.id]]?.length > 0);
  const isAnon = message.isAnonymous || anonymityMode === 'anonymous';
  const author = message.author || message.sender;
  const profilePath = !isAnon ? profilePathFor(author) : null;
  const optColor = message.associatedOption && colorMap[message.associatedOption] ? colorMap[message.associatedOption].text : 'text-brand';

  return (
  <motion.div
    variants={messageVariant}
    initial="hidden"
    animate="visible"
    layout
    className={`group relative flex ${isMine ? 'justify-end' : 'justify-start'}`}
  >
    <div className={`max-w-[85%] ${isMine ? 'order-1' : 'order-2'}`}>
      <div
        className={`rounded-2xl px-4 py-2.5 shadow-lg ${
          isMine
            ? 'bg-brand text-white'
            : 'bg-white/10 backdrop-blur-sm border border-white/10 text-brand'
        }`}
      >
        {!isMine && (
          <div className={`text-xs mb-1 font-mono flex items-center justify-between gap-2`} style={{ color: isAnon ? '#a855f7' : 'rgba(193, 18, 31, 0.8)' }}>
            <div className="flex items-center gap-1">
              {isAnon ? <EyeSlash className="w-3 h-3" /> : null}
              {profilePath ? (
                <Link to={profilePath} className="hover:underline">@{author?.username || 'user'}</Link>
              ) : (
                <>@{isAnon ? 'anonymous' : (author?.username || 'user')}</>
              )}
            </div>
            {message.associatedOption && (
               <span className={`text-[9px] px-1.5 py-0.5 rounded-full border bg-black/20 ${colorMap[message.associatedOption]?.border} ${optColor}`}>
                 {message.associatedOption}
               </span>
            )}
          </div>
        )}
        <div className="text-sm break-words">{message.text}</div>
        <div className={`text-[9px] mt-1.5 flex flex-wrap items-center justify-between gap-2 ${isMine ? 'text-brand/60' : 'text-gray-400'}`}>
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeReactions.map(rt => (
              <span key={rt.id} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${isMine ? 'bg-black/10' : 'bg-white/10'}`} title={rt.label}>
                <span className="text-[10px]">{rt.icon}</span> 
                <span className="font-medium">{message[arrayKeyMap[rt.id]].length}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      {!isMine && <ChatMessageReactions message={message} onReact={onReact} />}
    </div>
  </motion.div>
  );
});
ChatMessage.displayName = 'ChatMessage';

const TypingIndicator = React.memo(({ typingUsers, anonymityMode }) => {
  if (!typingUsers.length) {return null;}
  let names = typingUsers.map((u) => u.username).join(', ');
  if (anonymityMode === 'anonymous') {names = `${typingUsers.length} debater${typingUsers.length > 1 ? 's' : ''}`;}
  return (
    <motion.div variants={typingIndicatorVariant} animate="animate" className="text-xs text-gray-400 pl-4 py-1 flex items-center gap-1">
      <span className="inline-flex gap-0.5">
        <span className="w-1 h-1 bg-brand rounded-full animate-bounce" />
        <span className="w-1 h-1 bg-brand rounded-full animate-bounce delay-100" />
        <span className="w-1 h-1 bg-brand rounded-full animate-bounce delay-200" />
      </span>
      {names} typing...
    </motion.div>
  );
});
TypingIndicator.displayName = 'TypingIndicator';

const ChatInput = React.memo(({ onSend, onTyping, anonymityMode, disabled, mySide }) => {
  const [text, setText] = useState('');
  const [postAnon, setPostAnon] = useState(anonymityMode === 'anonymous');
  const typingTimeout = useRef(null);

  useEffect(() => {
    if (anonymityMode === 'public') {setPostAnon(false);}
    if (anonymityMode === 'anonymous') {setPostAnon(true);}
  }, [anonymityMode]);

  const handleChange = (e) => {
    if (disabled) {return;}
    setText(e.target.value);
    if (onTyping) {
      onTyping(true);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => onTyping(false), 1500);
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) {return;}
    onSend(trimmed, postAnon, mySide !== 'observe' ? mySide : null);
    setText('');
    if (onTyping) {onTyping(false);}
  };

  return (
    <div className="flex flex-col border-t border-white/10 bg-black/40">
      {anonymityMode === 'hybrid' && !disabled && (
         <div className="flex items-center gap-3 px-4 pt-3 pb-1">
           <span className="text-xs text-gray-500">Identity:</span>
           <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer hover:text-brand transition">
             <input type="radio" checked={!postAnon} onChange={() => setPostAnon(false)} className="text-brand focus:ring-brand/50 bg-black/60 border-white/20" />
             Public
           </label>
           <label className="flex items-center gap-1.5 text-xs text-ai cursor-pointer hover:text-ai transition">
             <input type="radio" checked={postAnon} onChange={() => setPostAnon(true)} className="text-ai focus:ring-ai/50 bg-black/60 border-ai/30" />
             Anonymous
           </label>
         </div>
      )}
      <div className="flex gap-2 p-4">
      <input
        type="text"
        value={text}
        onChange={handleChange}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        placeholder={disabled ? 'This debate is closed.' : 'Type your argument...'}
        disabled={disabled}
        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-brand placeholder-gray-500 focus:outline-none focus:border-brand/50 text-sm disabled:opacity-60"
      />
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="px-4 py-2 rounded-xl bg-brand text-white font-bold flex items-center gap-1 disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
      </motion.button>
      </div>
    </div>
  );
});
ChatInput.displayName = 'ChatInput';

const TimelineEvent = React.memo(({ event, index }) => {
  let Icon = MessageCircle;
  let colorClass = 'text-gray-400';
  let borderClass = 'border-white/20';
  let bgClass = 'bg-white/5';

  switch(event.type) {
     case 'milestone':
       Icon = Flag; colorClass = 'text-brand'; borderClass = 'border-blue-400/30'; bgClass = 'bg-blue-400/10'; break;
     case 'heat_spike':
       Icon = Flame; colorClass = 'text-red-500'; borderClass = 'border-red-500/30'; bgClass = 'bg-red-500/10'; break;
     case 'key_argument':
       Icon = Star; colorClass = 'text-yellow-400'; borderClass = 'border-yellow-400/30'; bgClass = 'bg-yellow-400/10'; break;
     case 'fact_check':
       Icon = Shield; colorClass = 'text-[#C1121F]'; borderClass = 'border-[#C1121F]/30'; bgClass = 'bg-[#C1121F]/10'; break;
     case 'dispute':
       Icon = AlertTriangle; colorClass = 'text-orange-400'; borderClass = 'border-orange-400/30'; bgClass = 'bg-orange-400/10'; break;
  }

  return (
     <motion.div 
       initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}
       className="relative mb-6 last:mb-0"
     >
        <div className={`absolute -left-[27px] p-1.5 rounded-full border bg-black shadow-glow-sm ${borderClass} ${colorClass}`}>
           <Icon className="w-3.5 h-3.5" />
        </div>
        <div className={`bg-black/40 backdrop-blur-md p-4 rounded-xl border ${borderClass} transition-colors hover:${bgClass}`}>
           <div className="flex justify-between items-start mb-1">
             <h4 className={`font-bold text-sm ${colorClass}`}>{event.title}</h4>
             <span className="text-[10px] text-gray-500 font-mono">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
           </div>
           <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">{event.description}</p>
           {event.actor && (
             <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1"><UserGroupIcon className="w-3 h-3" /> @{event.actor.username || 'user'}</div>
           )}
        </div>
     </motion.div>
  );
});
TimelineEvent.displayName = 'TimelineEvent';

const AIDebateSummary = React.memo(({ summary, isAnalyzing, onGenerate }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5 px-2">
        <div className="flex items-center gap-2">
          <CpuChip className="w-5 h-5 text-ai" />
          <h2 className="text-lg md:text-xl font-bold text-brand">ForReal AI Analysis</h2>
        </div>
        <button
          onClick={onGenerate}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ai/10 border border-ai/30 text-ai text-xs font-bold uppercase tracking-wider hover:bg-ai/20 transition-all disabled:opacity-50"
        >
          {isAnalyzing ? <div className="w-3 h-3 border-2 border-ai border-t-transparent rounded-full animate-spin" /> : <Zap className="w-3 h-3" />}
          {isAnalyzing ? 'Analyzing...' : summary ? 'Refresh Analysis' : 'Generate Insights'}
        </button>
      </div>

      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-ai/5 to-transparent pointer-events-none" />

         {!summary && !isAnalyzing && (
           <div className="text-center py-8 text-gray-500 text-sm">
             <LightBulb className="w-10 h-10 mx-auto mb-3 opacity-20" />
             Extract intelligent insights, structural consensus, and the strongest arguments automatically.
           </div>
         )}

         {isAnalyzing && !summary && (
            <div className="space-y-4 py-4 animate-pulse">
               <div className="h-4 w-1/3 bg-ai/20 rounded"></div>
               <div className="h-20 bg-ai/10 rounded-xl"></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-16 bg-ai/10 rounded-xl"></div>
                  <div className="h-16 bg-ai/10 rounded-xl"></div>
               </div>
               <p className="text-ai/50 text-xs font-mono text-center pt-2">Running semantic analysis on debate data...</p>
            </div>
         )}

         {summary && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative space-y-6">
               <div>
                 <h4 className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-2">Debate Overview</h4>
                 <p className="text-gray-200 text-sm leading-relaxed">{summary.overview}</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-[#C1121F] mb-2 flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Strongest Argument</h4>
                    <p className="text-gray-300 text-sm italic">"{summary.strongestArgument}"</p>
                 </div>
                 <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-orange-400 mb-2 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" /> Most Disputed Claim</h4>
                    <p className="text-gray-300 text-sm italic">"{summary.mostDisputed}"</p>
                 </div>
               </div>
               <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase tracking-widest font-mono">Top Contributor:</span>
                    <span className="text-sm font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md border border-brand/20">@{summary.topContributor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase tracking-widest font-mono">Consensus Level:</span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-md border ${summary.consensusLevel === 'High' ? 'text-[#C1121F] border-[#C1121F]/30 bg-[#C1121F]/10' : summary.consensusLevel === 'Low' ? 'text-red-400 border-red-400/30 bg-red-400/10' : 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'}`}>{summary.consensusLevel}</span>
                  </div>
               </div>
            </motion.div>
         )}
      </div>
    </motion.div>
  );
});
AIDebateSummary.displayName = 'AIDebateSummary';

const DebateVerdictPanel = React.memo(({ verdictData, onCastVote, onGenerate, isHost, myId, customOptions, colorMap }) => {
  const { status, outcome, votes } = verdictData;

  const evalCategories = [
    { id: 'logical', label: 'Most Logical Argument', icon: LightBulb },
    { id: 'factual', label: 'Most Factual Evidence', icon: Shield },
    { id: 'evidence', label: 'Best Quality Sources', icon: LinkIconAlias },
    { id: 'constructive', label: 'Most Constructive', icon: Users },
  ];

  if (status === 'resolved') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-10 max-w-4xl mx-auto">
        <div className={`relative overflow-hidden rounded-3xl border p-8 text-center backdrop-blur-2xl shadow-2xl ${outcome.bg}`}>
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
           <Scale className={`w-16 h-16 mx-auto mb-4 ${outcome.color}`} />
           <h4 className="text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Final Debate Verdict</h4>
           <h2 className={`text-2xl md:text-4xl font-black mb-6 ${outcome.color}`}>{outcome.title}</h2>
           
           <div className="flex items-center justify-center gap-8 relative z-10 flex-wrap">
              {Object.entries(outcome.points || {}).map(([optName, pts]) => {
                  const conf = colorMap[optName] || OPTION_COLORS[0];
                  return (
                    <div key={optName} className="text-center px-4 py-2 bg-black/40 rounded-xl border border-white/10">
                       <div className={`text-2xl font-bold ${conf.text}`}>{pts.toFixed(1)}</div>
                       <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 max-w-[100px] truncate">{optName} Points</div>
                    </div>
                  );
              })}
           </div>
           <p className="mt-6 text-xs text-gray-500 font-mono">Verdict determined via credibility-weighted community evaluation.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5 px-2">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-brand" />
          <h2 className="text-lg md:text-xl font-bold text-brand">Community Evaluation</h2>
        </div>
        {isHost && (
          <button
            onClick={onGenerate}
            className="px-4 py-2 rounded-xl bg-white/5 border border-blue-500/30 text-brand text-xs font-bold uppercase tracking-wider hover:bg-blue-500/20 transition-all shadow-glow-sm"
          >
            Conclude & Generate Verdict
          </button>
        )}
      </div>

      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
         <p className="text-sm text-gray-400 mb-6">Cast your credibility-weighted votes to determine the final verdict of this debate.</p>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evalCategories.map(cat => {
               return (
                 <div key={cat.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                    <h4 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                       <cat.icon className="w-4 h-4 text-gray-400" /> {cat.label}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                       {customOptions.map(opt => {
                          const myVote = votes[cat.id]?.[opt.name]?.some(v => v.userId === myId);
                          const conf = colorMap[opt.name] || OPTION_COLORS[0];
                          return (
                            <button 
                              key={opt.name}
                              onClick={() => onCastVote(cat.id, opt.name)}
                              className={`flex-1 min-w-[80px] py-1.5 px-2 rounded-lg text-xs font-bold transition-all truncate ${myVote ? `${conf.bg} border ${conf.border} ${conf.text} shadow-glow-sm` : `bg-black/50 border border-white/10 text-gray-400 hover:border-white/30`}`}
                            >
                              {opt.name}
                            </button>
                          );
                       })}
                    </div>
                 </div>
               );
            })}
         </div>
      </div>
    </motion.div>
  );
});
DebateVerdictPanel.displayName = 'DebateVerdictPanel';

// -----------------------------------------------------------------------------
// Main Room Component
// -----------------------------------------------------------------------------
export default function Room() {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const myId = user?._id || user?.id;
  const { score: myCredScore } = useCredibility(myId);
  const notify = useNotification();

  const {
    room,
    loading,
    error,
    timerSec,
    votes,
    score,
    speaker,
    chatMessages,
    typingUsers,
    joinSide,
    vote,
    startDebate,
    adjustScore,
    endDebate,
    deleteDebate,
    sendChatMessage,
    emitTyping,
    reactToChatMessage,
    chatContainerRef,
  } = useDebateRoom(roomId);

  const [mySide, setMySide] = useState('observe');
  const [joining, setJoining] = useState(false);

  const isHost = useMemo(() => {
    if (!user || !room) {return false;}
    const ownerId = room.creator?._id || room.creator?.id || room.creator || room.createdBy?._id || room.createdBy?.id || room.createdBy;
    return String(ownerId) === String(myId) || user.role === 'admin';
  }, [user, room, myId]);

  const customOptions = room?.customOptions || [];
  const colorMap = useMemo(() => {
     const map = {};
     customOptions.forEach((opt, idx) => { map[opt.name] = getOptionColor(idx); });
     return map;
  }, [customOptions]);

  const obsCount = room?.observers?.length || 0;
  const isObserver = mySide === 'observe';
  const isClosed = room?.status === 'ended' || room?.status === 'deleted';

  const energy = useDebateEnergy(room, chatMessages);
  const IntensityIcon = energy.icon;
  const { events: timelineEvents, addEvent } = useDebateTimeline(roomId, room, chatMessages, energy);
  const { summary, isAnalyzing, generateAnalysis } = useDebateSummary(roomId, chatMessages, timelineEvents, energy);
  const { verdictData, castEvaluationVote, generateVerdict } = useDebateVerdict(roomId, myId, myCredScore, room, summary);

  const handleJoin = async (optionName) => {
    if (isClosed || joining) {return;}
    setJoining(true);
    try {
      await joinSide(optionName);
      setMySide(optionName);
    } catch (err) {
      notify.error('Failed to join');
    } finally {
      setJoining(false);
    }
  };

  const handleEndDebate = async () => {
    if (!window.confirm('End this debate now? The room stays readable, but chat closes.')) {return;}
    await endDebate();
  };

  const handleDeleteDebate = async () => {
    if (!window.confirm('Delete this debate? It will be removed from discovery.')) {return;}
    await deleteDebate();
    navigate('/rooms');
  };

  useEffect(() => {
    if (verdictData.status === 'resolved' && verdictData.outcome) {
      addEvent('milestone', 'Debate Concluded', `Verdict: ${verdictData.outcome.title}. The community has officially evaluated the arguments.`, 'verdict_finalized');
    }
  }, [verdictData.status, verdictData.outcome, addEvent]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <motion.div className="space-y-4" variants={containerEnter} initial="hidden" animate="visible">
            <motion.div variants={skeletonPulse} animate="animate" className="h-24 bg-white/5 rounded-2xl" />
            <div className="flex gap-4 overflow-x-hidden">
              <motion.div variants={skeletonPulse} animate="animate" className="h-[400px] w-64 bg-white/5 rounded-2xl shrink-0" />
              <motion.div variants={skeletonPulse} animate="animate" className="h-[400px] flex-1 bg-white/5 rounded-2xl" />
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (error || !room) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col items-center justify-center min-h-[50vh] text-center">
          <Shield className="w-12 h-12 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-brand">Debate not available</h2>
          <p className="text-gray-400 text-sm mt-2">{error || 'This room may have ended or been removed.'}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-5 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-neon/5 via-transparent to-neon/5 rounded-2xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs font-mono text-brand uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-brand" />
                  {room.status === 'active' ? 'LIVE DEBATE' : room.status}
                </span>
                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all duration-500 ${energy.bg} ${energy.color}`}>
                   <IntensityIcon className={`w-3.5 h-3.5 ${energy.level === 'explosive' ? 'animate-pulse' : ''}`} />
                   {energy.label}
                </span>
                {room.anonymityMode === 'anonymous' && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider border-ai/30 bg-ai/10 text-ai">
                    <EyeSlash className="w-3 h-3" /> Fully Anonymous
                  </span>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-brand">{room.topic}</h1>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                {customOptions.map((opt, idx) => (
                  <span key={opt.name} className={`flex items-center gap-1 ${getOptionColor(idx).text}`}>
                    <Users className="w-3 h-3" /> {opt.participants?.length || 0} {opt.name}
                  </span>
                ))}
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {obsCount} Watching</span>
              </div>
            </div>
            <TimerRing seconds={timerSec} />
          </div>

          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="flex justify-between items-center mb-1 text-[10px] font-mono uppercase tracking-wider">
              <span className="text-gray-400">Debate Energy</span>
              <span className={energy.color}>{energy.score} pts</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (energy.score / 200) * 100)}%` }}
                className={`h-full transition-all duration-500 ${energy.level === 'explosive' ? 'bg-red-500 shadow-glow-sm' : energy.level === 'heated' ? 'bg-orange-400' : energy.level === 'active' ? 'bg-yellow-400' : 'bg-blue-400'}`}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            {customOptions.map(opt => {
               const isThisSide = mySide === opt.name;
               const conf = colorMap[opt.name] || OPTION_COLORS[0];
               return (
                 <button
                   key={opt.name}
                   onClick={() => handleJoin(opt.name)}
                   disabled={joining || isClosed}
                   className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isThisSide ? `${conf.buttonBg} ${conf.buttonText}` : 'bg-white/5 border border-white/10 hover:border-white/30 text-gray-300'}`}
                 >
                   {isThisSide ? `${opt.name} (joined)` : `Join ${opt.name}`}
                 </button>
               )
            })}
            <button
              onClick={() => handleJoin('observe')}
              disabled={joining || isClosed}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isObserver ? 'bg-white/20 text-brand' : 'bg-white/5 border border-white/10 hover:border-white/30'}`}
            >
              Observe
            </button>
            {isHost && (
              <>
                <button disabled={isClosed} onClick={() => startDebate()} className="px-4 py-2 rounded-xl bg-brand text-white font-bold text-sm flex items-center gap-1 disabled:opacity-50">
                  <Play className="w-3.5 h-3.5" /> Start
                </button>
                <button disabled={isClosed} onClick={handleEndDebate} className="px-3 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-sm disabled:opacity-50">
                  End
                </button>
                <button onClick={handleDeleteDebate} className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  Delete
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Dynamic Multi-Option Layout */}
        <motion.div
          variants={containerEnter}
          initial="hidden"
          animate="visible"
          className="flex flex-col lg:flex-row gap-5"
        >
          {/* Options List (Left Side) */}
          <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto lg:max-h-[520px] scrollbar-thin scrollbar-thumb-white/10 pb-2 lg:pb-0 shrink-0">
             {customOptions.map((opt) => (
                <SidePanel
                  key={opt.name}
                  option={opt}
                  colorConfig={colorMap[opt.name]}
                  isActiveSpeaker={speaker[opt.name] !== null && speaker[opt.name] !== undefined}
                  score={score[opt.name] || 0}
                  onJoin={handleJoin}
                  isJoined={mySide === opt.name}
                  isLoading={joining}
                />
             ))}
          </div>

          {/* Chat Column (Right Side / Expand) */}
          <motion.div
            variants={panelVariant}
            className="flex-1 min-w-[300px] bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden flex flex-col h-[520px]"
          >
            <div className="p-4 border-b border-white/10 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-brand" />
              <h3 className="text-brand font-semibold">Live Debate Chat</h3>
              <span className="text-xs text-gray-400 ml-auto">{chatMessages.length} messages</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10" ref={chatContainerRef}>
              <AnimatePresence>
                {chatMessages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    {isClosed ? 'This debate is closed.' : 'No messages yet. Fire the first argument!'}
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <ChatMessage
                      key={getMessageKey(msg) || idx}
                      message={msg}
                      isMine={String(msg.author?._id || msg.author?.id || msg.sender?._id || msg.author?.username) === String(user?._id || user?.id || user?.username)}
                      onReact={reactToChatMessage}
                      anonymityMode={room?.anonymityMode}
                      colorMap={colorMap}
                    />
                  ))
                )}
              </AnimatePresence>
              {!isClosed && <TypingIndicator typingUsers={typingUsers} anonymityMode={room?.anonymityMode} />}
            </div>

            <ChatInput onSend={sendChatMessage} onTyping={emitTyping} anonymityMode={room?.anonymityMode} disabled={isClosed} mySide={mySide} />
          </motion.div>
        </motion.div>

        {/* AI Insight Engine */}
        <AIDebateSummary summary={summary} isAnalyzing={isAnalyzing} onGenerate={generateAnalysis} />

        {/* Debate Verdict & Community Evaluation */}
        <DebateVerdictPanel 
          verdictData={verdictData} 
          onCastVote={castEvaluationVote} 
          onGenerate={generateVerdict} 
          isHost={isHost} 
          myId={myId} 
          customOptions={customOptions}
          colorMap={colorMap}
        />

        {/* Debate Timeline Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-10 mb-10 max-w-4xl mx-auto">
           <div className="flex items-center gap-2 mb-5 px-2">
              <Clock className="w-5 h-5 text-brand" />
              <h2 className="text-lg md:text-xl font-bold text-brand">Debate Timeline</h2>
           </div>
           <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              {timelineEvents.length === 0 ? (
                 <p className="text-gray-500 text-sm text-center py-4">No major events recorded yet. The timeline will evolve as the debate intensifies.</p>
              ) : (
                 <div className="relative border-l border-white/10 ml-3.5 pl-6 pt-2">
                    {[...timelineEvents].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).map((ev, i) => (
                      <TimelineEvent key={ev.id} event={ev} index={i} />
                    ))}
                 </div>
              )}
           </div>
        </motion.div>
      </div>
    </Layout>
  );
}
