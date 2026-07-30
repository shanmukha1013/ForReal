import React, { useEffect, useState } from 'react';
import { usePageTitle } from '@/hooks';
import { AnimatedButton, SkeletonCard } from '@/components/ui';
import { Bell, Heart, MessageCircle, RefreshCw, UserPlus } from 'lucide-react';
import apiClient from '@/services/api';
import { motion } from 'framer-motion';

export const Notifications = () => {
  usePageTitle('Notifications | ForReal');
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/notifications');
      setNotifications(res.data.notifications);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllAsRead = async () => {
    try {
      await apiClient.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error(error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <Heart className="text-primary-bright" size={18} />;
      case 'comment': return <MessageCircle className="text-primary" size={18} />;
      case 'follow': return <UserPlus className="text-success" size={18} />;
      default: return <Bell className="text-text-muted" size={18} />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Notifications</h1>
        <AnimatedButton variant="ghost" onClick={markAllAsRead}>
          Mark all read
        </AnimatedButton>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : notifications.length > 0 ? (
          notifications.map((notif, index) => (
            <motion.div
              key={notif._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-card-dark rounded-xl border p-4 flex gap-4 transition-colors hover:bg-white/[0.02] ${
                notif.isRead ? 'border-border-subtle' : 'border-primary/40 bg-primary/5'
              }`}
            >
              <div className="shrink-0 pt-1">
                {getIcon(notif.type)}
              </div>
              <div>
                <p className="text-sm text-white">
                  <span className="font-bold">{notif.sender?.username}</span> {notif.type === 'like' ? 'liked your argument' : notif.type === 'comment' ? 'replied to you' : 'interacted with you'}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {new Date(notif.createdAt).toLocaleDateString()}
                </p>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 border border-dashed border-border-subtle rounded-xl bg-surface">
            <Bell size={48} className="mx-auto text-text-muted mb-4 opacity-50" />
            <div className="text-text-muted mb-4">You're all caught up.</div>
            <AnimatedButton variant="secondary" onClick={fetchNotifications}>
              <RefreshCw size={14} /> Refresh
            </AnimatedButton>
          </div>
        )}
      </div>
    </div>
  );
};
