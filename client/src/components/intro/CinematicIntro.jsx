import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion';
import { Heart, Eye, Repeat2, Bell, ArrowUpRight } from 'lucide-react';

/*
 * ForReal cinematic introduction.
 *
 *   01 The noise          — a feed of empty engagement, fast and overwhelming
 *   02 Question everything — the motion slows; claims are challenged
 *   03 ForReal            — an ember wipe and a masked wordmark reveal
 *   04 Ideas collide      — two sides argue with claims, evidence and rebuttals
 *   → onFinish            — the landing hero ("Don't just post it. Defend it.")
 *
 * Performance: only transform and opacity are animated, no blur or layout
 * properties; counters write to the DOM directly instead of re-rendering; each
 * scene unmounts when it ends. Skippable with the button, Esc, Enter or Space.
 */

const SCENES = [
  { label: 'The noise', duration: 3600, caption: 'A feed full of claims, counters and noise.' },
  { label: 'Question everything', duration: 3200, caption: 'Every claim is challenged: source? says who? prove it.' },
  { label: 'ForReal', duration: 2900, caption: 'ForReal. A debate platform for people who mean what they say.' },
  { label: 'Ideas collide', duration: 5000, caption: 'Two sides argue with claims, evidence and rebuttals while the room votes.' },
];

const SNAP = [0.2, 0.8, 0.2, 1];
const EXPO = [0.16, 1, 0.3, 1];

/* ── Shared bits ──────────────────────────────────────────────────────────── */

// Counts up by writing straight to the text node (no React re-renders).
const Ticker = ({ from, to, duration = 2600, delay = 0, format = (n) => n.toLocaleString() }) => {
  const ref = useRef(null);
  useEffect(() => {
    let frame;
    let start;
    let lastWrite = 0;
    const startAt = performance.now() + delay * 1000;
    const step = (now) => {
      if (now < startAt) {
        frame = requestAnimationFrame(step);
        return;
      }
      start ??= now;
      const t = Math.min(1, (now - start) / duration);
      // ~25 text updates per second is visually identical and repaints less.
      if (now - lastWrite > 40 || t === 1) {
        lastWrite = now;
        const eased = 1 - (1 - t) ** 3;
        if (ref.current) ref.current.textContent = format(Math.round(from + (to - from) * eased));
      }
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [from, to, duration, delay, format]);
  return <span ref={ref} className="tabular">{format(from)}</span>;
};

const compact = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n));

/* ── Scenes 01 + 02: the noise, then the questions ───────────────────────── */

const FRAGMENTS = [
  { id: 'p1', kind: 'post', x: 4, y: 12, rot: -4, delay: 0.05, handle: '@viral.daily', text: 'You won’t BELIEVE what happened next…', from: 2100, to: 48200 },
  { id: 'c1', kind: 'claim', x: 50, y: 12, rot: 3, delay: 0.25, text: 'Trust me.', size: 'xl', challenge: 'Source?' },
  { id: 'n1', kind: 'pill', x: 74, y: 25, rot: -3, delay: 0.4, icon: Bell, text: '+99 new likes' },
  { id: 'v1', kind: 'counter', x: 6, y: 38, rot: 2, delay: 0.45, from: 12000, to: 1048576, text: 'views' },
  { id: 'c2', kind: 'claim', x: 31, y: 31, rot: -5, delay: 0.6, text: 'Everyone knows it.', size: 'lg', challenge: 'Says who?' },
  { id: 'p2', kind: 'post', x: 58, y: 47, rot: 4, delay: 0.75, handle: '@hot.takes', text: 'Experts HATE this one weird trick.', from: 900, to: 12900, wide: true },
  { id: 'n2', kind: 'pill', x: 10, y: 63, rot: 4, delay: 0.9, icon: Repeat2, text: 'You’re trending!' },
  { id: 'c3', kind: 'claim', x: 33, y: 60, rot: 2, delay: 1.0, text: 'No source needed.', size: 'lg', challenge: 'Prove it.' },
  { id: 'n3', kind: 'pill', x: 72, y: 71, rot: -5, delay: 1.1, icon: Repeat2, text: '3,102 shares', wide: true },
  { id: 'c4', kind: 'claim', x: 3, y: 84, rot: -3, delay: 1.25, text: 'Like if you agree', size: 'md' },
  { id: 'c5', kind: 'claim', x: 52, y: 86, rot: 3, delay: 1.4, text: '100% real. Share now.', size: 'md', challenge: 'Where’s the evidence?', wide: true },
];

