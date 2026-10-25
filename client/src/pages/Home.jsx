import React, { useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { CreateTalk, TalkFeed } from '@/components/feed';
import { Button, EmptyState, PageHeader } from '@/components/ui';
import { useFeed, usePageTitle } from '@/hooks';

export default function Home() {
  usePageTitle('Feed');
  const feed = useFeed();
  const composerRef = useRef(null);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="The feed"
        title="Say what"
        accent="you mean."
        description="Short takes, open to challenge. Agree, disagree — and say why."
      />

      <div className="mb-6">
        <CreateTalk
          ref={composerRef}
          onOptimistic={feed.prependTalk}
          onCreated={feed.replaceTalk}
          onFailed={feed.removeTalk}
        />
      </div>

      <TalkFeed
        feed={feed}
        empty={(
          <EmptyState
            icon={MessageSquare}
            title="Too quiet in here."
            action={<Button variant="accent" onClick={() => composerRef.current?.focus()}>Write the first talk</Button>}
          >
            Nobody has said anything yet. Start with something you actually believe.
          </EmptyState>
        )}
      />
    </div>
  );
}
