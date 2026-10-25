import React, { Suspense, lazy, useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Play, X, Check } from 'lucide-react';
import useAuthStore from '@/store/useAuthStore';
import { Button, Wordmark } from '@/components/ui';
import { useReducedMotion, usePageTitle } from '@/hooks';
import { INTRO_SEEN_KEY } from '@/lib/constants';

// The intro (and framer-motion with it) is only downloaded when it plays.
const CinematicIntro = lazy(() => import('@/components/intro/CinematicIntro'));

const storage = {
  get: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Private mode or blocked storage: the intro simply plays again next time.
    }
  },
};

const RULES = ['Challenge ideas', 'Defend your opinions', 'Respect the conversation'];

const FEED = [
  'Claims without a single source',
  'Counters that reward outrage',
  'Hot takes posted and abandoned',
  'Pile-ons instead of replies',
];

const FLOOR = [
  'Every debate has a clear question and defined sides',
  'Arguments can cite evidence — some debates require it',
  'People endorse strong points, not loud ones',
  'A timer closes the debate and the vote becomes the record',
];

const STEPS = [
  { title: 'Open a question', text: 'Frame the motion, choose 2–4 sides, a category and a timer.' },
  { title: 'Take a side', text: 'Cast your vote. Changed your mind? Switch while it’s live.' },
  { title: 'Make your case', text: 'Argue for your side, cite a source, reply to the other side.' },
  { title: 'The record closes', text: 'When the clock runs out, the vote is the verdict — read-only, for good.' },
];