const claimSize = {
  xl: 'text-[clamp(2.6rem,9vw,6.5rem)]',
  lg: 'text-[clamp(1.9rem,6vw,4.4rem)]',
  md: 'text-[clamp(1.4rem,4vw,2.8rem)]',
};

// Keep fragments inside narrow viewports by capping how far right they start.
const MAX_WIDTH = { post: 'min(16rem, 44vw)', pill: '11rem', counter: '12rem', claim: '14rem' };
const leftFor = (f) => `min(${f.x}%, calc(100% - ${MAX_WIDTH[f.kind]} - 0.75rem))`;

const FragmentBody = ({ f }) => {
  if (f.kind === 'post') {
    return (
      <div className="w-[min(16rem,44vw)] rounded-[4px] border-2 border-ink bg-ivory p-3 text-ink shadow-hard">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-ember" />
          <span className="text-xs font-extrabold">{f.handle}</span>
        </div>
        <p className="text-sm font-bold leading-snug">{f.text}</p>
        <div className="mt-2 flex items-center gap-3 text-xs font-extrabold">
          <span className="inline-flex items-center gap-1">
            <Heart size={13} className="fill-ember text-ember" />
            <Ticker from={f.from} to={f.to} delay={f.delay} format={compact} />
          </span>
          <span className="inline-flex items-center gap-1"><Eye size={13} /> {compact(f.to * 7)}</span>
        </div>
      </div>
    );
  }
  if (f.kind === 'pill') {
    const Icon = f.icon;
    return (
      <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-ember px-3.5 py-1.5 text-sm font-extrabold text-ink shadow-hard-sm">
        <Icon size={15} strokeWidth={2.75} /> {f.text}
      </span>
    );
  }
  if (f.kind === 'counter') {
    return (
      <div className="font-display text-ivory">
        <div className="text-[clamp(2.2rem,7vw,5rem)]">
          <Ticker from={f.from} to={f.to} delay={f.delay} duration={3000} />
        </div>
        <div className="eyebrow mt-1 text-ember">{f.text}</div>
      </div>
    );
  }
  return <span className={`font-display block ${claimSize[f.size]} text-ivory`}>{f.text}</span>;
};

