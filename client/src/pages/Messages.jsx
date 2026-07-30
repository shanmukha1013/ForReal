import React from 'react';
import { usePageTitle } from '@/hooks';
import { MessageCircle } from 'lucide-react';
import { AnimatedButton } from '@/components/ui';

export const Messages = () => {
  usePageTitle('Messages | ForReal');

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-3xl font-black text-white tracking-tight">Messages</h1>
      </div>

      <div className="flex-1 bg-card-dark rounded-xl border border-border-subtle flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-border-subtle flex flex-col bg-surface">
          <div className="p-4 border-b border-border-subtle font-bold text-white text-sm">
            Recent Conversations
          </div>
          <div className="flex-1 flex items-center justify-center text-text-muted text-sm p-4 text-center">
            Message history is being encrypted and migrated to the new Logic Engine.
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex items-center justify-center flex-col gap-4 text-text-muted p-8">
          <MessageCircle size={48} className="opacity-20" />
          <p className="text-center">Select a conversation or start a new one to begin debating privately.</p>
          <AnimatedButton variant="primary">
            New Message
          </AnimatedButton>
        </div>
      </div>
    </div>
  );
};
