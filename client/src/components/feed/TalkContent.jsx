import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { MAX_TALK_LENGTH } from '@/lib/constants';

const TOKEN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?]|#[\p{L}\p{N}_]{1,40})/gu;

// Renders text with safe links: hashtags go to Explore, URLs open externally.
// Everything else is plain text, so user content can never inject markup.
export const RichText = ({ text, className = '' }) => {
  if (!text) return null;
  const parts = text.split(TOKEN);
  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <React.Fragment key={i}>{part}</React.Fragment>;
        if (part.startsWith('#')) {
          return (
            <Link
              key={i}
              to={`/explore?q=${encodeURIComponent(part)}`}
              className="font-bold underline decoration-ember decoration-2 underline-offset-2 hover:bg-ember/25"
            >
              {part}
            </Link>
          );
        }
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="font-semibold underline decoration-ember decoration-2 underline-offset-2 hover:bg-ember/25 [overflow-wrap:anywhere]"
          >
            {part.replace(/^https?:\/\/(www\.)?/, '')}
          </a>
        );
      })}
    </p>
  );
};

export const TalkContent = React.memo(({ talk, isEditing, onCancel, onSave }) => {
  const [draft, setDraft] = useState(talk.content);
  const [isSaving, setIsSaving] = useState(false);

  if (isEditing) {
    const trimmed = draft.trim();
    const save = async () => {
      if (!trimmed || trimmed === talk.content) return onCancel();
      setIsSaving(true);
      const ok = await onSave(trimmed);
      setIsSaving(false);
      if (ok) onCancel();
    };
    return (
      <div className="mb-3">
        <label htmlFor={`edit-${talk._id}`} className="sr-only">Edit talk</label>
        <textarea
          id={`edit-${talk._id}`}
          className="field min-h-28 resize-y"
          value={draft}
          maxLength={MAX_TALK_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save();
            if (e.key === 'Escape') onCancel();
          }}
          autoFocus
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={save} isLoading={isSaving} disabled={!trimmed}>Save</Button>
        </div>
      </div>
    );
  }

  if (!talk.content?.trim()) return null;
  return <RichText text={talk.content} className="mb-3 text-[15px] leading-relaxed" />;
});

TalkContent.displayName = 'TalkContent';
