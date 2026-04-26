'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../../components/Button';
import {
  getMe,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type InAppNotification,
  type MeResponse,
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
  const [me, setMe] = useState<MeResponse | null>(null);
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
      const [m, data] = await Promise.all([getMe(token), listMyNotifications(token, { limit: 100 })]);
      setMe(m);
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
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Notifications</h1>
        <p className="mt-1 text-sm text-zinc-600">
          In-app messages for {me ? `${me.fullName} (${me.role})` : '…'}. Pushes and email are not
          used yet.
        </p>
      </div>
      {err ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      ) : null}
      {navErr ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {navErr}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600">
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
          <li className="text-sm text-zinc-500">No notifications.</li>
        ) : null}
        {rows.map((n) => {
          const unread = !n.readAt;
          return (
            <li
              key={n.id}
              className={
                'cursor-pointer rounded-md border p-3 text-sm ' +
                (unread ? 'border-sky-200 bg-sky-50' : 'border-zinc-200 bg-white')
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
              <div className="font-medium text-zinc-900">{n.title}</div>
              <p className="mt-1 text-zinc-700">{n.message}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {fmt(n.createdAt)} — {n.type} — click to open
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
