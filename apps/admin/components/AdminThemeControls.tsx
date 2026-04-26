'use client';

import { useCallback, useLayoutEffect, useState } from 'react';
import { THEME_STORAGE_KEY } from './ThemeInitScript';

function readDark(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  return document.documentElement.classList.contains('dark');
}

function applyAndPersist(dark: boolean) {
  const root = document.documentElement;
  if (dark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
  } catch {
    /* ignore */
  }
}

export function AdminThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    setDark(readDark());
    setReady(true);
  }, []);

  const toggle = useCallback(() => {
    const next = !readDark();
    applyAndPersist(next);
    setDark(next);
  }, []);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggle}
        title={ready ? (dark ? 'Theme: dark' : 'Theme: light') : 'Theme'}
        suppressHydrationWarning
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200/90 bg-zinc-50/80 text-sm text-zinc-700 hover:bg-zinc-100/90 dark:border-zinc-600/80 dark:bg-zinc-800/50 dark:text-zinc-200"
      >
        {ready ? (dark ? '☽' : '☀') : '·'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={ready ? (dark ? 'Use light theme' : 'Use dark theme') : 'Theme'}
      suppressHydrationWarning
      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-zinc-200/90 bg-zinc-50/80 px-2 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100/90 dark:border-zinc-600/80 dark:bg-zinc-800/50 dark:text-zinc-200 dark:hover:bg-zinc-700/50"
    >
      {ready ? (
        <span className="select-none" aria-hidden>
          {dark ? '☽' : '☀'}
        </span>
      ) : null}
      <span>{ready ? (dark ? 'Dark' : 'Light') : '…'}</span>
    </button>
  );
}
