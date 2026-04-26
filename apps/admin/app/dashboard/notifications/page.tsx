'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AdminEmptyState } from '../../../components/admin/AdminEmptyState';
import { AdminErrorState } from '../../../components/admin/AdminErrorState';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { Button } from '../../../components/Button';
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type InAppNotification,
} from '../../../lib/api';
import { getToken } from '../../../lib/auth';
import { getNotificationAdminPath } from '../../../lib/notificationLinks';

function fmt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [navErr, setNavErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setErr(null);
    setLoading(true);
    try {
      const data = await listMyNotifications(token, { limit: 100 });
      setRows(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markReadIfNeeded(n: InAppNotification) {
    if (n.readAt) return;
    const token = getToken();
    if (!token) return;
    const updated = await markNotificationRead(token, n.id);
    setRows((r) => r.map((x) => (x.id === updated.id ? updated : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function openNotification(n: InAppNotification) {
    setErr(null);
    setNavErr(null);
    if (!getToken()) return;
    try {
      if (!n.readAt) {
        await markReadIfNeeded(n);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to mark read');
      return;
    }
    const path = getNotificationAdminPath(n);
    if (!path) {
      setNavErr('Cannot open: missing restaurant or reservation id on this notification.');
      return;
    }
    router.push(path.path);
  }

  async function onReadAll() {
    const token = getToken();
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      setRows((r) => r.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to mark all read');
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Notifications"
        description="In-app list only. Click a row to mark read and go to the linked area when available. No email or push yet."
      />
      {err ? <AdminErrorState>{err}</AdminErrorState> : null}
      {navErr ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200/90">
          {navErr}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {unreadCount} unread
          {loading ? ' — loading' : null}
        </p>
        {unreadCount > 0 ? (
          <Button variant="secondary" type="button" onClick={() => void onReadAll()}>
            Mark all as read
          </Button>
        ) : null}
      </div>
      <ul className="space-y-2">
        {rows.length === 0 && !loading ? (
          <li>
            <AdminEmptyState>No notifications.</AdminEmptyState>
          </li>
        ) : null}
        {rows.map((n) => {
          const unread = !n.readAt;
          return (
            <li
              key={n.id}
              className={
                'cursor-pointer rounded-md border p-3 text-sm ' +
                (unread
                  ? 'border-sky-200 bg-sky-50 dark:border-sky-800/60 dark:bg-sky-950/30'
                  : 'border-zinc-200 bg-white dark:border-zinc-700/80 dark:bg-zinc-900/60')
              }
              onClick={() => void openNotification(n)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  void openNotification(n);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                {n.title}
              </div>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">{n.message}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                {fmt(n.createdAt)} — {n.type} — click to open
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
