import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export const Modal = ({ isOpen, onClose, title, description, children, footer, size = 'md', labelledBy }) => {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    // Focus the first form control (or the panel) when the dialog opens.
    const panel = panelRef.current;
    const first = panel?.querySelector('input, textarea, select') || panel?.querySelector(FOCUSABLE);
    (first || panel)?.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
      }
      if (e.key === 'Tab' && panel) {
        const nodes = [...panel.querySelectorAll(FOCUSABLE)];
        if (!nodes.length) return;
        const firstNode = nodes[0];
        const lastNode = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === firstNode) {
          e.preventDefault();
          lastNode.focus();
        } else if (!e.shiftKey && document.activeElement === lastNode) {
          e.preventDefault();
          firstNode.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const width = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink/70 animate-fade" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || 'modal-title'}
        tabIndex={-1}
        className={`card relative flex max-h-[92dvh] w-full ${width} flex-col overflow-hidden rounded-b-none animate-rise sm:rounded-b-[var(--radius-card)] shadow-hard-lg`}
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-ink px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={labelledBy || 'modal-title'} className="font-display text-3xl">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink/70">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border-2 border-transparent hover:border-ink"
            aria-label="Close dialog"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t-2 border-ink px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};
