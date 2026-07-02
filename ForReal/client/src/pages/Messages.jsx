import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

// Backward-compatible icon aliases (removes lucide-react dependency)
const ArrowLeft = ArrowLeftIcon;
const MessageCircle = ChatBubbleLeftRightIcon;
const RefreshCw = ArrowPathIcon;
const Send = PaperAirplaneIcon;
const UserPlus = UserPlusIcon;
const Search = MagnifyingGlassIcon;
import Layout from '../components/Layout';
import axios from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { getSocket } from '../realtime/socket';

const mergeMessages = (items) => Array.from(
  new Map((items || []).filter(Boolean).map((message) => [message._id || message.id, message])).values()
);

const profilePathFor = (user) => {
  const target = user?.username || user?._id || user?.id;
  return target ? `/profile/${encodeURIComponent(target)}` : null;
};

// Message bubble component
const MessageBubble = ({ message, isMine, senderUsername, time, onReact }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.2 }}
    className={`flex ${isMine ? 'justify-end' : 'justify-start'} group mb-4`}
  >
    <div 
      className={`relative max-w-[80%] sm:max-w-[70%] ${isMine ? 'order-1' : 'order-2'}`}
      onDoubleClick={() => onReact(message._id)}
    >
      <div
        className={`rounded-2xl px-4 py-2.5 shadow-lg cursor-pointer transition-transform active:scale-95 ${
          isMine
            ? 'bg-[#C1121F]/80 text-brand transition-colors duration-300'
            : 'bg-white/10 backdrop-blur-sm border border-white/10 text-brand'
        }`}
        title="Double click to like"
      >
        {!isMine && (
          <div className="text-xs text-brand/80 mb-1 font-mono">@{senderUsername}</div>
        )}
        <div className="text-sm leading-relaxed break-words">{message.text}</div>
        <div className={`text-[10px] mt-1 ${isMine ? 'text-brand/50' : 'text-gray-400'}`}>
          {time}
        </div>
      </div>
      {message.likes && message.likes.length > 0 && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`absolute -bottom-2 ${isMine ? 'right-2' : 'left-2'} bg-black border border-white/10 rounded-full p-1 shadow-md z-10`}
        >
          <HeartSolidIcon className="w-3.5 h-3.5 text-red-500" />
        </motion.div>
      )}
    </div>
  </motion.div>
);

