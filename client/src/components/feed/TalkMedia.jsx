import React from 'react';

/**
 * Resolve a media URL to something the browser can display.
 * - blob: URLs (optimistic previews) → pass through
 * - /uploads/... (server media) → use as-is (Vite proxies /uploads in dev; nginx serves in prod)
 * - anything else → use VITE_BACKEND_URL env if available, else relative
 */
const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('blob:') || url.startsWith('http')) return url;
  // Relative path like /uploads/talk-xxx.jpg — works via Vite proxy in dev
  return url;
};

export const TalkMedia = React.memo(({ media }) => {
  if (!media || media.length === 0) return null;

  const gridClass =
    media.length === 1
      ? 'grid-cols-1'
      : 'grid-cols-2';

  return (
    <div className={`grid ${gridClass} gap-1.5 mb-4 rounded-xl overflow-hidden`}>
      {media.map((item, index) => {
        const isThirdOf3 = index === 2 && media.length === 3;
        const src = resolveMediaUrl(item.url);

        return (
          <div
            key={index}
            className={`relative bg-card-dark aspect-video rounded-lg overflow-hidden ${
              isThirdOf3 ? 'col-span-2' : ''
            }`}
          >
            <img
              src={src}
              alt={`Talk media ${index + 1}`}
              className="absolute inset-0 w-full h-full object-cover hover:opacity-95 transition-opacity cursor-pointer"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        );
      })}
    </div>
  );
});

TalkMedia.displayName = 'TalkMedia';
