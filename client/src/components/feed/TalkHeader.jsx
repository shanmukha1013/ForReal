import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo, displayName } from '@/lib/format';

export const TalkHeader = React.memo(({ talk, isOwner, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const author = talk.author || {};

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      if (e.type === 'mousedown' && menuRef.current?.contains(e.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <Link to={`/profile/${author.username}`} className="group flex min-w-0 items-center gap-3">
        <Avatar src={author.profile?.avatar} username={author.username} size="md" />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-extrabold leading-tight group-hover:underline">
            {displayName(author)}
          </span>
          <span className="block truncate text-xs font-medium text-ink/70">
            @{author.username || 'unknown'} · <time dateTime={talk.createdAt}>{timeAgo(talk.createdAt)}</time>
            {talk.isEdited && ' · edited'}
            {talk.isOptimistic && ' · posting…'}
          </span>
        </span>
      </Link>

      {isOwner && !talk.isOptimistic && (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border-2 border-transparent hover:border-ink"
            aria-label="Talk options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div role="menu" className="card absolute right-0 top-9 z-20 w-40 overflow-hidden p-1 animate-pop shadow-hard-sm">
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); onEdit(); }}
                className="flex w-full items-center gap-2 rounded-[3px] px-3 py-2 text-left text-sm font-semibold hover:bg-ink hover:text-ivory"
              >
                <Pencil size={15} /> Edit
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); onDelete(talk._id); }}
                className="flex w-full items-center gap-2 rounded-[3px] px-3 py-2 text-left text-sm font-semibold hover:bg-ink hover:text-ivory"
              >
                <Trash2 size={15} /> Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

TalkHeader.displayName = 'TalkHeader';
