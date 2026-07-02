// -----------------------------------------------------------------------------
// Notification System — Premium Toast & Context Provider
// -----------------------------------------------------------------------------
// Architecture:
//   • Design tokens via CSS variables / theme constants
//   • Motion variants stored in a shared variant file (simulated here)
//   • Reusable Toast component with progress bar, icon, and live pulse
//   • NotificationProvider with context, memoised methods, and portal rendering
//   • Accessibility: aria-live region, role="alert", reduced-motion support
//   • Backward‑compatible default export (Notification) for legacy use
// -----------------------------------------------------------------------------

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

// ─── Theme / Design Tokens ──────────────────────────────────
// (In a real codebase these would be imported from a tokens file)
const COLORS = {
  brand:   "#C1121F",
  success: "#C1121F",
  red:     "#ef4444",
  amber:   "#C1121F",
  blue:    "#60a5fa",
  purple:  "#a78bfa",
};

const GLOW = {
  brand:   "rgba(193,18,31,0.25)",
  success: "rgba(34,197,94,0.25)",
  red:     "rgba(239,68,68,0.25)",
  amber:   "rgba(245,158,11,0.25)",
  blue:    "rgba(96,165,250,0.25)",
  purple:  "rgba(167,139,250,0.25)",
};

const BORDER_ALPHA = 0.2;
const BG_ALPHA = 0.06;

// ─── Notification Types Configuration ────────────────────────
export const TYPES = {
  success: {
    color:   COLORS.success,
    glow:    GLOW.success,
    border:  `rgba(34,197,94,${BORDER_ALPHA})`,
    bg:      `rgba(34,197,94,${BG_ALPHA})`,
    Icon: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  error: {
    color:   COLORS.red,
    glow:    GLOW.red,
    border:  `rgba(239,68,68,${BORDER_ALPHA})`,
    bg:      `rgba(239,68,68,${BG_ALPHA})`,
    Icon: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9"  y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  warning: {
    color:   COLORS.amber,
    glow:    GLOW.amber,
    border:  `rgba(245,158,11,${BORDER_ALPHA})`,
    bg:      `rgba(245,158,11,${BG_ALPHA})`,
    Icon: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9"  x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  info: {
    color:   COLORS.blue,
    glow:    GLOW.blue,
    border:  `rgba(96,165,250,${BORDER_ALPHA})`,
    bg:      `rgba(96,165,250,${BG_ALPHA})`,
    Icon: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8"  x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  live: {
    color:   COLORS.brand,
    glow:    "rgba(193,18,31,0.3)",
    border:  `rgba(193,18,31,${BORDER_ALPHA})`,
    bg:      `rgba(193,18,31,${BG_ALPHA})`,
    Icon: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
    // Live notification gets a special pulse indicator, handled in ToastIcon
  },
  mention: {
    color:   COLORS.purple,
    glow:    GLOW.purple,
    border:  `rgba(167,139,250,${BORDER_ALPHA})`,
    bg:      `rgba(167,139,250,${BG_ALPHA})`,
    Icon: (props) => (
      <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M16 8v5a3 3 0 006 0v-1a10 10 0 10-3.92 7.94" />
      </svg>
    ),
  },
};

// ─── Animation Variants (shared) ────────────────────────────
const toastVariants = {
  initial: {
    opacity:   0,
    y:         -16,
    scale:     0.94,
    filter:    "blur(4px)",
  },
  animate: {
    opacity:   1,
    y:         0,
    scale:     1,
    filter:    "blur(0px)",
    transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity:   0,
    y:         -10,
    scale:     0.92,
    filter:    "blur(6px)",
    transition: { duration: 0.28, ease: "easeIn" },
  },
};

// Reduced‑motion variant
const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

// ─── Helper Hooks ────────────────────────────────────────────
/**
 * Detects user preference for reduced motion.
 */
const useReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(
    () => typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return prefersReduced;
};

// ─── Subcomponent: Close Icon (static) ──────────────────────
const CloseIcon = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6"  x2="6"  y2="18" />
    <line x1="6"  y1="6"  x2="18" y2="18" />
  </svg>
);

// ─── Subcomponent: ToastIcon ────────────────────────────────
const ToastIcon = ({ type, config }) => {
  if (type === "live") {
    return (
      <span className="relative flex h-2.5 w-2.5">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ background: config.color }}
        />
        <span
          className="relative inline-flex rounded-full h-2.5 w-2.5"
          style={{ background: config.color, boxShadow: `0 0 6px ${config.color}` }}
        />
      </span>
    );
  }
  const Icon = config.Icon;
  return (
    <Icon
      className="w-3.5 h-3.5"
      style={{ color: config.color, filter: `drop-shadow(0 0 4px ${config.glow})` }}
    />
  );
};

// ─── Subcomponent: ToastProgress ────────────────────────────
const ToastProgress = ({ config, progress }) => (
  <div className="relative h-0.5 w-full" style={{ background: "rgba(255,255,255,0.05)" }}>
    <div
      className="absolute left-0 top-0 bottom-0 transition-none"
      style={{
        width:      `${progress}%`,
        background: `linear-gradient(to right, ${config.color}88, ${config.color})`,
        boxShadow:  `0 0 6px ${config.glow}`,
      }}
    />
  </div>
);

