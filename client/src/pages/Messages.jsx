import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/services/api';
import { socketService } from '@/services/socket';
import useAuthStore from '@/store/useAuthStore';
import { useSocket, useSocketEvent, usePageTitle } from '@/hooks';
import { Avatar, Button, ErrorState, Skeleton, Spinner } from '@/components/ui';
import { displayName, sameId, timeAgo } from '@/lib/format';

const otherParticipant = (conversation, userId) =>
  conversation?.participants?.find((p) => !sameId(p._id, userId)) || conversation?.participants?.[0];

const formatTime = (value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const ConversationList = ({ conversations, activeId, userId, onSelect, status, onRetry }) => {
  if (status === 'loading') {
    return (
      <div className="space-y-3 p-4" aria-label="Loading conversations">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }
  if (status === 'error') return <div className="p-4"><ErrorState title="Couldn’t load conversations." onRetry={onRetry} /></div>;
  if (!conversations.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <MessageCircle size={28} strokeWidth={2} aria-hidden="true" />
        <p className="mt-3 text-sm font-bold">No conversations yet.</p>
        <p className="mt-1 text-xs text-ink/70">Open someone’s profile and press Message to take an argument private.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y-2 divide-ink/10">
      {conversations.map((c) => {
        const other = otherParticipant(c, userId);
        const active = c._id === activeId;
        return (
          <li key={c._id}>
            <button
              type="button"
              onClick={() => onSelect(c._id)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-ink text-ivory' : 'hover:bg-ink/[0.05]'}`}
              aria-current={active ? 'true' : undefined}
            >
              <Avatar src={other?.profile?.avatar} username={other?.username} size="md" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate text-sm ${c.unread ? 'font-extrabold' : 'font-bold'}`}>{displayName(other)}</span>
                  {c.lastMessage && (
                    <span className={`shrink-0 text-[11px] font-semibold ${active ? 'text-ivory/70' : 'text-ink/70'}`}>
                      {timeAgo(c.lastMessage.createdAt, { short: true })}
                    </span>
                  )}
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className={`truncate text-xs ${active ? 'text-ivory/75' : c.unread ? 'font-bold' : 'text-ink/70'}`}>
                    {c.lastMessage ? `${sameId(c.lastMessage.sender, userId) ? 'You: ' : ''}${c.lastMessage.content}` : 'Say hello'}
                  </span>
                  {c.unread > 0 && !active && (
                    <span className="tabular inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-extrabold">
                      {c.unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const ChatPane = ({ conversation, userId, onBack, onSent }) => {
  const other = otherParticipant(conversation, userId);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading');
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);
  const typingTimer = useRef(null);
  const remoteTypingTimer = useRef(null);
  const socket = useSocket();

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await apiClient.get(`/messages/${conversation._id}`);
      setMessages(res.data.messages);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [conversation._id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return undefined;
    const join = () => socket.emit('join_conversation', conversation._id);
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
      socket.emit('leave_conversation', conversation._id);
    };
  }, [socket, conversation._id]);

  useEffect(() => () => {
    clearTimeout(typingTimer.current);
    clearTimeout(remoteTypingTimer.current);
  }, []);

  // Keep the newest message in view.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  useSocketEvent('new_message', (message) => {
    if (String(message.conversation) !== String(conversation._id)) return;
    setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
    if (!sameId(message.sender?._id, userId)) {
      setIsTyping(false);
      // Opening the thread marks it read on the server.
      apiClient.get(`/messages/${conversation._id}`, { params: { limit: 1 } }).catch(() => {});
    }
  });

  useSocketEvent('typing', ({ conversationId, userId: typist }) => {
    if (conversationId !== conversation._id || sameId(typist, userId)) return;
    setIsTyping(true);
    clearTimeout(remoteTypingTimer.current);
    remoteTypingTimer.current = setTimeout(() => setIsTyping(false), 4000);
  });

  useSocketEvent('stop_typing', ({ conversationId }) => {
    if (conversationId === conversation._id) setIsTyping(false);
  });

  const emitTyping = () => {
    const socket = socketService.getSocket();
    if (!socket) return;
    if (!typingTimer.current) socket.emit('typing', { conversationId: conversation._id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('stop_typing', { conversationId: conversation._id });
      typingTimer.current = null;
    }, 2000);
  };

  const send = async (e) => {
    e?.preventDefault();
    const content = draft.trim();
    if (!content || !other) return;
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { _id: tempId, content, sender: { _id: userId }, createdAt: new Date().toISOString(), pending: true }]);
    setDraft('');
    clearTimeout(typingTimer.current);
    typingTimer.current = null;
    socketService.getSocket()?.emit('stop_typing', { conversationId: conversation._id });

    try {
      const res = await apiClient.post('/messages', { recipientId: other._id, content });
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m._id !== tempId);
        return withoutTemp.some((m) => m._id === res.data._id) ? withoutTemp : [...withoutTemp, res.data];
      });
      onSent(conversation._id, res.data);
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setDraft(content);
      toast.error(error.message);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b-2 border-ink px-4 py-3">
        <button type="button" onClick={onBack} className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-[4px] hover:bg-ink hover:text-ivory md:hidden" aria-label="Back to conversations">
          <ArrowLeft size={18} strokeWidth={2.75} />
        </button>
        <Link to={`/profile/${other?.username}`} className="flex min-w-0 items-center gap-3 hover:underline">
          <Avatar src={other?.profile?.avatar} username={other?.username} size="md" />
          <span className="min-w-0">
            <span className="block truncate font-extrabold">{displayName(other)}</span>
            <span className="block text-xs font-semibold text-ink/70">{isTyping ? 'typing…' : `@${other?.username}`}</span>
          </span>
        </Link>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-ink/[0.03] p-4" aria-live="polite">
        {status === 'loading' && <div className="flex justify-center py-6"><Spinner /></div>}
        {status === 'error' && <ErrorState title="Messages didn’t load." onRetry={load} />}
        {status === 'ready' && messages.length === 0 && (
          <p className="py-10 text-center text-sm font-semibold text-ink/70">No messages yet. Make your opening statement.</p>
        )}
        {messages.map((m) => {
          const mine = sameId(m.sender?._id, userId);
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-[6px] border-2 border-ink px-3.5 py-2 text-sm ${
                  mine ? 'on-ink bg-ink text-ivory' : 'bg-ivory text-ink'
                } ${m.pending ? 'opacity-60' : ''}`}
              >
                <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                <time dateTime={m.createdAt} className={`mt-0.5 block text-right text-[10px] font-semibold ${mine ? 'text-ivory/65' : 'text-ink/70'}`}>
                  {m.pending ? 'Sending…' : formatTime(m.createdAt)}
                </time>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t-2 border-ink p-3">
        <label htmlFor="message-input" className="sr-only">Message</label>
        <textarea
          id="message-input"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            emitTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send(e);
          }}
          rows={1}
          maxLength={2000}
          placeholder="Write a message…"
          className="field max-h-32 min-h-11 resize-none py-2.5"
        />
        <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send message">
          <Send size={17} />
        </Button>
      </form>
    </div>
  );
};

export default function Messages() {
  usePageTitle('Messages');
  const userId = useAuthStore((s) => s.user?._id);
  const [params, setParams] = useSearchParams();
  const activeId = params.get('c');
  const startWith = params.get('user');

  const [conversations, setConversations] = useState([]);
  const [status, setStatus] = useState('loading');

  const loadConversations = useCallback(async () => {
    try {
      const res = await apiClient.get('/messages/conversations');
      setConversations(res.data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // /messages?user=<id> (from a profile) opens or creates that conversation.
  useEffect(() => {
    if (!startWith) return;
    let cancelled = false;
    apiClient.post('/messages/conversations', { userId: startWith })
      .then((res) => {
        if (cancelled) return;
        setConversations((prev) => (prev.some((c) => c._id === res.data._id) ? prev : [res.data, ...prev]));
        setParams({ c: res.data._id }, { replace: true });
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(error.message);
        setParams({}, { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [startWith, setParams]);

  const select = (id) => {
    setParams({ c: id });
    setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, unread: 0 } : c)));
  };

  const bumpConversation = useCallback((conversationId, message, incrementUnread) => {
    setConversations((prev) => {
      const existing = prev.find((c) => c._id === String(conversationId));
      if (!existing) return prev;
      const updated = {
        ...existing,
        lastMessage: { content: message.content, sender: message.sender?._id || message.sender, createdAt: message.createdAt },
        unread: incrementUnread ? (existing.unread || 0) + 1 : existing.unread,
      };
      return [updated, ...prev.filter((c) => c._id !== updated._id)];
    });
  }, []);

  useSocketEvent('new_message', (message) => {
    const known = conversations.some((c) => c._id === String(message.conversation));
    if (!known) {
      loadConversations();
      return;
    }
    const isActive = String(message.conversation) === activeId;
    bumpConversation(message.conversation, message, !isActive && !sameId(message.sender?._id, userId));
  });

  const active = conversations.find((c) => c._id === activeId);

  return (
    <div>
      <h1 className="font-display mb-4 text-5xl">Messages</h1>
      <div className="card grid h-[calc(100dvh-14.5rem)] min-h-[420px] overflow-hidden md:h-[calc(100dvh-11rem)] md:grid-cols-[280px_1fr]">
        <aside className={`min-h-0 overflow-y-auto border-ink md:block md:border-r-2 ${active ? 'hidden' : 'block'}`} aria-label="Conversations">
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            userId={userId}
            onSelect={select}
            status={status}
            onRetry={loadConversations}
          />
        </aside>
        <section className={`min-h-0 ${active ? 'block' : 'hidden md:block'}`}>
          {active ? (
            <ChatPane
              key={active._id}
              conversation={active}
              userId={userId}
              onBack={() => setParams({})}
              onSent={(id, message) => bumpConversation(id, message, false)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <MessageCircle size={34} strokeWidth={2} aria-hidden="true" />
              <p className="font-display mt-3 text-3xl">Take it private.</p>
              <p className="mt-1 max-w-xs text-sm text-ink/70">Pick a conversation, or message someone from their profile.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