const NoiseField = ({ phase }) => {
  const chaos = phase === 'chaos';
  const challenged = FRAGMENTS.filter((f) => f.challenge);

  return (
    <m.div
      key="noise"
      className="absolute inset-0 overflow-hidden bg-ink"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
    >
      <div className="grain pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />

      {/* The field steps back toward the top when the questions arrive,
          clearing the lower band for the closing question. */}
      <m.div
        className="absolute inset-0"
        style={{ transformOrigin: '50% 0%' }}
        animate={chaos ? { scale: 1, y: 0 } : { scale: 0.8, y: '3%' }}
        transition={{ duration: 1.1, ease: EXPO }}
      >
        {/* Camera shake builds in the second half of the noise scene; a CSS
            animation keeps it on the compositor thread. */}
        <div className={`absolute inset-0 ${chaos ? 'animate-[shake_0.45s_linear_2.1s_infinite]' : ''}`}>
        {FRAGMENTS.map((f, i) => {
          const isChallenged = Boolean(f.challenge);
          return (
            <m.div
              key={f.id}
              className={`absolute ${f.wide ? 'hidden sm:block' : ''}`}
              style={{ left: leftFor(f), top: `${f.y}%` }}
              initial={{ opacity: 0, scale: 0.4, rotate: f.rot * 4 }}
              animate={
                chaos
                  ? { opacity: 1, scale: 1, rotate: f.rot }
                  : { opacity: isChallenged ? 1 : 0.14, scale: isChallenged ? 1 : 0.94, rotate: f.rot }
              }
              transition={
                chaos
                  ? { type: 'spring', stiffness: 420, damping: 18, delay: f.delay }
                  : { duration: 0.9, ease: EXPO, delay: isChallenged ? 0 : i * 0.02 }
              }
            >
              <div
                className={chaos ? 'animate-[jitter_0.22s_steps(2)_infinite]' : ''}
                style={{ animationDelay: `${(i % 5) * 40}ms` }}
              >
                <div className="relative">
                  <FragmentBody f={f} />
                  {!chaos && isChallenged && (
                    <m.span
                      className="absolute left-[-4%] right-[-4%] top-1/2 h-[5px] origin-left bg-ember"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.4, ease: SNAP, delay: 0.25 + challenged.indexOf(f) * 0.28 }}
                    />
                  )}
                </div>
              </div>

              {!chaos && isChallenged && (
                <m.span
                  className="font-display absolute -right-2 -top-6 whitespace-nowrap rounded-[3px] border-[3px] border-ember bg-ink px-2.5 py-1 text-[clamp(1rem,2.6vw,1.6rem)] text-ember shadow-hard-sm sm:-right-6"
                  initial={{ opacity: 0, scale: 2.6, rotate: -14 }}
                  animate={{ opacity: 1, scale: 1, rotate: -8 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 16, delay: 0.15 + challenged.indexOf(f) * 0.28 }}
                >
                  {f.challenge}
                </m.span>
              )}
            </m.div>
          );
        })}
        </div>
      </m.div>

      {/* Captions */}
      <AnimatePresence mode="wait">
        {chaos ? (
          <m.p
            key="cap-chaos"
            className="eyebrow absolute left-1/2 top-[4.5rem] -translate-x-1/2 whitespace-nowrap text-ivory/70"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3 }}
          >
            Your feed, every single day
          </m.p>
        ) : (
          <m.div
            key="cap-question"
            className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-gradient-to-t from-ink via-ink to-transparent px-5 pb-[8vh] pt-20 sm:gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <m.span
              className="font-display shrink-0 text-[clamp(4.5rem,11vw,8rem)] leading-[0.8] text-ember"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 1.5 }}
            >
              ?
            </m.span>
            <m.p
              className="max-w-xl text-[clamp(1.15rem,2.6vw,1.9rem)] font-bold leading-snug text-ivory"
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: EXPO, delay: 1.75 }}
            >
              What if every claim had to <span className="font-accent text-[1.15em] text-ember">answer</span> a question?
            </m.p>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
};

/* ── Scene 03: identity ──────────────────────────────────────────────────── */

const MaskedWord = ({ word, className, startDelay }) => (
  <span className={`inline-flex ${className}`} aria-hidden="true">
    {word.split('').map((letter, i) => (
      <span key={`${letter}-${i}`} className="inline-block overflow-hidden pb-[0.04em]">
        <m.span
          className="inline-block"
          initial={{ y: '112%', rotate: 8 }}
          animate={{ y: '0%', rotate: 0 }}
          transition={{ duration: 0.75, ease: EXPO, delay: startDelay + i * 0.065 }}
        >
          {letter}
        </m.span>
      </span>
    ))}
  </span>
);

const IdentityScene = () => {
  // Once the wipe has covered the screen, a plain ember background replaces the
  // huge scaled circle so the browser stops compositing an oversized layer.
  const [wiped, setWiped] = useState(false);
  return (
  <m.div key="identity" className={`absolute inset-0 overflow-hidden ${wiped ? 'bg-ember' : 'bg-ink'}`} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
    {/* The ember wipe grows out of the question mark. */}
    {!wiped && (
      <m.div
        className="absolute left-1/2 top-[70%] h-[12vmax] w-[12vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember"
        initial={{ scale: 0 }}
        animate={{ scale: 18 }}
        transition={{ duration: 1, ease: [0.7, 0, 0.2, 1] }}
        onAnimationComplete={() => setWiped(true)}
      />
    )}
    <div className="grain pointer-events-none absolute inset-0 opacity-25" aria-hidden="true" />

    <div className="relative flex h-full flex-col items-center justify-center px-4 text-center">
      <m.div
        initial={{ scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.4, ease: EXPO, delay: 0.4 }}
        className="font-display text-[clamp(5.5rem,24vw,19rem)] leading-[0.82]"
      >
        <MaskedWord word="FOR" className="text-ivory" startDelay={0.55} />
        <MaskedWord word="REAL" className="text-ink" startDelay={0.75} />
      </m.div>
      <m.span
        className="mt-4 block h-[6px] w-[min(46rem,82vw)] origin-left bg-ink"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, ease: EXPO, delay: 1.25 }}
      />
      <m.p
        className="mt-5 max-w-xl text-[clamp(1.1rem,2.4vw,1.6rem)] font-bold leading-snug text-ink"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EXPO, delay: 1.5 }}
      >
        A debate platform for people who <span className="font-accent text-[1.2em] text-ivory">mean</span> what they say.
      </m.p>
    </div>
  </m.div>
  );
};

