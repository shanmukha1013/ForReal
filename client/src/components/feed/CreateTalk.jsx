import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, X, Loader2 } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import { Button } from '../Button';
import { talkService } from '@/services/talkService';
import toast from 'react-hot-toast';

export const CreateTalk = ({ onTalkCreated, composerRef: externalRef }) => {
  const { user } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState([]); // File objects
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const MAX_CHARS = 2000;
  const currentLength = content.length;
  const isNearLimit = currentLength > MAX_CHARS - 100;
  const isAtLimit = currentLength >= MAX_CHARS;
  const canSubmit = (content.trim().length > 0 || media.length > 0) && !isLoading && !isAtLimit;

  // Expose focus method via composerRef so parent can focus the textarea
  useEffect(() => {
    if (externalRef) {
      externalRef.current = {
        focus: () => {
          textareaRef.current?.focus();
          setIsExpanded(true);
        }
      };
    }
  }, [externalRef]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 300) + 'px';
    }
  }, [content, isExpanded]);

  // Click outside to collapse if empty
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (!content.trim() && media.length === 0) {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [content, media.length]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (media.length + files.length > 4) {
      toast.error('You can add up to 4 images per Talk');
      return;
    }

    // Validate file sizes
    const oversized = files.filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error('Each image must be under 5MB');
      return;
    }

    const newMedia = [...media, ...files];
    setMedia(newMedia);

    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    setIsExpanded(true);

    // Reset input so same file can be re-selected after removal
    e.target.value = '';
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
    if (!canSubmit) return;
    
    // Prevent double-submission
    setIsLoading(true);

    const optimisticId = `temp-${Date.now()}`;
    const optimisticTalk = {
      _id: optimisticId,
      content,
      author: user,
      media: previewUrls.map(url => ({ url, type: 'image' })),
      reactionsCount: { like: 0, dislike: 0, agree: 0, disagree: 0 },
      userReaction: null,
      commentsCount: 0,
      bookmarksCount: 0,
      isBookmarked: false,
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    // Save draft before clearing
    const previousContent = content;
    const previousMedia = [...media];
    const previousPreviews = [...previewUrls];

    // Optimistically add to feed
    if (onTalkCreated) onTalkCreated(optimisticTalk);

    // Clear composer immediately
    setContent('');
    setMedia([]);
    setPreviewUrls([]);
    setIsExpanded(false);

    try {
      const formData = new FormData();
      formData.append('content', previousContent);
      
      // Extract hashtags from content
      const hashtags = previousContent.match(/#[a-zA-Z0-9_]+/g);
      if (hashtags && hashtags.length > 0) {
        formData.append('hashtags', JSON.stringify(hashtags));
      }

      // Attach media files
      previousMedia.forEach(file => {
        formData.append('media', file);
      });

      const res = await talkService.createTalk(formData);
      
      if (res.success) {
        // Replace the optimistic placeholder with the real server talk
        if (onTalkCreated) {
          onTalkCreated({ ...res.data, replaceId: optimisticId });
        }
      } else {
        throw new Error(res.message || 'Failed to post Talk');
      }
    } catch (error) {
      console.error('Failed to create talk:', error);
      
      // Remove the optimistic talk from feed
      if (onTalkCreated) onTalkCreated({ removeId: optimisticId });
      
      // Restore composer content so user doesn't lose their text
      setContent(previousContent);
      setMedia(previousMedia);
      setPreviewUrls(previousPreviews);
      setIsExpanded(true);

      const errorMessage = error.message && error.message !== 'Failed to post Talk'
        ? error.message
        : 'Could not post your Talk. Please try again.';
      toast.error(errorMessage);
      
      // Refocus textarea after error
      setTimeout(() => textareaRef.current?.focus(), 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canSubmit) handleSubmit();
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="bg-card-dark rounded-xl border border-border-subtle p-4 mb-6 shadow-sm transition-all duration-300"
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-base flex-shrink-0 mt-0.5">
          {user?.username?.[0]?.toUpperCase()}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col">
          <textarea
            ref={textareaRef}
            value={content}
            onFocus={() => setIsExpanded(true)}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="SAY WHAT YOU MEAN."
            aria-label="Compose a Talk"
            className={`w-full bg-transparent text-white text-base placeholder:text-text-muted/60 focus:outline-none resize-none transition-all duration-300 leading-relaxed ${
              isExpanded ? 'min-h-[80px] pt-0.5' : 'h-7 overflow-hidden pt-0.5'
            }`}
            maxLength={MAX_CHARS}
          />

          {/* Media preview grid */}
          {isExpanded && previewUrls.length > 0 && (
            <div className={`grid gap-2 mt-3 mb-2 rounded-xl overflow-hidden ${
              previewUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
            }`}>
              {previewUrls.map((url, i) => (
                <div key={i} className="relative aspect-video bg-black/40 rounded-lg overflow-hidden group">
                  <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeMedia(i)}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error"
                    aria-label={`Remove image ${i + 1}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Composer actions */}
          {isExpanded && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle/50">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed relative group"
                  disabled={media.length >= 4 || isLoading}
                  aria-label="Add media"
                  title="Add media (JPEG, PNG, WEBP)"
                >
                  <ImageIcon size={18} />
                  <span className="sr-only">Add media</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileChange}
                  aria-label="Upload images"
                />
              </div>
              
              <div className="flex items-center gap-3">
                {/* Character counter */}
                <span 
                  className={`text-xs font-medium tabular-nums transition-colors ${
                    isAtLimit 
                      ? 'text-error font-bold' 
                      : isNearLimit 
                        ? 'text-orange-400' 
                        : 'text-text-muted/40'
                  }`}
                  aria-live="polite"
                  aria-label={`${currentLength} of ${MAX_CHARS} characters used`}
                >
                  {currentLength > 0 ? `${currentLength} / ${MAX_CHARS}` : ''}
                </span>
                
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={handleSubmit} 
                  disabled={!canSubmit}
                  className="min-w-[72px] h-8 text-sm rounded-full shadow-primary/20 shadow-md"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Talk'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