const Hero = ({ isAuthed, onReplay }) => (
  <section className="relative flex min-h-dvh flex-col overflow-hidden border-b-2 border-ink">
    <div className="grain pointer-events-none absolute inset-0 opacity-25" aria-hidden="true" />

    <nav className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10">
      <Link to="/" className="text-4xl" aria-label="ForReal home"><Wordmark surface="ember" /></Link>
      <div className="flex items-center gap-2">
        {isAuthed ? (
          <Button to="/debates" size="sm">Enter the arena <ArrowRight size={16} /></Button>
        ) : (
          <>
            <Button to="/login" variant="ghost" size="sm">Sign in</Button>
            <Button to="/register" size="sm">Join</Button>
          </>
        )}
      </div>
    </nav>

    <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 pb-24 pt-6 sm:px-10">
      <p className="eyebrow mb-6 animate-rise">A debate platform for meaningful conversation</p>
      <h1 className="font-display text-[clamp(3.6rem,12.5vw,11.5rem)] text-ink">
        <span className="block animate-rise [animation-delay:80ms]">Don’t just</span>
        <span className="block animate-rise [animation-delay:160ms]">post it.</span>
        <span className="font-accent block animate-rise text-[1.08em] leading-[0.95] text-ivory [animation-delay:260ms]">Defend it.</span>
      </h1>
      <p className="mt-8 max-w-2xl animate-rise text-lg font-semibold leading-relaxed text-ink [animation-delay:360ms] sm:text-xl">
        Social feeds reward whoever is loudest. ForReal rewards whoever makes the better case:
        open a question, pick a side, back it with evidence — and let the strongest argument win.
      </p>
      <div className="mt-10 flex animate-rise flex-wrap items-center gap-3 [animation-delay:460ms]">
        {isAuthed ? (
          <Button to="/debates" size="lg">Enter the arena <ArrowRight size={18} /></Button>
        ) : (
          <>
            <Button to="/register" size="lg">Join the debate <ArrowRight size={18} /></Button>
            <Button to="/login" variant="outline" size="lg">I have an account</Button>
          </>
        )}
        <button
          type="button"
          onClick={onReplay}
          className="ml-1 inline-flex items-center gap-2 text-sm font-extrabold underline decoration-2 underline-offset-4"
        >
          <Play size={15} className="fill-ink" /> Replay intro
        </button>
      </div>
    </div>

    {/* Rules marquee */}
    <div className="on-ink relative z-10 overflow-hidden border-t-2 border-ink bg-ink py-3 text-ivory" aria-hidden="true">
      <div className="flex w-max animate-[marquee_28s_linear_infinite]">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0">
            {[...RULES, ...RULES].map((rule, i) => (
              <span key={`${copy}-${i}`} className="font-display flex items-center whitespace-nowrap px-6 text-2xl">
                {rule}<span className="ml-12 text-ember">/</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Explainer = ({ isAuthed }) => (
  <>
    {/* The feed vs the floor */}
    <section className="border-b-2 border-ink bg-ivory px-5 py-20 sm:px-10 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow mb-4">Why ForReal exists</p>
        <h2 className="font-display max-w-4xl text-[clamp(2.8rem,7vw,5.5rem)]">
          The feed wants your attention. <span className="text-ember">The floor wants your reasons.</span>
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="on-ink rounded-[var(--radius-card)] border-2 border-ink bg-ink p-7 text-ivory">
            <p className="eyebrow text-ember">Social media rewards</p>
            <ul className="mt-5 space-y-4">
              {FEED.map((item) => (
                <li key={item} className="flex gap-3 text-lg font-semibold">
                  <X size={22} strokeWidth={3} className="mt-0.5 shrink-0 text-ember" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-7">
            <p className="eyebrow">ForReal rewards</p>
            <ul className="mt-5 space-y-4">
              {FLOOR.map((item) => (
                <li key={item} className="flex gap-3 text-lg font-semibold">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ember">
                    <Check size={15} strokeWidth={3.5} aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>

    {/* How it works */}
    <section className="border-b-2 border-ink px-5 py-20 sm:px-10 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow mb-4">How a debate works</p>
        <h2 className="font-display text-[clamp(2.8rem,7vw,5.5rem)]">Four steps. <span className="text-ivory">No shortcuts.</span></h2>
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="card card-interactive p-6">
              <span className="font-display text-6xl text-ember">0{i + 1}</span>
              <h3 className="mt-3 text-xl font-extrabold">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink/80">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>

    {/* House rules */}
    <section className="border-b-2 border-ink bg-ivory px-5 py-20 text-ink sm:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
        {[
          ['Challenge ideas.', 'Question the claim, never the person making it.'],
          ['Defend your opinions.', 'If you believe it, show why — with reasons and sources.'],
          ['Respect the conversation.', 'Disagree as hard as you like. Never make it personal.'],
        ].map(([rule, detail], i) => (
          <div key={rule} className="border-t-4 border-ember pt-5">
            <span className="eyebrow">Rule 0{i + 1}</span>
            <h3 className="font-display mt-2 text-4xl">{rule}</h3>
            <p className="mt-2 text-ink/75">{detail}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Final call to action */}
    <section className="px-5 py-24 text-center sm:px-10">
      <h2 className="font-display mx-auto max-w-4xl text-[clamp(3rem,9vw,7.5rem)]">
        Less noise. <span className="text-ivory">More truth.</span>
      </h2>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {isAuthed ? (
          <Button to="/debates" size="lg">Enter the arena <ArrowRight size={18} /></Button>
        ) : (
          <>
            <Button to="/register" size="lg">Create your account <ArrowRight size={18} /></Button>
            <Button to="/login" variant="outline" size="lg">Sign in</Button>
          </>
        )}
      </div>
    </section>

    <footer className="flex flex-col items-center justify-between gap-3 border-t-2 border-ink px-5 py-6 text-sm font-bold sm:flex-row sm:px-10">
      <Wordmark surface="ember" className="text-2xl" />
      <span>Challenge ideas. Defend your opinions. Respect the conversation.</span>
      <a href="https://github.com/shanmukha1013/ForReal" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
        Source on GitHub
      </a>
    </footer>
  </>
);

export default function Landing() {
  usePageTitle(null);
  const status = useAuthStore((s) => s.status);
  const reducedMotion = useReducedMotion();
  const [params, setParams] = useSearchParams();
  const replayRequested = params.get('replay') === '1';

  // First-time visitors (or anyone who asks) get the full cinematic intro.
  // Reduced-motion users get the static page immediately.
  const [playing, setPlaying] = useState(
    () => !reducedMotion && (replayRequested || !storage.get(INTRO_SEEN_KEY))
  );

  const finish = useCallback(() => {
    storage.set(INTRO_SEEN_KEY, '1');
    setPlaying(false);
    if (replayRequested) setParams({}, { replace: true });
    window.scrollTo(0, 0);
  }, [replayRequested, setParams]);

  const replay = () => {
    if (reducedMotion) return;
    window.scrollTo(0, 0);
    setPlaying(true);
  };

  if (playing) {
    return (
      <Suspense fallback={<div className="fixed inset-0 bg-ember" />}>
        <CinematicIntro onFinish={finish} />
      </Suspense>
    );
  }

  const isAuthed = status === 'authenticated';
  return (
    <div className="min-h-dvh animate-fade">
      <Hero isAuthed={isAuthed} onReplay={replay} />
      <Explainer isAuthed={isAuthed} />
    </div>
  );
}