// ─── Single Toast Component ─────────────────────────────────
const Toast = ({ id, notification, type = "success", duration = 4500, onDismiss }) => {
  const config        = TYPES[type] ?? TYPES.success;
  const prefersReduced = useReducedMotion();
  const [paused, setPaused]   = useState(false);
  const [progress, setProgress] = useState(100);
  const startRef      = useRef(null);
  const elapsedRef    = useRef(0);
  const rafRef        = useRef(null);

  const dismiss = useCallback(() => onDismiss(id), [id, onDismiss]);

  // Animated countdown progress bar
  useEffect(() => {
    if (duration <= 0) {return;}

    function tick(now) {
      if (!startRef.current) {startRef.current = now;}
      if (paused) {
        startRef.current = now - elapsedRef.current;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      elapsedRef.current = now - startRef.current;
      const remaining = Math.max(0, 100 - (elapsedRef.current / duration) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        dismiss();
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) {cancelAnimationFrame(rafRef.current);} };
  }, [duration, paused, dismiss]);

  const isLive = type === "live";

  return (
    <motion.div
      layout
      variants={prefersReduced ? reducedMotionVariants : toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="relative w-full max-w-sm rounded-2xl overflow-hidden cursor-default select-none"
      style={{
        background:  `rgba(8,8,8,0.95)`,
        border:      `1px solid ${config.border}`,
        boxShadow:   `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), 0 4px 16px ${config.glow}`,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Top neon stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(to right, transparent, ${config.color}, transparent)` }}
      />

      {/* Inner bg tint */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: config.bg }}
      />

      {/* Content */}
      <div className="relative flex items-start gap-3 px-4 py-3.5">
        {/* Icon wrapper */}
        <div
          className="flex-shrink-0 mt-0.5 h-7 w-7 rounded-lg grid place-items-center"
          style={{
            background: `rgba(${parseInt(config.color.slice(1,3),16)},${parseInt(config.color.slice(3,5),16)},${parseInt(config.color.slice(5,7),16)},0.12)`,
            border:     `1px solid ${config.border}`,
          }}
        >
          <ToastIcon type={type} config={config} />
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0 pt-0.5">
          {isLive && (
            <div
              className="text-[9px] font-black tracking-[3px] uppercase mb-1"
              style={{ color: config.color, fontFamily: "'Space Mono', monospace" }}
            >
              Live Debate
            </div>
          )}
          <p className="text-xs font-semibold text-zinc-100 leading-snug">
            {notification}
          </p>
        </div>

        {/* Dismiss button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={dismiss}
          aria-label="Close notification"
          className="flex-shrink-0 mt-0.5 p-1 rounded-lg text-zinc-600 hover:text-zinc-300 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-neon/50"
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* Progress bar */}
      {duration > 0 && <ToastProgress config={config} progress={progress} />}
    </motion.div>
  );
};

// ─── Notification Context ───────────────────────────────────
export const NotificationContext = createContext(null);

/**
 * NotificationProvider – wraps the app and exposes `notify` and `dismiss`.
 * Uses portal to render toasts at the top of the document body.
 */
export function NotificationProvider({ children, maxToasts = 5 }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((notification, type = "success", duration) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [
      { id, notification, type, duration: duration ?? 4500 },
      ...prev.slice(0, maxToasts - 1),
    ]);
    return id;
  }, [maxToasts]);

  // Convenience methods
  const contextValue = useMemo(() => {
    const methods = {
      notify,
      dismiss,
    };
    methods.success = (msg, dur)  => notify(msg, "success", dur);
    methods.error   = (msg, dur)  => notify(msg, "error",   dur);
    methods.warning = (msg, dur)  => notify(msg, "warning", dur);
    methods.info    = (msg, dur)  => notify(msg, "info",    dur);
    methods.live    = (msg, dur)  => notify(msg, "live",    dur ?? 6000);
    methods.mention = (msg, dur)  => notify(msg, "mention", dur);
    return methods;
  }, [notify, dismiss]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {createPortal(
        <div
          className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
          style={{ pointerEvents: "none" }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {toasts.map((toast) => (
              <div key={toast.id} style={{ pointerEvents: "auto" }}>
                <Toast {...toast} onDismiss={dismiss} />
              </div>
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </NotificationContext.Provider>
  );
}

/**
 * Custom hook to access notification context.
 * Throws if used outside provider (good practice for debugging).
 */
export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification must be used within a <NotificationProvider>.");
  }
  return ctx;
}

// ─── Legacy Default Export (backward compatibility) ─────────
/**
 * Legacy Notification component – renders a single toast standalone.
 * Prefer using NotificationProvider + useNotification for global management.
 */
export default function Notification({
  notification,
  type = "success",
  duration,
  onDismiss = () => {},
}) {
  const idRef = useRef(`toast-standalone-${Math.random().toString(36).slice(2, 9)}`);
  const id = idRef.current;

  return (
    <AnimatePresence>
      {notification && (
        <Toast
          id={id}
          notification={notification}
          type={type}
          duration={duration ?? 4500}
          onDismiss={(dismissedId) => {
            // For standalone usage we simply call onDismiss
            onDismiss();
          }}
        />
      )}
    </AnimatePresence>
  );
}