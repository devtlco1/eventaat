'use client';

import { useEffect, useId } from 'react';

type Props = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Modal({ title, open, onClose, children, footer }: Props) {
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-zinc-900/40 dark:bg-zinc-950/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={id}
        className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h2 id={id} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          <button
            type="button"
            className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div className="px-4 py-3">{children}</div>
        {footer ? <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">{footer}</div> : null}
      </div>
    </div>
  );
}
