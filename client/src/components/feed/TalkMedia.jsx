import React from 'react';
import { resolveMediaUrl } from '@/lib/media';

export const TalkMedia = React.memo(({ media }) => {
  if (!media?.length) return null;
  const single = media.length === 1;

  return (
    <div className={`mb-3 grid gap-1.5 overflow-hidden rounded-[4px] border-2 border-ink ${single ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {media.map((item, index) => {
        const src = resolveMediaUrl(item.url);
        const spanTwo = media.length === 3 && index === 2;
        return (
          <a
            key={item.url || index}
            href={src || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`relative block bg-ink/10 ${single ? 'aspect-[16/10]' : 'aspect-square'} ${spanTwo ? 'col-span-2 aspect-[2/1]' : ''}`}
            aria-label={`Open image ${index + 1} in a new tab`}
          >
            {src && (
              <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.visibility = 'hidden';
                }}
              />
            )}
          </a>
        );
      })}
    </div>
  );
});

TalkMedia.displayName = 'TalkMedia';
