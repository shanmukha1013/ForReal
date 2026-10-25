import React, { useEffect, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import { debateService } from '@/services/debateService';
import { socketService } from '@/services/socket';
import { Button, Input } from '@/components/ui';
import { MAX_ARGUMENT_LENGTH } from '@/lib/constants';
import { sideLetter, sideTone } from '@/lib/sides';

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const ArgumentComposer = ({ debate, onPosted }) => {
  const username = useAuthStore((s) => s.user?.username);
  const [side, setSide] = useState(debate.userVote ? String(debate.userVote) : '');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('');
  const [sourceError, setSourceError] = useState('');
  const [busy, setBusy] = useState(false);
  const typingTimer = useRef(null);
  const evidenceRequired = Boolean(debate.settings?.evidenceRequired);

  // Default to the side the user voted for whenever their vote changes.
  useEffect(() => {
    if (debate.userVote) setSide(String(debate.userVote));
  }, [debate.userVote]);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  const emitTyping = () => {
    const socket = socketService.getSocket();
    if (!socket) return;
    if (!typingTimer.current) socket.emit('debate_typing', { debateId: debate._id, username });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('debate_stop_typing', { debateId: debate._id, username });
      typingTimer.current = null;
    }, 2500);
  };

  const submit = async (e) => {
    e.preventDefault();
    const text = content.trim();
    const url = source.trim();
    if (!text) return;
    if (url && !isHttpUrl(url)) return setSourceError('Use a full link starting with https://');
    if (evidenceRequired && !url) return setSourceError('This debate requires a source with every argument.');
    setSourceError('');
    setBusy(true);
    try {
      const res = await debateService.postArgument(debate._id, {
        content: text,
        optionId: side || undefined,
        referenceUrl: url || undefined,
      });
      setContent('');
      setSource('');
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
      socketService.getSocket()?.emit('debate_stop_typing', { debateId: debate._id, username });
      onPosted(res.data);
      toast.success('Your argument is on the floor.');
    } catch (error) {
      if (/source/i.test(error.message)) setSourceError(error.message);
      else toast.error(error.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const sides = [...debate.options.map((opt, i) => ({ value: String(opt._id), label: opt.label, index: i })), { value: '', label: 'Neutral', index: -1 }];

  return (
    <form onSubmit={submit} className="card p-4 sm:p-5" aria-labelledby="composer-heading">
      <h3 id="composer-heading" className="font-display text-2xl">Make your case</h3>

      <fieldset className="mt-3">
        <legend className="mb-2 text-sm font-bold">Arguing for</legend>
        <div className="flex flex-wrap gap-2">
          {sides.map((s) => {
            const active = side === s.value;
            return (
              <label
                key={s.value || 'neutral'}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-[4px] border-2 px-3 py-1.5 text-sm font-bold transition-colors ${
                  active ? 'border-ink bg-ink text-ivory' : 'border-ink hover:bg-ink/8'
                } ${s.index < 0 ? 'border-dashed' : ''}`}
              >
                <input type="radio" name="side" value={s.value} checked={active} onChange={() => setSide(s.value)} className="sr-only" />
                {s.index >= 0 && (
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-[2px] border border-ink font-display text-xs ${sideTone(s.index).chip}`} aria-hidden="true">
                    {sideLetter(s.index)}
                  </span>
                )}
                <span className="max-w-[12rem] truncate">{s.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4">
        <label htmlFor="argument" className="sr-only">Your argument</label>
        <textarea
          id="argument"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            emitTyping();
          }}
          maxLength={MAX_ARGUMENT_LENGTH}
          rows={4}
          placeholder="State your claim. Give your reasons. Anticipate the counter-argument."
          className="field resize-y"
        />
        <div className="mt-1 text-right text-xs font-semibold text-ink/70 tabular">{MAX_ARGUMENT_LENGTH - content.length}</div>
      </div>

      <Input
        label={evidenceRequired ? 'Source (required)' : 'Source (optional)'}
        type="url"
        inputMode="url"
        placeholder="https://"
        value={source}
        onChange={(e) => {
          setSource(e.target.value);
          if (sourceError) setSourceError('');
        }}
        hint="Link a study, article or dataset that backs your claim."
        error={sourceError}
      />

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/70">
          <Link2 size={14} aria-hidden="true" /> Sourced arguments are marked as evidence-backed.
        </span>
        <Button type="submit" variant="accent" isLoading={busy} disabled={!content.trim()}>Post argument</Button>
      </div>
    </form>
  );
};