/* ── Scene 04: ideas collide ─────────────────────────────────────────────── */

const Argument = ({ tag, text, evidence, delay, side }) => {
  const onInk = side === 'against';
  return (
    <m.div
      className={`rounded-[4px] border-2 p-3 sm:p-4 ${onInk ? 'border-ivory/30 text-ivory' : 'border-ink bg-ivory text-ink shadow-hard-sm'}`}
      initial={{ opacity: 0, x: onInk ? 60 : -60 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: EXPO, delay }}
    >
      <span className={`eyebrow ${onInk ? 'text-ember' : ''}`}>{tag}</span>
      <p className="mt-1 text-[clamp(0.95rem,1.6vw,1.2rem)] font-bold leading-snug">{text}</p>
      {evidence && (
        <span className={`mt-2 inline-flex items-center gap-1 rounded-[3px] border-2 px-2 py-0.5 text-[11px] font-extrabold ${onInk ? 'border-ember text-ember' : 'border-ink bg-ember text-ink'}`}>
          <ArrowUpRight size={12} strokeWidth={3} /> Evidence cited
        </span>
      )}
    </m.div>
  );
};

const CollideScene = () => (
  <m.div
    key="collide"
    className="absolute inset-0 flex flex-col overflow-hidden bg-ember md:flex-row"
    exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.5, ease: EXPO } }}
  >
    {/* FOR */}
    <m.section
      className="relative flex flex-1 flex-col justify-center gap-3 bg-ivory px-5 pb-16 pt-20 md:px-10 md:pb-24 md:pt-24 lg:px-16"
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      transition={{ duration: 0.7, ease: EXPO }}
    >
      <span className="font-display text-[clamp(2.8rem,7vw,6rem)] text-ink">For</span>
      <div className="flex max-w-md flex-col gap-3">
        <Argument side="for" tag="Claim" text="Public like counts reward outrage over accuracy." evidence delay={0.9} />
        <div className="hidden sm:block">
          <Argument side="for" tag="Rebuttal" text="Then judge posts by their reasons — not their applause." delay={2.6} />
        </div>
      </div>
    </m.section>

    {/* AGAINST */}
    <m.section
      className="on-ink relative flex flex-1 flex-col justify-center gap-3 bg-ink px-5 pb-24 pt-20 md:items-end md:px-10 md:pb-24 md:pt-24 md:text-right lg:px-16"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      transition={{ duration: 0.7, ease: EXPO }}
    >
      <span className="font-display text-[clamp(2.8rem,7vw,6rem)] text-ivory">Against</span>
      <div className="flex max-w-md flex-col gap-3 md:text-left">
        <Argument side="against" tag="Counter" text="Hiding the number won’t stop people following the crowd." evidence delay={1.6} />
      </div>
    </m.section>

    {/* The motion sits on the seam between the sides. */}
    <m.div
      className="absolute left-1/2 top-1/2 z-10 w-[min(22rem,80vw)] -translate-x-1/2 -translate-y-1/2"
      initial={{ opacity: 0, y: -60, rotate: -6 }}
      animate={{ opacity: 1, y: 0, rotate: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.45 }}
    >
      <div className="rounded-[4px] border-2 border-ink bg-ember p-4 text-ink shadow-hard-lg">
        <span className="eyebrow">The motion</span>
        <p className="font-display mt-1 text-[clamp(1.5rem,3.2vw,2.3rem)]">Social media should hide like counts.</p>
      </div>
      {/* Spark where the arguments collide */}
      <div className="pointer-events-none absolute left-1/2 top-1/2" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          // Static rotation on the wrapper so each line travels outward along its own angle.
          <span key={i} className="absolute left-0 top-0" style={{ transform: `rotate(${i * 45}deg)` }}>
            <m.span
              className="block h-[3px] w-14 origin-left bg-ink"
              initial={{ scaleX: 0, opacity: 0, x: 0 }}
              animate={{ scaleX: [0, 1.6, 0], opacity: [0, 1, 0], x: [0, 30, 80] }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 1.75 }}
            />
          </span>
        ))}
      </div>
    </m.div>

    {/* The room votes */}
    <m.div
      className="absolute inset-x-4 bottom-5 z-10 mx-auto max-w-lg md:bottom-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EXPO, delay: 2.9 }}
    >
      <div className="rounded-[4px] border-2 border-ink bg-ivory p-3 text-ink shadow-hard">
        <div className="mb-1.5 flex justify-between text-xs font-extrabold uppercase tracking-wider">
          <span>For <Ticker from={50} to={58} delay={3.2} duration={1200} format={(n) => `${n}%`} /></span>
          <span className="eyebrow">The room decides</span>
          <span><Ticker from={50} to={42} delay={3.2} duration={1200} format={(n) => `${n}%`} /> Against</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-[3px] border-2 border-ink">
          <m.div
            className="h-full origin-left bg-ember"
            initial={{ scaleX: 0.5 }}
            animate={{ scaleX: 0.58 }}
            transition={{ duration: 1.2, ease: EXPO, delay: 3.2 }}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </m.div>
  </m.div>
);

