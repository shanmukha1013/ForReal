import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/services/api';
import useNotificationStore from '@/store/useNotificationStore';
import { useSocketEvent, usePageTitle } from '@/hooks';
import { Avatar, Button, EmptyState, ErrorState, PageHeader, SkeletonList } from '@/components/ui';
import { describeNotification } from '@/lib/notifications';
import { timeAgo } from '@/lib/format';

export default function Notifications() {
  usePageTitle('Notifications');
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const [items, setItems] = useState([]);
  const [state, setState] = useState({ status: 'loading', page: 1, pages: 1 });

  const load = useCallback(async (page = 1) => {
    setState((s) => ({ ...s, status: page === 1 ? 'loading' : 'more' }));
    try {
      const res = await apiClient.get('/notifications', { params: { page, limit: 20 } });
      setItems((prev) => (page === 1 ? res.data.notifications : [...prev, ...res.data.notifications]));
      setUnreadCount(res.data.unreadCount);
      setState({ status: 'ready', page, pages: res.data.pages });
    } catch (error) {
      setState((s) => ({ ...s, status: 'error', error: error.message }));
    }
  }, [setUnreadCount]);

  useEffect(() => {
    load(1);
  }, [load]);

  useSocketEvent('notification', (notification) => {
    setItems((prev) => (prev.some((n) => n._id === notification._id) ? prev : [notification, ...prev]));
    setUnreadCount(useNotificationStore.getState().unreadCount + 1);
  });

  const unread = items.filter((n) => !n.isRead).length;

  const markAll = async () => {
    const snapshot = items;
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await apiClient.put('/notifications/read-all');
    } catch (error) {
      setItems(snapshot);
      toast.error(error.message);
    }
  };

  const markOne = (n) => {
    if (n.isRead) return;
    setItems((prev) => prev.map((item) => (item._id === n._id ? { ...item, isRead: true } : item)));
    useNotificationStore.getState().decrement();
    apiClient.put(`/notifications/${n._id}/read`).catch(() => {});
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        description="Replies, endorsements, follows and verdicts — when people engage with your ideas."
        actions={unread > 0 && (
          <Button variant="ivory" size="sm" onClick={markAll}>
            <CheckCheck size={16} strokeWidth={2.75} /> Mark all read
          </Button>
        )}
      />

      {state.status === 'loading' ? (
        <SkeletonList count={3} />
      ) : state.status === 'error' && items.length === 0 ? (
        <ErrorState title="Notifications didn’t load." message={state.error} onRetry={() => load(1)} />
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="All quiet." action={<Button to="/debates" variant="accent">Join a debate</Button>}>
          When someone replies to your argument, endorses a point or follows you, it shows up here.
        </EmptyState>
      ) : (
        <ul className="card divide-y-2 divide-ink/15 overflow-hidden">
          {items.map((n) => {
            const { text, link } = describeNotification(n);
            return (
              <li key={n._id}>
                <Link
                  to={link}
                  onClick={() => markOne(n)}
                  className={`flex items-start gap-3 px-4 py-4 transition-colors hover:bg-ink/[0.05] sm:px-5 ${n.isRead ? '' : 'bg-ember/15'}`}
                >
                  <Avatar src={n.sender?.profile?.avatar} username={n.sender?.username} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm leading-snug ${n.isRead ? 'font-medium' : 'font-extrabold'}`}>{text}</span>
                    <time dateTime={n.createdAt} className="mt-1 block text-xs font-semibold text-ink/70">{timeAgo(n.createdAt)}</time>
                  </span>
                  {!n.isRead && (
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-ink bg-ember">
                      <span className="sr-only">Unread</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {state.page < state.pages && items.length > 0 && (
        <div className="mt-5 flex justify-center">
          <Button variant="ivory" onClick={() => load(state.page + 1)} isLoading={state.status === 'more'}>Load older</Button>
        </div>
      )}
    </div>
  );
}
