import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import { talkService } from '@/services/talkService';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { MAX_TALK_LENGTH } from '@/lib/constants';

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const CreateTalk = forwardRef(({ onOptimistic, onCreated, onFailed }, ref) => {
  const user = useAuthStore((s) => s.user);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]); // [{ file, url }]
  const [isPosting, setIsPosting] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const filesRef = useRef(files);
  filesRef.current = files;

  useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }), []);

  // Release object URLs when the composer unmounts.
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  // Auto-grow the textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [content]);

  const length = content.length;
  const canPost = (content.trim().length > 0 || files.length > 0) && length <= MAX_TALK_LENGTH && !isPosting;

  const addFiles = (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    if (!picked.length) return;
    if (files.length + picked.length > MAX_IMAGES) return toast.error(`Up to ${MAX_IMAGES} images per talk.`);
    if (picked.some((f) => !ACCEPTED.includes(f.type))) return toast.error('Use JPG, PNG, WEBP or GIF images.');
    if (picked.some((f) => f.size > MAX_IMAGE_BYTES)) return toast.error('Each image must be under 5MB.');
    setFiles((prev) => [...prev, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    return undefined;
  };

  const removeFile = (index) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const submit = async () => {
    if (!canPost) return;
    const text = content.trim();
    const attached = files;
    const tempId = `temp-${Date.now()}`;

    setIsPosting(true);
    onOptimistic?.({
      _id: tempId,
      content: text,
      author: user,
      media: attached.map((f) => ({ url: f.url, type: 'image' })),
      reactionsCount: { like: 0, dislike: 0, agree: 0, disagree: 0 },
      userReaction: null,
      commentsCount: 0,
      bookmarksCount: 0,
      isBookmarked: false,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    });
    setContent('');
    setFiles([]);

    try {
      const formData = new FormData();
      formData.append('content', text);
      attached.forEach((f) => formData.append('media', f.file));
      const res = await talkService.createTalk(formData);
      onCreated?.(tempId, res.data);
      attached.forEach((f) => URL.revokeObjectURL(f.url));
    } catch (error) {
      onFailed?.(tempId);
      // Give the draft back so nothing the user wrote is lost.
      setContent(text);
      setFiles(attached);
      toast.error(error.message || 'Could not post your talk.');
      textareaRef.current?.focus();
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <section className="card p-4 sm:p-5" aria-label="Write a talk">
      <div className="flex gap-3">
        <Avatar src={user?.profile?.avatar} username={user?.username} size="md" className="mt-0.5 hidden sm:inline-flex" />
        <div className="min-w-0 flex-1">
          <label htmlFor="composer" className="sr-only">What do you think — and why?</label>
          <textarea
            id="composer"
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
            }}
            rows={2}
            maxLength={MAX_TALK_LENGTH}
            placeholder="Say what you mean — and why."
            className="block w-full resize-none bg-transparent text-[17px] font-medium leading-relaxed placeholder:font-medium focus-visible:outline-none"
          />

          {files.length > 0 && (
            <div className={`mt-3 grid gap-2 ${files.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {files.map((f, i) => (
                <div key={f.url} className="relative aspect-video overflow-hidden rounded-[4px] border-2 border-ink">
                  <img src={f.url} alt={`Attachment ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-ivory hover:bg-ink hover:text-ivory"
                    aria-label={`Remove attachment ${i + 1}`}
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-3 border-t-2 border-ink/15 pt-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= MAX_IMAGES || isPosting}
                className="inline-flex h-9 items-center gap-1.5 rounded-[4px] border-2 border-transparent px-2 text-xs font-bold hover:border-ink disabled:opacity-40"
              >
                <ImagePlus size={17} strokeWidth={2.25} aria-hidden="true" /> Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ACCEPTED.join(',')}
                multiple
                onChange={addFiles}
                aria-label="Attach images"
              />
            </div>
            <div className="flex items-center gap-3">
              {length > 0 && (
                <span
                  className={`tabular text-xs font-bold ${length > MAX_TALK_LENGTH - 100 ? 'text-ink underline decoration-ember decoration-2' : 'text-ink/70'}`}
                  aria-live="polite"
                >
                  {MAX_TALK_LENGTH - length}
                </span>
              )}
              <Button variant="accent" size="sm" onClick={submit} disabled={!canPost} isLoading={isPosting}>
                Post talk
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

CreateTalk.displayName = 'CreateTalk';