/* ── Director ────────────────────────────────────────────────────────────── */

export default function CinematicIntro({ onFinish }) {
  const [scene, setScene] = useState(0);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    if (scene >= SCENES.length) {
      const t = setTimeout(finish, 450);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setScene((s) => s + 1), SCENES[scene].duration);
    return () => clearTimeout(t);
  }, [scene, finish]);

  useEffect(() => {
    const onKey = (e) => {
      if (['Escape', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  const current = SCENES[Math.min(scene, SCENES.length - 1)];

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        role="dialog"
        aria-modal="true"
        aria-label="ForReal introduction"
        className="fixed inset-0 z-[100] overflow-hidden bg-ink"
        animate={{ opacity: scene >= SCENES.length ? 0 : 1 }}
        transition={{ duration: 0.45 }}
      >
        {/* "wait" lets each scene finish exiting before the next mounts, so the
            two never compete for the same frames. */}
        <AnimatePresence mode="wait">
          {scene <= 1 && <NoiseField key="noise" phase={scene === 0 ? 'chaos' : 'question'} />}
          {scene === 2 && <IdentityScene key="identity" />}
          {scene === 3 && <CollideScene key="collide" />}
        </AnimatePresence>

        {/* Chrome: progress, scene label, skip */}
        <div className="on-ink pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4 sm:p-6">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border-2 border-ivory/15 bg-ink px-3 py-2">
            <div className="flex gap-1.5" aria-hidden="true">
              {SCENES.map((s, i) => (
                <span key={s.label} className="h-1.5 w-7 overflow-hidden rounded-full bg-ivory/20 sm:w-10">
                  <span
                    className="block h-full origin-left rounded-full bg-ember"
                    style={
                      i === scene
                        ? { animation: `progress-fill ${s.duration}ms linear forwards` }
                        : { transform: `scaleX(${i < scene ? 1 : 0})` }
                    }
                  />
                </span>
              ))}
            </div>
            <span className="eyebrow hidden text-ivory sm:inline">
              0{Math.min(scene, SCENES.length - 1) + 1} — {current.label}
            </span>
          </div>
          <button
            type="button"
            onClick={finish}
            className="pointer-events-auto rounded-full border-2 border-ivory/25 bg-ink px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-ivory hover:border-ember hover:text-ember"
          >
            Skip intro
          </button>
        </div>

        <p className="sr-only" aria-live="polite">{current.caption}</p>
      </m.div>
    </LazyMotion>
  );
}
