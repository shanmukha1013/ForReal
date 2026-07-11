import React, { useState, useRef } from 'react';
import { Image as ImageIcon, X, Loader2 } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import { Button } from '../Button';
import { talkService } from '@/services/talkService';

export const CreateTalk = ({ onTalkCreated }) => {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState([]); // File objects
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_CHARS = 2000;
  const charsLeft = MAX_CHARS - content.length;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (media.length + files.length > 4) {
      alert('You can only upload up to 4 images');
      return;
    }

    const newMedia = [...media, ...files];
    setMedia(newMedia);

    // Create preview URLs
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviewUrls]);
  };

  const removeMedia = (index) => {
    const newMedia = [...media];
    newMedia.splice(index, 1);
    setMedia(newMedia);

    const newPreviewUrls = [...previewUrls];
    URL.revokeObjectURL(newPreviewUrls[index]);
    newPreviewUrls.splice(index, 1);
    setPreviewUrls(newPreviewUrls);
  };

  const handleSubmit = async () => {
    if (!content.trim() && media.length === 0) return;
    
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', content);
      
      // Extract hashtags
      const hashtags = content.match(/#[a-z0-9_]+/gi);
      if (hashtags) {
        formData.append('hashtags', JSON.stringify(hashtags));
      }

      media.forEach(file => {
        formData.append('media', file);
      });

      const res = await talkService.createTalk(formData);
      
      if (res.success) {
        setContent('');
        setMedia([]);
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        setPreviewUrls([]);
        if (onTalkCreated) onTalkCreated(res.data);
      }
    } catch (error) {
      console.error('Failed to create talk:', error);
      alert('Failed to post talk');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card-dark rounded-xl border border-border-subtle p-4 sm:p-5 mb-6 shadow-lg relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
      
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-lg flex-shrink-0">
          {user?.username?.[0]?.toUpperCase()}
        </div>
        
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind? Start a Talk..."
            className="w-full bg-transparent text-white text-lg placeholder:text-text-muted/60 focus:outline-none resize-none min-h-[60px]"
            maxLength={MAX_CHARS}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = (e.target.scrollHeight) + 'px';
            }}
          />

          {previewUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3 mb-2 rounded-xl overflow-hidden">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative aspect-video bg-bg-dark group">
                  <img src={url} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeMedia(i)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-subtle/50">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors flex items-center justify-center disabled:opacity-50"
                disabled={media.length >= 4}
              >
                <ImageIcon size={20} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={handleFileChange}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <span className={`text-sm font-medium ${charsLeft < 50 ? 'text-error' : 'text-text-muted'}`}>
                {charsLeft}
              </span>
              <Button 
                variant="primary" 
                onClick={handleSubmit} 
                disabled={(!content.trim() && media.length === 0) || isLoading}
                className="min-w-[100px] h-10 shadow-primary/25 shadow-lg"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Talk'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
