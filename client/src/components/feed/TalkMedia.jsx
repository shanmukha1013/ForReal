import React from 'react';

export const TalkMedia = React.memo(({ media }) => {
  if (!media || media.length === 0) return null;

  // Layout logic based on number of images
  const getGridClass = () => {
    if (media.length === 1) return 'grid-cols-1';
    if (media.length === 2) return 'grid-cols-2';
    if (media.length >= 3) return 'grid-cols-2';
    return 'grid-cols-1';
  };

  return (
    <div className={`grid ${getGridClass()} gap-2 mb-4 rounded-xl overflow-hidden`}>
      {media.map((item, index) => {
        const isThirdImage = index === 2 && media.length === 3;
        const url = import.meta.env.VITE_API_URL ? item.url.replace('/api', '') : item.url;
        
        return (
          <div 
            key={index} 
            className={`relative bg-bg-dark aspect-video ${isThirdImage ? 'col-span-2' : ''}`}
          >
            <img 
              src={`http://localhost:5000${url}`} // Assuming local backend running on 5000 for now. In prod, env variable.
              alt="Talk media" 
              className="absolute inset-0 w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
              loading="lazy"
            />
          </div>
        );
      })}
    </div>
  );
});

TalkMedia.displayName = 'TalkMedia';
