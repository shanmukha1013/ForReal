import React, { useState, useEffect, useRef } from 'react';
import { usePageTitle } from '@/hooks';
import { MessageCircle, Send, User } from 'lucide-react';
import { AnimatedButton, CredibilityBadge, Avatar } from '@/components/ui';
import apiClient from '@/services/api';
import { socketService } from '@/services/socket';
import useAuthStore from '@/store/useAuthStore';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

export const Messages = () => {
  usePageTitle('Messages | ForReal');
  
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetUserId = searchParams.get('user');

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await apiClient.get('/messages/conversations');
        setConversations(res.data || []);
      } catch (err) {
        toast.error('Failed to load conversations');
      }
    };
    fetchConversations();
  }, []);

  // Handle starting a new conversation from query param
  useEffect(() => {
    const startConversation = async () => {
      if (targetUserId) {
        try {
          const res = await apiClient.post('/messages/conversations', { userId: targetUserId });
          const newConv = res.data;
          
          setConversations(prev => {
            const exists = prev.find(c => c._id === newConv._id);
            if (!exists) return [newConv, ...prev];
            return prev;
          });
          setActiveConv(newConv);
          
          // Clear query param so we don't trigger this again on re-renders
          searchParams.delete('user');
          setSearchParams(searchParams);
        } catch (err) {
          toast.error('Failed to start conversation');
        }
      }
    };
    startConversation();
  }, [targetUserId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!activeConv) return;
    
    const fetchMessages = async () => {
      try {
        const res = await apiClient.get(`/messages/${activeConv._id}`);
        setMessages(res.data.messages || []);
      } catch (err) {
        toast.error('Failed to load messages');
      }
    };
    
    fetchMessages();

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('join_conversation', activeConv._id);
      
      socket.on('new_message', (msg) => {
        if (msg.conversation === activeConv._id) {
          setMessages(prev => [...prev, msg]);
        }
      });
      
      return () => {
        socket.emit('leave_conversation', activeConv._id);
        socket.off('new_message');
      };
    }
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const recipientId = activeConv.participants.find(p => p._id !== user._id)?._id;
      if (!recipientId) throw new Error('Recipient not found');

      const res = await apiClient.post('/messages', {
        recipientId,
        content: newMessage
      });
      
      // We don't push the message directly because the socket event 'new_message' will fire
      // But if we want instant optimistic UI, we could push it here and deduplicate
      // Let's just wait for socket for simplicity, or push it since the server might echo it back to us too.
      // Wait, server emits to `conv_${conversation._id}`, which includes the sender.
      // It's safer to clear the input and let the socket append it.
      setNewMessage('');
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-80px)] flex flex-col pb-4">
      <div className="flex justify-between items-center mb-6 shrink-0 px-2">
        <h1 className="text-3xl font-black text-white tracking-tight">Messages</h1>
      </div>

      <div className="flex-1 bg-card-dark rounded-xl border border-border-subtle flex overflow-hidden shadow-subtle min-h-0">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-border-subtle flex flex-col bg-surface overflow-hidden">
          <div className="p-4 border-b border-border-subtle font-bold text-white text-sm bg-bg-dark shrink-0">
            Conversations
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {conversations.length === 0 ? (
              <div className="flex items-center justify-center h-full text-text-muted text-sm p-4 text-center">
                No active conversations yet.
              </div>
            ) : (
              conversations.map(conv => {
                const otherUser = conv.participants.find(p => p._id !== user?._id);
                const isUnread = (conv.unreadCounts && conv.unreadCounts[user?._id] > 0);
                
                return (
                  <div 
                    key={conv._id}
                    onClick={() => setActiveConv(conv)}
                    className={`p-4 border-b border-border-subtle/50 cursor-pointer transition-colors flex items-center gap-3 ${activeConv?._id === conv._id ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-white/5 border-l-2 border-l-transparent'}`}
                  >
                    <div className="relative shrink-0">
                      <Avatar 
                        src={otherUser?.profile?.avatar} 
                        username={otherUser?.username || '?'} 
                        size="md" 
                      />
                      {otherUser?.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-surface"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className={`font-bold truncate text-sm ${isUnread ? 'text-white' : 'text-white/90'}`}>{otherUser?.username}</span>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-text-muted shrink-0 ml-2">
                            {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate ${isUnread ? 'text-white font-medium' : 'text-text-muted'}`}>
                        {conv.lastMessage ? conv.lastMessage.content : 'Started a conversation'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-bg-dark overflow-hidden">
          {!activeConv ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-4 text-text-muted p-8">
              <MessageCircle size={48} className="opacity-20" />
              <p className="text-center text-sm">Select a conversation or start a new one to begin debating privately.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border-subtle bg-surface flex items-center gap-3 shrink-0 shadow-sm z-10">
                <Avatar 
                  src={activeConv.participants.find(p => p._id !== user?._id)?.profile?.avatar} 
                  username={activeConv.participants.find(p => p._id !== user?._id)?.username || '?'} 
                  size="md" 
                />
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    {activeConv.participants.find(p => p._id !== user?._id)?.username || 'Unknown'}
                    <CredibilityBadge score={activeConv.participants.find(p => p._id !== user?._id)?.credibilityScore || 50} size="sm" />
                  </h3>
                  <span className="text-xs text-text-muted">
                    {activeConv.participants.find(p => p._id !== user?._id)?.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
                    No messages yet. Send the first logical argument.
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.sender?._id === user?._id;
                    return (
                      <div key={msg._id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${isMe ? 'bg-primary text-bg-dark rounded-tr-sm shadow-glow' : 'bg-surface text-white rounded-tl-sm border border-border-subtle'}`}>
                          <p className="leading-relaxed">{msg.content}</p>
                          <span className={`text-[10px] mt-1 block ${isMe ? 'text-bg-dark/70 text-right' : 'text-text-muted'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input Area */}
              <div className="p-4 bg-surface border-t border-border-subtle shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Formulate your response..."
                    className="flex-1 bg-bg-dark border border-border-muted rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                  <AnimatedButton 
                    type="submit" 
                    variant="primary" 
                    className="px-6 rounded-xl shrink-0" 
                    disabled={isSending || !newMessage.trim()}
                  >
                    {isSending ? '...' : <Send size={18} />}
                  </AnimatedButton>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
