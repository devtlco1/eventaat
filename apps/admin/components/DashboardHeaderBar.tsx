'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listMyNotifications,
  markNotificationRead,
  type InAppNotification,
} from '../lib/api';
import { getToken } from '../lib/auth';
import { getNotificationAdminPath } from '../lib/reservationLinks';
import { IconBell } from './NavIcons';
import { useRouter } from 'next/navigation';

const POLL_MS = 45_000;

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function DashboardHeaderBar() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    const t = getToken();
    if (!t) return;
    try {
      const res = await listMyNotifications(t, { limit: 5 });
      setUnread(res.unreadCount);
      setItems(res.notifications);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative flex shrink-0 items-center justify-end bg-white px-3 py-2 dark:bg-zinc-900/95 md:px-4" ref={ref}>
      <div className="relative">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Notifications"
          onClick={() => setOpen((o) => !o)}
        >
          <IconBell className="h-5 w-5" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-600 px-0.5 text-[10px] font-bold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </button>
        {open ? (
          <div className="absolute right-0 top-full z-30 mt-1 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white text-left shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
            <div className="max-h-72 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-3 text-sm text-zinc-500">No recent notifications</p>
              ) : (
                <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-700/80">
                  {items.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        className="w-full cursor-pointer bg-white px-3 py-2 text-left hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80"
                        onClick={async () => {
                          const t = getToken();
                          if (t && !n.readAt) {
                            try {
                              const u = await markNotificationRead(t, n.id);
                              setItems((xs) =>
                                xs.map((x) => (x.id === u.id ? u : x)),
                              );
                              setUnread((c) => Math.max(0, c - 1));
                            } catch {
                              /* ignore */
                            }
                          }
                          setOpen(false);
                          const p = getNotificationAdminPath(n);
                          if (p) router.push(p.path);
                        }}
                      >
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {n.title}
                        </div>
                        <div className="line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                          {n.message}
                        </div>
                        <div className="mt-0.5 text-[10px] text-zinc-500">
                          {formatTime(n.createdAt)}
                          {!n.readAt ? ' · Unread' : ''}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-zinc-200 bg-zinc-50/90 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-800/50">
              <Link
                className="block w-full text-center text-xs font-medium text-amber-800 underline dark:text-amber-300/90"
                href="/dashboard/notifications"
                onClick={() => setOpen(false)}
              >
                View all
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
