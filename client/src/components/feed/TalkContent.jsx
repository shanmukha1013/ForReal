import React, { useState } from 'react';
import useAuthStore from '@/store/useAuthStore';
import { Button } from '../Button';

export const TalkContent = React.memo(({ talk, onUpdate }) => {
  const { user } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(talk.content);

  const handleSave = () => {
    if (editContent.trim() !== talk.content) {
      onUpdate(talk._id, editContent);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="mb-4">
        <textarea
          className="w-full bg-bg-dark text-white border border-border-subtle rounded-md p-3 focus:outline-none focus:border-primary resize-none transition-property-common"
          rows={3}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
        </div>
      </div>
    );
  }

  // Basic hashtag highlighting
  const renderContent = () => {
    if (!talk.content) return null;
    const words = talk.content.split(/(\s+)/);
    return words.map((word, index) => {
      if (word.startsWith('#') && word.length > 1) {
        return <span key={index} className="text-primary hover:underline cursor-pointer">{word}</span>;
      }
      return <span key={index}>{word}</span>;
    });
  };

  return (
    <div className="mb-4 text-text-main text-[15px] leading-relaxed whitespace-pre-wrap break-words">
      {renderContent()}
    </div>
  );
});

TalkContent.displayName = 'TalkContent';
