// -----------------------------------------------------------------------------
// Debate Room – Realtime Immersive Experience
// -----------------------------------------------------------------------------
// Enterprise‑grade debate room with live chat, Pro/Against panels,
// animated timer, voting, speaker indicators, typing notifications,
// and premium glassmorphism design. Socket‑driven, fully reactive.
// -----------------------------------------------------------------------------

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
  useMemo,
} from 'react';
import { useParams } from 'react-router-dom';
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
  ClipboardIcon,
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

// Heroicons aliases (stabilize production: remove lucide-react dependency)
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
const MoreHorizontal = LinkIcon;
const Smile = ClipboardIcon;
const LinkIconAlias = LinkIcon;
const AlertTriangle = ExclamationTriangleIcon;
// Paperclip icon removed from imports for production compatibility
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
import { getSocket } from '../realtime/socket'; // adjust path
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

// -----------------------------------------------------------------------------
// Custom Hooks
// -----------------------------------------------------------------------------

const REACTION_TYPES = [
  { id: 'like', icon: '❤️', label: 'Like' },
  { id: 'dislike', icon: '👎', label: 'Dislike' },
  { id: 'agree', icon: '🤝', label: 'Agree' },
  { id: 'disagree', icon: '🙅', label: 'Disagree' },
  { id: 'facts', icon: '💯', label: 'Facts' },
  { id: 'cap', icon: '🧢', label: 'Cap' },
  { id: 'misleading', icon: '⚠️', label: 'Misleading' },
  { id: 'validPoint', icon: '🎯', label: 'Valid Point' },
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

/**
 * useDebateRoom – connects to socket, fetches room data, listens for events.
 * Returns rich state for the whole room.
 */
const useDebateRoom = (roomId) => {
  const { user } = useContext(AuthContext);
  const notify = useNotification();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Derived state updated via socket
  const [timerSec, setTimerSec] = useState(0);
  const [votes, setVotes] = useState({ pro: 0, against: 0, neutral: 0 });
  const [score, setScore] = useState({ pro: 0, against: 0 });
  const [speaker, setSpeaker] = useState({ pro: null, against: null });
  const [chatMessages, setChatMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const chatContainerRef = useRef(null);

  const socketRef = useRef(getSocket());
  const roomRef = useRef(roomId);
  const userRef = useRef(user);

  const updateLocalRoom = useCallback((updates) => {
    const localRooms = storageCache.getRooms();
    const idx = localRooms.findIndex(r => r._id === roomId);
    if (idx !== -1) {
      localRooms[idx] = { ...localRooms[idx], ...updates };
      storageCache.updateRoom(roomId, localRooms[idx]);
    }
  }, [roomId]);

  // Fetch initial room data
  const fetchRoom = useCallback(async () => {
    if (!roomId) {return;}
    setLoading(true);
    let fetchedRoom = null;
    try {
      const result = await axios.get(`/api/rooms/${roomId}`);
      fetchedRoom = result.room || result;
    } catch (err) {
      // Fallback to local storage 
    } finally {
      const localRooms = storageCache.getRooms();
      const localRoom = localRooms.find(r => r._id === roomId);
      const roomData = localRoom || fetchedRoom;

      if (roomData) {
        setRoom(roomData);
        setVotes(roomData.votes || { pro: 0, against: 0, neutral: 0 });
        setScore({
          pro: roomData.pro?.score || 0,
          against: roomData.against?.score || 0,
        });
        setSpeaker({
          pro: roomData.pro?.activeSpeaker || null,
          against: roomData.against?.activeSpeaker || null,
        });
      setChatMessages(roomData.messages || []);

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

  // Socket event listeners
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !roomId) {return;}

    socket.emit('room:join', { roomId });

    const onChat = (message) => {
      setChatMessages((prev) => [...prev, message]);
      // Remove typing indicator for that user
      setTypingUsers((prev) => prev.filter((u) => String(u._id) !== String(message.author?.id || message.sender?._id)));
    };

    const onTick = ({ remainingSec }) => {
      setTimerSec(remainingSec);
    };

    const onVotes = ({ votes: newVotes }) => {
      setVotes(newVotes);
    };

    const onScore = ({ pro, against }) => {
      setScore({ pro, against });
    };

    const onSpeaker = ({ side: speakerSide, speakerId }) => {
      setSpeaker((prev) => ({ ...prev, [speakerSide]: speakerId }));
    };

    const onStarted = () => {
      // Re‑fetch entire room to sync everything
      fetchRoom();
    };

    const onPresence = ({ proCount, againstCount, observerCount }) => {
      setRoom((r) =>
        r
          ? {
              ...r,
              pro: { ...r.pro, participants: new Array(proCount).fill(0) },
              against: {
                ...r.against,
                participants: new Array(againstCount).fill(0),
              },
              observers: new Array(observerCount).fill(0),
            }
          : r
      );
    };

    const onTyping = ({ userId, username } = {}) => {
      if (!userId) return;
      setTypingUsers((prev) => {
        if (prev.find((u) => String(u._id) === String(userId))) {return prev;}
        return [...prev, { _id: userId, username }];
      });
    };

    const onStopTyping = ({ userId } = {}) => {
      if (!userId) return;
      setTypingUsers((prev) => prev.filter((u) => String(u._id) !== String(userId)));
    };

    socket.on('message:new', onChat);
    socket.on('debate:tick', onTick);
    socket.on('debate:votes', onVotes);
    socket.on('debate:score', onScore);
    socket.on('debate:speaker', onSpeaker);
    socket.on('debate:started', onStarted);
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
      socket.off('debate:presence', onPresence);
      socket.off('typing:start', onTyping);
      socket.off('typing:stop', onStopTyping);
    };
  }, [roomId, fetchRoom]);

  // Local visual timer tick
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

  // Expose actions that mutate via socket
  const joinSide = useCallback(
    async (nextSide) => {
      if (!user) {return;}
      try {
        const socket = socketRef.current;
        if (socket) {socket.emit('debate:joinSide', { roomId, side: nextSide });}
        await axios.post(`/api/rooms/${roomId}/join`, { side: nextSide });
      } catch(e) { console.warn('joinSide failed', e); }
      
      if (room && String(room.createdBy?._id || room.createdBy?.id || room.createdBy) !== String(user._id || user.id)) {
        storageCache.addNotification({
          _id: `notif_join_${Date.now()}`,
          type: 'debate',
          actor: user || { username: 'User' },
          text: `joined your debate as ${nextSide}`,
          targetId: roomId,
          read: false,
          createdAt: new Date().toISOString()
        });
        window.dispatchEvent(new Event('local_notify'));
      }

      setRoom((prev) => {
        if (!prev) {return prev;}
        const updated = { ...prev };
        
        if (updated.pro?.participants) {updated.pro.participants = updated.pro.participants.filter(p => p._id !== user._id && p.username !== user.username);}
        if (updated.against?.participants) {updated.against.participants = updated.against.participants.filter(p => p._id !== user._id && p.username !== user.username);}
        if (updated.observers) {updated.observers = updated.observers.filter(p => p._id !== user._id && p.username !== user.username);}
        
        if (nextSide === 'pro') {
          if (!updated.pro) {updated.pro = { participants: [] };}
          if (!updated.pro.participants) {updated.pro.participants = [];}
          updated.pro.participants.push(user);
        } else if (nextSide === 'against') {
          if (!updated.against) {updated.against = { participants: [] };}
          if (!updated.against.participants) {updated.against.participants = [];}
          updated.against.participants.push(user);
        } else {
          if (!updated.observers) {updated.observers = [];}
          updated.observers.push(user);
        }
        
        updateLocalRoom(updated);
        return updated;
      });
      notify.success(`Joined ${nextSide}`);
    },
    [roomId, user, updateLocalRoom, notify, room]
  );

  const vote = useCallback(
    (voteSide) => {
      try { socketRef.current?.emit('reaction:send', { roomId, reaction: voteSide }); } catch(e) { console.warn('emit vote failed', e); }
      setVotes(prev => {
        const updated = { ...prev, [voteSide]: (prev[voteSide] || 0) + 1 };
        updateLocalRoom({ votes: updated });
        return updated;
      });
      notify.success('Vote cast!');
    },
    [roomId, updateLocalRoom, notify]
  );

  const startDebate = useCallback(
    (durationSec = 3600) => {
      try { socketRef.current?.emit('debate:start', { roomId, durationSec }); } catch(e) { console.warn('emit startDebate failed', e); }
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

  const adjustScore = useCallback(
    (team, delta) => {
      try { socketRef.current?.emit('debate:score', { roomId, side: team, delta }); } catch(e) { console.warn('emit adjustScore failed', e); }
      setScore(prev => {
        const updated = { ...prev, [team]: (prev[team] || 0) + delta };
        updateLocalRoom({ score: updated });
        return updated;
      });
    },
    [roomId, updateLocalRoom]
  );

  const sendChatMessage = useCallback(
    (text, isAnon) => {
      const newMsg = {
        _id: `msg_${Date.now()}`,
        text,
        author: user || { username: 'Guest' },
        isAnonymous: isAnon,
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
        const updated = [...prev, newMsg];
        updateLocalRoom({ messages: updated });
        return updated;
      });
      try {
        const socket = socketRef.current;
        if (socket) {socket.emit('message:send', {
          roomId,
          text,
        });}
      } catch(e) { console.warn('sendChatMessage emit failed', e); }
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

            // Remove user from all reaction lists (exclusive reactions)
            Object.values(arrayKeyMap).forEach(arrKey => {
                if (updatedMsg[arrKey]) {
                   updatedMsg[arrKey] = updatedMsg[arrKey].filter(id => id !== myId);
                }
            });
            
            if (oldReaction) {
               updateCredibility(authorId, oldReaction, false);
            }

            // Toggle logic
            if (!wasReacted && reactionType) {
                updatedMsg[arrayKeyMap[reactionType]].push(myId);
                updateCredibility(authorId, reactionType, true);
            }
            
            return updatedMsg;
        });
        updateLocalRoom({ chatMessages: newMessages });
        return newMessages;
    });
  }, [updateLocalRoom, userRef]);

  const emitTyping = useCallback(
    (isTyping) => {
      try {
        socketRef.current?.emit(isTyping ? 'typing:start' : 'typing:stop', {
          roomId,
        });
      } catch(e) { console.warn('emitTyping failed', e); }
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

// Animated Timer Ring with spring transition
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
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
          fill="none"
        />
        <motion.circle
          cx="32"
          cy="32"
          r="28"
          stroke="#22c55e"
          strokeWidth="4"
          fill="none"
          strokeDasharray={`${circumference * (percentage / 100)} ${circumference}`}
          strokeLinecap="round"
          initial={false}
          animate={{ strokeDasharray: `${circumference * (percentage / 100)} ${circumference}` }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="text-sm font-mono text-white"
          key={seconds} // re‑animate number change
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
      <button onClick={() => handleReact('like')} className={`p-1 rounded-full hover:bg-white/10 ${reaction === 'like' ? 'text-neon' : 'text-gray-400'}`}>
        <ThumbsUp className="w-3 h-3" />
      </button>
      <button onClick={() => handleReact('dislike')} className={`p-1 rounded-full hover:bg-white/10 ${reaction === 'dislike' ? 'text-red-400' : 'text-gray-400'}`}>
        <ThumbsDown className="w-3 h-3" />
      </button>
    </div>
  );
};

// Side panel (Pro / Against)
const SidePanel = React.memo(
  ({
    side,
    title,
    description,
    participantCount,
    isActiveSpeaker,
    score,
    onJoin,
    isJoined,
    isLoading,
  }) => {
    const isProSide = side === 'pro';

    // Avoid dynamic Tailwind class strings (production build safety)
    const colorClass = isProSide ? 'text-neon border-neon' : 'text-red-400 border-red-400';
    const bgClass = isProSide ? 'bg-neon/5' : 'bg-red-400/5';
    const Icon = isActiveSpeaker ? Mic : X;

    return (
      <motion.div
        variants={panelVariant}
        className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-colors duration-300 ${
          isActiveSpeaker
            ? `shadow-glow-lg ${bgClass} ${isProSide ? 'border-neon' : 'border-red-400'}`
            : isJoined
            ? ` ${isProSide ? 'border-neon/50 bg-neon/5' : 'border-red-400/50 bg-red-400/5'}`
            : 'border-white/10 bg-black/40 hover:border-white/20'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-neon/5 to-transparent pointer-events-none" />
        <div className="p-5 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${isActiveSpeaker ? 'animate-pulse' : 'text-gray-500'}`} />
              <h3 className={`text-lg font-bold ${colorClass}`}>{title}</h3>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Users className="w-3.5 h-3.5" />
              {participantCount}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-baseline gap-1">
              <Trophy className={`w-4 h-4 ${colorClass}`} />
              <span className="text-2xl font-bold text-white">{score}</span>
              <span className="text-xs text-gray-400">points</span>
            </div>
          </div>

          <p className="text-sm text-gray-300 mb-6 flex-1">{description}</p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onJoin(side)}
            disabled={isLoading}
            className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
              isJoined
                ? 'bg-neon/20 border border-neon text-neon'
                : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-neon/50'
            }`}
          >
            {isJoined ? 'Joined' : `Join ${title}`}
          </motion.button>
        </div>
      </motion.div>
    );
  }
);
SidePanel.displayName = 'SidePanel';

// Chat message with reactions placeholder
const ChatMessage = React.memo(({ message, isMine, onReact, anonymityMode }) => {
  const activeReactions = REACTION_TYPES.filter(rt => message[arrayKeyMap[rt.id]]?.length > 0);
  const isAnon = message.isAnonymous || anonymityMode === 'anonymous';
  const author = message.author || message.sender;

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
            ? 'bg-neon text-black'
            : 'bg-white/10 backdrop-blur-sm border border-white/10 text-white'
        }`}
      >
        {!isMine && (
          <div className="text-xs mb-1 font-mono flex items-center gap-1" style={{ color: isAnon ? '#a855f7' : 'rgba(34, 197, 94, 0.8)' }}>
            {isAnon ? <EyeSlash className="w-3 h-3" /> : null}
                @{isAnon ? 'anonymous' : (author?.username || 'user')}
          </div>
        )}
        <div className="text-sm break-words">{message.text}</div>
        <div
          className={`text-[9px] mt-1.5 flex flex-wrap items-center justify-between gap-2 ${
            isMine ? 'text-black/60' : 'text-gray-400'
          }`}
        >
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

// Typing indicator
const TypingIndicator = React.memo(({ typingUsers, anonymityMode }) => {
  if (!typingUsers.length) {return null;}
  
  let names = typingUsers.map((u) => u.username).join(', ');
  if (anonymityMode === 'anonymous') {
     names = `${typingUsers.length} debater${typingUsers.length > 1 ? 's' : ''}`;
  }

  return (
    <motion.div
      variants={typingIndicatorVariant}
      animate="animate"
      className="text-xs text-gray-400 pl-4 py-1 flex items-center gap-1"
    >
      <span className="inline-flex gap-0.5">
        <span className="w-1 h-1 bg-neon rounded-full animate-bounce" />
        <span className="w-1 h-1 bg-neon rounded-full animate-bounce delay-100" />
        <span className="w-1 h-1 bg-neon rounded-full animate-bounce delay-200" />
      </span>
      {names} typing...
    </motion.div>
  );
});
TypingIndicator.displayName = 'TypingIndicator';

// Chat input with typing emission
const ChatInput = React.memo(({ onSend, onTyping, anonymityMode }) => {
  const [text, setText] = useState('');
  const [postAnon, setPostAnon] = useState(anonymityMode === 'anonymous');
  const typingTimeout = useRef(null);

  useEffect(() => {
    if (anonymityMode === 'public') {setPostAnon(false);}
    if (anonymityMode === 'anonymous') {setPostAnon(true);}
  }, [anonymityMode]);

  const handleChange = (e) => {
    setText(e.target.value);
    if (onTyping) {
      onTyping(true);
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => onTyping(false), 1500);
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) {return;}
    onSend(trimmed, postAnon);
    setText('');
    if (onTyping) {onTyping(false);}
  };

  return (
    <div className="flex flex-col border-t border-white/10 bg-black/40">
      {anonymityMode === 'hybrid' && (
         <div className="flex items-center gap-3 px-4 pt-3 pb-1">
           <span className="text-xs text-gray-500">Identity:</span>
           <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer hover:text-white transition">
             <input type="radio" checked={!postAnon} onChange={() => setPostAnon(false)} className="text-neon focus:ring-neon/50 bg-black/60 border-white/20" />
             Public
           </label>
           <label className="flex items-center gap-1.5 text-xs text-purple-400 cursor-pointer hover:text-purple-300 transition">
             <input type="radio" checked={postAnon} onChange={() => setPostAnon(true)} className="text-purple-500 focus:ring-purple-500/50 bg-black/60 border-purple-500/30" />
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
        placeholder="Type your argument..."
        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-neon/50 text-sm"
      />
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSend}
        disabled={!text.trim()}
        className="px-4 py-2 rounded-xl bg-neon text-black font-bold flex items-center gap-1 disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
      </motion.button>
      </div>
    </div>
  );
});
ChatInput.displayName = 'ChatInput';

// Timeline Event Node
const TimelineEvent = React.memo(({ event, index }) => {
  let Icon = MessageCircle;
  let colorClass = 'text-gray-400';
  let borderClass = 'border-white/20';
  let bgClass = 'bg-white/5';

  switch(event.type) {
     case 'milestone':
       Icon = Flag; colorClass = 'text-blue-400'; borderClass = 'border-blue-400/30'; bgClass = 'bg-blue-400/10'; break;
     case 'heat_spike':
       Icon = Flame; colorClass = 'text-red-500'; borderClass = 'border-red-500/30'; bgClass = 'bg-red-500/10'; break;
     case 'key_argument':
       Icon = Star; colorClass = 'text-yellow-400'; borderClass = 'border-yellow-400/30'; bgClass = 'bg-yellow-400/10'; break;
     case 'fact_check':
       Icon = Shield; colorClass = 'text-green-400'; borderClass = 'border-green-400/30'; bgClass = 'bg-green-400/10'; break;
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

// AI Summary Panel
const AIDebateSummary = React.memo(({ summary, isAnalyzing, onGenerate }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5 px-2">
        <div className="flex items-center gap-2">
          <CpuChip className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg md:text-xl font-bold text-white">ForReal AI Analysis</h2>
        </div>
        <button
          onClick={onGenerate}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-wider hover:bg-purple-500/20 transition-all disabled:opacity-50"
        >
          {isAnalyzing ? <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> : <Zap className="w-3 h-3" />}
          {isAnalyzing ? 'Analyzing...' : summary ? 'Refresh Analysis' : 'Generate Insights'}
        </button>
      </div>

      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />

         {!summary && !isAnalyzing && (
           <div className="text-center py-8 text-gray-500 text-sm">
             <LightBulb className="w-10 h-10 mx-auto mb-3 opacity-20" />
             Extract intelligent insights, structural consensus, and the strongest arguments automatically.
           </div>
         )}

         {isAnalyzing && !summary && (
            <div className="flex flex-col items-center justify-center py-10">
               <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-400 rounded-full animate-spin mb-4" />
               <p className="text-purple-400 text-sm font-mono animate-pulse">Running semantic analysis on debate data...</p>
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
                    <h4 className="text-xs font-mono uppercase tracking-widest text-green-400 mb-2 flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Strongest Argument</h4>
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
                    <span className="text-sm font-bold text-neon bg-neon/10 px-2 py-0.5 rounded-md border border-neon/20">@{summary.topContributor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase tracking-widest font-mono">Consensus Level:</span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-md border ${summary.consensusLevel === 'High' ? 'text-green-400 border-green-400/30 bg-green-400/10' : summary.consensusLevel === 'Low' ? 'text-red-400 border-red-400/30 bg-red-400/10' : 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'}`}>{summary.consensusLevel}</span>
                  </div>
               </div>
            </motion.div>
         )}
      </div>
    </motion.div>
  );
});
AIDebateSummary.displayName = 'AIDebateSummary';

// Debate Verdict & Community Evaluation Panel
const DebateVerdictPanel = React.memo(({ verdictData, onCastVote, onGenerate, isHost, myId }) => {
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
           
           <div className="flex items-center justify-center gap-8 relative z-10">
              <div className="text-center">
                 <div className="text-3xl font-bold text-neon">{outcome.proPoints.toFixed(1)}</div>
                 <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Pro Points</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="text-center">
                 <div className="text-3xl font-bold text-red-400">{outcome.againstPoints.toFixed(1)}</div>
                 <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Against Points</div>
              </div>
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
          <Scale className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg md:text-xl font-bold text-white">Community Evaluation</h2>
        </div>
        {isHost && (
          <button
            onClick={onGenerate}
            className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider hover:bg-blue-500/20 transition-all shadow-glow-sm"
          >
            Conclude & Generate Verdict
          </button>
        )}
      </div>

      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
         <p className="text-sm text-gray-400 mb-6">Cast your credibility-weighted votes to determine the final verdict of this debate.</p>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evalCategories.map(cat => {
               const myProVote = votes[cat.id].pro.some(v => v.userId === myId);
               const myAgainstVote = votes[cat.id].against.some(v => v.userId === myId);
               return (
                 <div key={cat.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                    <h4 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
                       <cat.icon className="w-4 h-4 text-gray-400" /> {cat.label}
                    </h4>
                    <div className="flex gap-2">
                       <button 
                         onClick={() => onCastVote(cat.id, 'pro')}
                         className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${myProVote ? 'bg-neon text-black shadow-glow-sm' : 'bg-black/50 border border-white/10 text-gray-400 hover:border-neon/50 hover:text-neon'}`}
                       >
                         Pro
                       </button>
                       <button 
                         onClick={() => onCastVote(cat.id, 'against')}
                         className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${myAgainstVote ? 'bg-red-400 text-black shadow-glow-sm' : 'bg-black/50 border border-white/10 text-gray-400 hover:border-red-400/50 hover:text-red-400'}`}
                       >
                         Against
                       </button>
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
    sendChatMessage,
    emitTyping,
    reactToChatMessage,
    refetch,
    chatContainerRef,
  } = useDebateRoom(roomId);

  const [mySide, setMySide] = useState('observe'); // 'pro', 'against', 'observe'
  const [joining, setJoining] = useState(false);

  const isHost = useMemo(() => {
    if (!user || !room) {return false;}
    return (
      String(room.createdBy?._id || room.createdBy?.id || room.createdBy) === String(user._id || user.id) ||
      user.role === 'admin'
    );
  }, [user, room]);

  const proCount = room?.pro?.participants?.length || 0;
  const againstCount = room?.against?.participants?.length || 0;
  const obsCount = room?.observers?.length || 0;
  const isPro = mySide === 'pro';
  const isAgainst = mySide === 'against';
  const isObserver = mySide === 'observe';

  const energy = useDebateEnergy(room, chatMessages);
  const IntensityIcon = energy.icon;
  const { events: timelineEvents, addEvent } = useDebateTimeline(roomId, room, chatMessages, energy);
  const { summary, isAnalyzing, generateAnalysis } = useDebateSummary(roomId, chatMessages, timelineEvents, energy);
  const { verdictData, castEvaluationVote, generateVerdict } = useDebateVerdict(roomId, myId, myCredScore, room, summary);

  const handleJoin = async (nextSide) => {
    if (joining) {return;}
    setJoining(true);
    try {
      await joinSide(nextSide);
      setMySide(nextSide);
    } catch (err) {
      notify.error('Failed to join side');
    } finally {
      setJoining(false);
    }
  };

  // Broadcast timeline event when verdict is finalized
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <motion.div variants={skeletonPulse} animate="animate" className="h-[400px] bg-white/5 rounded-2xl" />
              <motion.div variants={skeletonPulse} animate="animate" className="h-[400px] bg-white/5 rounded-2xl" />
              <motion.div variants={skeletonPulse} animate="animate" className="h-[400px] bg-white/5 rounded-2xl" />
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
          <h2 className="text-xl font-bold text-white">Debate not available</h2>
          <p className="text-gray-400 text-sm mt-2">
            {error || 'This room may have ended or been removed.'}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-5 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-neon/5 via-transparent to-neon/5 rounded-2xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs font-mono text-neon uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-neon" />
                  {room.status === 'active' ? 'LIVE DEBATE' : room.status}
                </span>
                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all duration-500 ${energy.bg} ${energy.color}`}>
                   <IntensityIcon className={`w-3.5 h-3.5 ${energy.level === 'explosive' ? 'animate-pulse' : ''}`} />
                   {energy.label}
                </span>
                {room.anonymityMode === 'anonymous' && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider border-purple-400/30 bg-purple-400/10 text-purple-400">
                    <EyeSlash className="w-3 h-3" /> Fully Anonymous
                  </span>
                )}
                {room.anonymityMode === 'hybrid' && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider border-blue-400/30 bg-blue-400/10 text-blue-400">
                    <EyeSlash className="w-3 h-3" /> Hybrid Mode
                  </span>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-white">{room.topic}</h1>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {proCount} Pro</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {againstCount} Against</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {obsCount} Watching</span>
              </div>
            </div>
            <TimerRing seconds={timerSec} />
          </div>

          {/* Heat Meter */}
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
            {energy.momentum > 15 && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className={`text-[10px] font-bold uppercase mt-2 flex items-center gap-1 ${energy.color}`}>
                <Zap className="w-3.5 h-3.5" /> High Momentum Surge!
              </motion.div>
            )}
          </div>

          {/* Score & Controls */}
          <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-neon">{score.pro}</div>
              <div className="text-xs text-gray-400">Pro Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{score.against}</div>
              <div className="text-xs text-gray-400">Against Points</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            <button
              onClick={() => handleJoin('pro')}
              disabled={joining}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isPro ? 'bg-neon text-black' : 'bg-white/5 border border-white/10 hover:border-neon/50'}`}
            >
              {isPro ? 'Pro (joined)' : 'Join Pro'}
            </button>
            <button
              onClick={() => handleJoin('against')}
              disabled={joining}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isAgainst ? 'bg-red-400 text-black' : 'bg-white/5 border border-white/10 hover:border-neon/50'}`}
            >
              {isAgainst ? 'Against (joined)' : 'Join Against'}
            </button>
            <button
              onClick={() => handleJoin('observe')}
              disabled={joining}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isObserver ? 'bg-white/20 text-white' : 'bg-white/5 border border-white/10 hover:border-neon/50'}`}
            >
              Observe
            </button>
            {isHost && (
              <>
                <button onClick={() => startDebate()} className="px-4 py-2 rounded-xl bg-neon text-black font-bold text-sm flex items-center gap-1">
                  <Play className="w-3.5 h-3.5" /> Start
                </button>
                <button onClick={() => adjustScore('pro', 1)} className="px-3 py-2 rounded-xl bg-neon/10 border border-neon/30 text-neon text-sm">
                  +Pro
                </button>
                <button onClick={() => adjustScore('against', 1)} className="px-3 py-2 rounded-xl bg-red-400/10 border border-red-400/30 text-red-400 text-sm">
                  +Against
                </button>
              </>
            )}
            <div className="flex-1" />
            <button onClick={() => vote('pro')} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-neon/50 text-sm flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5 text-neon" /> Pro
            </button>
            <button onClick={() => vote('against')} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-neon/50 text-sm flex items-center gap-1">
              <ThumbsDown className="w-3.5 h-3.5 text-red-400" /> Against
            </button>
            <button onClick={() => vote('neutral')} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-neon/50 text-sm flex items-center gap-1">
              <Minus className="w-3.5 h-3.5" /> Neutral
            </button>
          </div>
        </motion.div>

        {/* Three columns: Pro panel, Chat, Against panel */}
        <motion.div
          variants={containerEnter}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-[1fr_400px_1fr] gap-5"
        >
          <SidePanel
            side="pro"
            title="Pro"
            description={room.pro?.description || "Make the strongest case for the motion."}
            participantCount={proCount}
            isActiveSpeaker={!!speaker.pro}
            score={score.pro}
            onJoin={handleJoin}
            isJoined={isPro}
            isLoading={joining}
          />

          {/* Chat Column */}
          <motion.div
            variants={panelVariant}
            className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden flex flex-col h-[520px]"
          >
            <div className="p-4 border-b border-white/10 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-neon" />
              <h3 className="text-white font-semibold">Live Chat</h3>
              <span className="text-xs text-gray-400 ml-auto">{chatMessages.length} messages</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10" ref={chatContainerRef}>
              <AnimatePresence>
                {chatMessages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    No messages yet. Fire the first argument!
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <ChatMessage
                      key={msg._id || idx}
                      message={msg}
                    isMine={String(msg.author?._id || msg.author?.id || msg.sender?._id || msg.author?.username || msg.author) === String(user?._id || user?.id || user?.username)}
                      onReact={reactToChatMessage}
                      anonymityMode={room?.anonymityMode}
                    />
                  ))
                )}
              </AnimatePresence>
              <TypingIndicator typingUsers={typingUsers} anonymityMode={room?.anonymityMode} />
            </div>

            <ChatInput onSend={sendChatMessage} onTyping={emitTyping} anonymityMode={room?.anonymityMode} />
          </motion.div>

          <SidePanel
            side="against"
            title="Against"
            description={room.against?.description || "Challenge assumptions and refute arguments."}
            participantCount={againstCount}
            isActiveSpeaker={!!speaker.against}
            score={score.against}
            onJoin={handleJoin}
            isJoined={isAgainst}
            isLoading={joining}
          />
        </motion.div>

        {/* Vote Summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center"
        >
          <span className="text-xs text-gray-400 uppercase tracking-widest">Audience Votes</span>
          <div className="flex justify-center gap-6 mt-2 text-sm">
            <span className="flex items-center gap-1 text-neon font-semibold">
              <ThumbsUp className="w-3.5 h-3.5" /> Pro: {votes.pro}
            </span>
            <span className="flex items-center gap-1 text-red-400 font-semibold">
              <ThumbsDown className="w-3.5 h-3.5" /> Against: {votes.against}
            </span>
            <span className="flex items-center gap-1 text-gray-400">
              <Minus className="w-3.5 h-3.5" /> Neutral: {votes.neutral}
            </span>
          </div>
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
        />

        {/* Debate Timeline Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-10 mb-10 max-w-4xl mx-auto">
           <div className="flex items-center gap-2 mb-5 px-2">
              <Clock className="w-5 h-5 text-neon" />
              <h2 className="text-lg md:text-xl font-bold text-white">Debate Timeline</h2>
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