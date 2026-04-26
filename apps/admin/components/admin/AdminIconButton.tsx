'use client';

import { type ReactNode, type ButtonHTMLAttributes } from 'react';

export const adminIconActionClass =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200/90 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:ring-offset-0 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-200 dark:hover:bg-zinc-700/70';

const baseClass = adminIconActionClass + ' disabled:pointer-events-none disabled:opacity-45';

type Props = {
  children: ReactNode;
} & {
  'aria-label': string;
  title: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title' | 'children'>;

/**
 * Standard icon action: requires tooltip (`title`) and `aria-label` (can match)
 * for accessibility.
 */
export function AdminIconButton({
  children,
  className = '',
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={[baseClass, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Primary emphasis (e.g. Add) — same footprint as `AdminIconButton` */
export function AdminIconButtonPrimary({
  children,
  className = '',
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={[
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-500/80 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-45 dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