// Conversation item component
const ConversationItem = ({ conversation, isActive, onClick, lastMessage, myId, unreadCount }) => {
  const otherParticipant = conversation.participants?.find(p => String(p._id || p.id || p) !== String(myId)) || conversation.otherUser || {};
  const title = otherParticipant.displayName || otherParticipant.username || 'Unknown User';
  const avatar = otherParticipant.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${title}&backgroundColor=050505&textColor=c1121f&fontWeight=700`;
  const isOnline = otherParticipant.status === 'online' || ['smarty', 'test'].includes(otherParticipant.username?.toLowerCase());
  const profilePath = profilePathFor(otherParticipant);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
        isActive
          ? 'bg-brand/10 border border-brand/30 shadow-glow-sm'
          : 'hover:bg-white/5 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          {profilePath ? (
            <Link to={profilePath} onClick={(e) => e.stopPropagation()} aria-label={`Open ${title}'s profile`}>
              <img src={avatar} alt={title} className="w-10 h-10 rounded-full border border-white/10 object-cover" />
            </Link>
          ) : (
            <img src={avatar} alt={title} className="w-10 h-10 rounded-full border border-white/10 object-cover" />
          )}
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-brand border-2 border-black rounded-full shadow-glow-sm" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            {profilePath ? (
              <Link to={profilePath} onClick={(e) => e.stopPropagation()} className="text-sm text-brand font-medium truncate hover:text-brand">
                {title}
              </Link>
            ) : (
              <p className="text-sm text-brand font-medium truncate">{title}</p>
            )}
            {unreadCount > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-brand text-brand transition-colors duration-300 text-[10px] font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <p className={`text-xs mt-0.5 truncate ${unreadCount > 0 ? 'text-brand font-semibold' : 'text-gray-400'}`}>
            {lastMessage?.text || 'New conversation...'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// Typing indicator
const TypingIndicator = React.memo(({ isTyping }) => {
  if (!isTyping) {return null;}
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex justify-start mb-4"
    >
      <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2 flex items-center gap-1.5 w-fit">
        <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" />
        <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce delay-100" />
        <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce delay-200" />
      </div>
    </motion.div>
  );
});

export default function Messages() {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const myId = user?._id || user?.id;

  const [conversations, setConversations] = useState([]);
  const initialRecipient = searchParams.get('user') || '';
  const [activeConversationId, setActiveConversationId] = useState(initialRecipient ? null : (localStorage.getItem('forreal_active_conv') || null));
  const [messages, setMessages] = useState([]);
  const [recipientId, setRecipientId] = useState(initialRecipient);
  const [text, setText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [loading, setLoading] = useState({ conversations: true, messages: false });
  const [error, setError] = useState({ conversations: null, messages: null });
  const [unreadMap, setUnreadMap] = useState({});
  const [typingConversationId, setTypingConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const socket = getSocket();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Compute Unread Counts globally
  const updateUnreadCounts = useCallback(() => {
    const localMsgs = JSON.parse(localStorage.getItem('forreal_messages') || '[]');
    const newUnreadMap = {};
    localMsgs.forEach(m => {
      if (!m.read && String(m.sender?._id || m.sender?.id || m.sender) !== String(myId)) {
        newUnreadMap[m.conversationId] = (newUnreadMap[m.conversationId] || 0) + 1;
      }
    });
    setUnreadMap(newUnreadMap);
  }, [myId]);

  useEffect(() => {
    updateUnreadCounts();
    window.addEventListener('local_notify', updateUnreadCounts);
    return () => window.removeEventListener('local_notify', updateUnreadCounts);
  }, [updateUnreadCounts]);

  useEffect(() => {
    const userParam = searchParams.get('user');
    if (userParam) {
      const existing = conversations.find(c => {
        const p = c.participants?.find(part => String(part._id || part.id || part) !== String(myId)) || c.otherUser;
        return p && (String(p._id || p.id || p.username) === String(userParam));
      });
      if (existing) {
        if (activeConversationId !== existing._id) {
          selectConversation(existing._id);
        }
        setRecipientId('');
      } else {
        setActiveConversationId(null);
        setRecipientId(userParam);
        localStorage.removeItem('forreal_active_conv');
      }
    }
  }, [searchParams.get('user'), conversations.length, myId]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    setLoading(prev => ({ ...prev, conversations: true }));
    setError(prev => ({ ...prev, conversations: null }));
    let fetched = [];
    try {
      const res = await axios.get('/chat/conversations');
      fetched = Array.isArray(res) ? res : (res?.conversations || []);
    } catch (err) {
      console.error(err);
    } finally {
      const local = JSON.parse(localStorage.getItem('forreal_conversations') || '[]');
      const merged = [...fetched, ...local];
      const unique = Array.from(new Map(merged.map(c => [c._id, c])).values());
      unique.sort((a, b) => new Date(b.lastMessage?.createdAt || b.createdAt || 0) - new Date(a.lastMessage?.createdAt || a.createdAt || 0));
      setConversations(unique);
      setLoading(prev => ({ ...prev, conversations: false }));
    }
  }, []);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId) => {
    setLoading(prev => ({ ...prev, messages: true }));
    setError(prev => ({ ...prev, messages: null }));
    let fetched = [];
    try {
      const res = await axios.get(`/chat/${conversationId}`);
      fetched = Array.isArray(res) ? res : (res?.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      const local = JSON.parse(localStorage.getItem('forreal_messages') || '[]');
      const localConvMsgs = local.filter(m => m.conversationId === conversationId);
      const unique = mergeMessages([...fetched, ...localConvMsgs]);
      unique.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setMessages(unique);
      setLoading(prev => ({ ...prev, messages: false }));
      setTimeout(scrollToBottom, 50);
    }
  }, [scrollToBottom]);

  // Select conversation
  const selectConversation = useCallback(async (conversationId) => {
    setActiveConversationId(conversationId);
    localStorage.setItem('forreal_active_conv', conversationId);
    socket?.emit('dm:joinConversation', { conversationId });
    await loadMessages(conversationId);

    // Mark local messages as read
    const localMsgs = JSON.parse(localStorage.getItem('forreal_messages') || '[]');
    let changed = false;
    const updated = localMsgs.map(m => {
      if (m.conversationId === conversationId && !m.read && String(m.sender?._id || m.sender?.id || m.sender) !== String(myId)) {
        changed = true;
        return { ...m, read: true };
      }
      return m;
    });
    if (changed) {
      localStorage.setItem('forreal_messages', JSON.stringify(updated));
      window.dispatchEvent(new Event('local_notify'));
    }
  }, [loadMessages, socket]);

  // Send message
  const sendMessage = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) {return;}

    const tempId = `temp-${Date.now()}`;
    let convId = activeConversationId;
    let isNewConv = false;
    const recipient = recipientId.trim();

    if (!convId) {
      if (!recipient) {
        setError(prev => ({ ...prev, messages: 'Enter recipient ID or select conversation' }));
        return;
      }
      convId = `conv_${Date.now()}`;
      isNewConv = true;
      
      const newConv = {
        _id: convId,
        participants: [user, { _id: recipient, username: recipient, displayName: recipient }],
        createdAt: new Date().toISOString()
      };
      
      const localConvs = JSON.parse(localStorage.getItem('forreal_conversations') || '[]');
      localConvs.push(newConv);
      localStorage.setItem('forreal_conversations', JSON.stringify(localConvs));
      setActiveConversationId(convId);
      setRecipientId('');
    }

    const optimisticMessage = {
      _id: tempId,
      conversationId: convId,
      text: trimmed,
      sender: { _id: myId, username: user?.username },
      createdAt: new Date().toISOString(),
      read: false,
      likes: []
    };
    setMessages(prev => mergeMessages([...prev, optimisticMessage]));
    setText('');
    setTimeout(scrollToBottom, 20);

    const localMsgs = JSON.parse(localStorage.getItem('forreal_messages') || '[]');
    localMsgs.push(optimisticMessage);
    localStorage.setItem('forreal_messages', JSON.stringify(localMsgs));

    const localConvs = JSON.parse(localStorage.getItem('forreal_conversations') || '[]');
    const convIndex = localConvs.findIndex(c => c._id === convId);
    if (convIndex !== -1) {
      localConvs[convIndex].lastMessage = optimisticMessage;
      localStorage.setItem('forreal_conversations', JSON.stringify(localConvs));
    }
    
    setConversations(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(c => c._id === convId);
      if (idx !== -1) {
        updated[idx].lastMessage = optimisticMessage;
      } else if (isNewConv) {
        updated.unshift({
          _id: convId,
          participants: [user, { _id: recipient, username: recipient, displayName: recipient }],
          lastMessage: optimisticMessage,
          createdAt: new Date().toISOString()
        });
      }
      updated.sort((a, b) => new Date(b.lastMessage?.createdAt || b.createdAt || 0) - new Date(a.lastMessage?.createdAt || a.createdAt || 0));
      return updated;
    });
    
    // Generate Notification for the recipient
    const notifs = JSON.parse(localStorage.getItem('forreal_notifications') || '[]');
    notifs.unshift({
      _id: `notif_msg_${Date.now()}`,
      type: 'mention', // Use mention to indicate direct message
      actor: user || { username: 'User' },
      text: 'sent you a message',
      targetId: convId,
      read: false,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('forreal_notifications', JSON.stringify(notifs));
    window.dispatchEvent(new Event('local_notify'));

    try {
      const requestPayload = { text: trimmed, media: [] };
      if (isNewConv) {requestPayload.recipientId = recipient;}
      else {requestPayload.conversationId = convId;}
      const savedMessage = await axios.post('/chat', requestPayload);
      const serverConvId = savedMessage?.conversationId || convId;

      setMessages(prev => mergeMessages(prev.map(m => (
        m._id === tempId ? { ...savedMessage, likes: savedMessage?.likes || [] } : (m.conversationId === convId ? { ...m, conversationId: serverConvId } : m)
      ))));

      const persistedMsgs = JSON.parse(localStorage.getItem('forreal_messages') || '[]')
        .map(m => (m._id === tempId ? { ...savedMessage, likes: savedMessage?.likes || [] } : (m.conversationId === convId ? { ...m, conversationId: serverConvId } : m)));
      localStorage.setItem('forreal_messages', JSON.stringify(mergeMessages(persistedMsgs)));

      const persistedConvs = JSON.parse(localStorage.getItem('forreal_conversations') || '[]')
        .map(c => (c._id === convId ? { ...c, _id: serverConvId, lastMessage: savedMessage } : c));
      localStorage.setItem('forreal_conversations', JSON.stringify(Array.from(new Map(persistedConvs.map(c => [c._id, c])).values())));

      if (serverConvId !== convId) {
        localStorage.setItem('forreal_active_conv', serverConvId);
        setActiveConversationId(serverConvId);
        socket?.emit('dm:joinConversation', { conversationId: serverConvId });
      }

      setConversations(prev => {
        const updated = prev.map(c => (
          c._id === convId
            ? { ...c, _id: serverConvId, lastMessage: savedMessage }
            : c
        ));
        return Array.from(new Map(updated.map(c => [c._id, c])).values())
          .sort((a, b) => new Date(b.lastMessage?.createdAt || b.createdAt || 0) - new Date(a.lastMessage?.createdAt || a.createdAt || 0));
      });
      loadConversations();
    } catch (err) {
      console.warn('API chat send failed, falling back to local');
    }
  }, [text, activeConversationId, recipientId, myId, user, loadConversations, scrollToBottom, socket]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    try {
      if (activeConversationId) {
        socket?.emit('dm:typing', { conversationId: activeConversationId });
      }
    } catch(err) { console.warn('emit typing failed', err); }
  };

  const handleReact = useCallback((msgId) => {
    setMessages(prev => prev.map(m => {
       if (m._id === msgId) {
          const isLiked = m.likes?.includes(myId);
          const newLikes = isLiked ? m.likes.filter(id => id !== myId) : [...(m.likes||[]), myId];
          
          const localMsgs = JSON.parse(localStorage.getItem('forreal_messages') || '[]');
          const idx = localMsgs.findIndex(lm => lm._id === msgId);
          if (idx !== -1) {
              localMsgs[idx].likes = newLikes;
              localStorage.setItem('forreal_messages', JSON.stringify(localMsgs));
          }
          return { ...m, likes: newLikes };
       }
       return m;
    }));
  }, [myId]);

  // Socket listener for new messages
  useEffect(() => {
    const handleNewMessage = (message) => {
      if (!activeConversationId) {return;}
      if (message.conversationId !== activeConversationId) {return;}
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) {return prev;}
        const isMine = String(message.sender?._id || message.sender) === String(myId);
        let matched = false;
        const updated = prev.map(m => {
          if (isMine && m.text === message.text && (String(m._id).startsWith('msg_') || String(m._id).startsWith('temp-'))) {
            matched = true;
            return { ...m, ...message };
          }
          return m;
        });
        if (matched) {return mergeMessages(updated);}
        return mergeMessages([...prev, message]);
      });
      setConversations(prev => prev.map(conv => (
        conv._id === message.conversationId ? { ...conv, lastMessage: message } : conv
      )));
      setTimeout(scrollToBottom, 20);
    };
    socket?.on('dm:new', handleNewMessage);

    const handleTyping = (data) => {
      if (data.conversationId === activeConversationId) {
        setTypingConversationId(data.conversationId);
        setTimeout(() => setTypingConversationId(null), 2500);
      }
    };
    socket?.on('dm:typing', handleTyping);

    return () => {
      socket?.off('dm:new', handleNewMessage);
      socket?.off('dm:typing', handleTyping);
    };
  }, [activeConversationId, socket, scrollToBottom]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Auto-refresh conversations when active conversation changes (for new conv creation)
  useEffect(() => {
    if (activeConversationId) {
      loadConversations();
    }
  }, [activeConversationId, loadConversations]);

  // Keep messages scrolled to bottom when they change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const activeConversation = conversations.find(c => c._id === activeConversationId);
  
  let headerTitle;
  if (activeConversation) {
    const otherParticipant = activeConversation.participants?.find(p => String(p._id || p.id || p) !== String(myId)) || activeConversation.otherUser || {};
    headerTitle = otherParticipant.displayName || otherParticipant.username || 'Direct Message';
  } else if (recipientId.trim()) {
    headerTitle = `New Message to ${recipientId}`;
  } else {
    headerTitle = 'Select or Start';
  }

  const formatTime = (date) => {
    if (!date) {return '';}
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) {return `${Math.floor(diff / 60000)}m ago`;}
    if (diff < 86400000) {return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });}
    return d.toLocaleDateString();
  };

  useEffect(() => {
    if (!searchQuery) { setSearchedUsers([]); return; }
    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await axios.get('/explore/search', { params: { q: searchQuery } });
        // Filter out me and existing conversations
        const newUsers = (res?.users || []).filter(u => 
          String(u._id || u.id) !== String(myId) && 
          !conversations.some(c => {
             const p = c.participants?.find(part => String(part._id || part) !== String(myId)) || c.otherUser || {};
             return String(p._id || p.id) === String(u._id || u.id);
          })
        );
        setSearchedUsers(newUsers);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingUsers(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, myId, conversations]);

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) {return true;}
    const otherParticipant = c.participants?.find(p => String(p._id || p) !== String(myId)) || c.otherUser || {};
    const name = (otherParticipant.displayName || otherParticipant.username || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 h-[calc(100vh-80px)]">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 h-full">
          {/* Conversations Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden flex-col h-full ${activeConversationId ? 'hidden lg:flex' : 'flex'}`}
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-brand font-bold text-lg">Messages</h2>
                  <p className="text-gray-400 text-xs">Real-time debates</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loadConversations}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
                >
                  <RefreshCw className="w-4 h-4 text-brand" />
                </motion.button>
              </div>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-brand placeholder:text-gray-500 text-sm focus:outline-none focus:border-brand/50 transition-colors"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading.conversations ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse p-4">
                    <div className="h-12 bg-white/5 rounded-xl" />
                  </div>
                ))
              ) : error.conversations ? (
                <div className="text-center py-8">
                  <p className="text-red-400 text-sm">{error.conversations}</p>
                  <button onClick={loadConversations} className="text-brand text-sm mt-2">Retry</button>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No conversations yet</p>
                  <p className="text-gray-500 text-xs mt-1">Start a new message above</p>
                </div>
              ) : (
                <>
                  {filteredConversations.map((conv) => (
                    <ConversationItem
                    key={conv._id}
                    conversation={conv}
                    isActive={activeConversationId === conv._id}
                    onClick={() => selectConversation(conv._id)}
                    lastMessage={conv.lastMessage}
                    myId={myId}
                    unreadCount={unreadMap[conv._id] || 0}
                  />
                  ))}
                  {searchedUsers.length > 0 && (
                    <div className="px-4 py-2 mt-2 border-t border-white/10">
                      <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Start New Conversation</p>
                      {searchedUsers.map(u => (
                         <div 
                           key={u._id} 
                           onClick={() => { setRecipientId(u._id || u.id || u.username); setActiveConversationId(null); localStorage.removeItem('forreal_active_conv'); setSearchQuery(''); }}
                           className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
                         >
                           <img src={u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${u.displayName || u.username || 'U'}&backgroundColor=050505&textColor=c1121f&fontWeight=700`} className="w-10 h-10 rounded-full object-cover" />
                           <div>
                             <p className="text-brand font-bold text-sm">{u.displayName || u.username}</p>
                             <p className="text-gray-500 text-xs">@{u.username}</p>
                           </div>
                         </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* Chat Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden flex-col h-full ${!activeConversationId ? 'hidden lg:flex' : 'flex'}`}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3 flex-wrap">
                {activeConversationId && (
                  <button
                    onClick={() => setActiveConversationId(null)}
                    className="lg:hidden p-2 rounded-lg bg-white/5"
                  >
                    <ArrowLeft className="w-5 h-5 text-brand" />
                  </button>
                )}
                <div>
                  <h3 className="text-brand font-semibold">{headerTitle}</h3>
                  {!activeConversationId && (
                    <p className="text-gray-400 text-xs mt-0.5">Enter user ID to start a debate</p>
                  )}
                </div>
              </div>
              {!activeConversationId && (
                <div className="mt-3">
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      placeholder="Recipient user ID (e.g., 65f1a2b3c4d5e6f7a8b9c0d1)"
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-brand placeholder:text-gray-500 text-sm focus:outline-none focus:border-brand/50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading.messages ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex justify-start">
                      <div className="w-3/4 h-16 bg-white/5 rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : error.messages ? (
                <div className="text-center py-8">
                  <p className="text-red-400 text-sm">{error.messages}</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No messages yet</p>
                  <p className="text-gray-500 text-sm mt-1">Type something below</p>
                </div>
              ) : (
                <AnimatePresence>
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg._id}
                      message={msg}
                      isMine={String(msg.sender?._id || msg.sender) === String(myId)}
                      senderUsername={msg.sender?.username || 'user'}
                      time={formatTime(msg.createdAt)}
                      onReact={handleReact}
                    />
                  ))}
                  {typingConversationId === activeConversationId && (
                     <TypingIndicator isTyping={true} />
                  )}
                  <div ref={messagesEndRef} />
                </AnimatePresence>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={text}
                  onChange={handleTextChange}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={activeConversationId ? "Type your message..." : "Enter message..."}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-brand placeholder:text-gray-500 focus:outline-none focus:border-brand/50 transition"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={sendMessage}
                  disabled={!text.trim() || (!activeConversationId && !recipientId.trim())}
                  className="px-5 py-3 rounded-xl bg-brand text-brand transition-colors duration-300 font-bold flex items-center gap-2 hover:bg-brand/90 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
