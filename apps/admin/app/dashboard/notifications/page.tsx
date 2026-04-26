'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminFilterBar } from '../../../components/admin/AdminFilterBar';
import { adminSelectClass } from '../../../components/admin/adminShellClasses';
import { AdminEmptyState } from '../../../components/admin/AdminEmptyState';
import { AdminErrorState } from '../../../components/admin/AdminErrorState';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { AdminPaginationBar } from '../../../components/AdminPaginationBar';
import { Button } from '../../../components/Button';
import {
  getRequestErrorMessage,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type InAppNotification,
} from '../../../lib/api';
import { getToken } from '../../../lib/auth';
import { getNotificationAdminPath } from '../../../lib/reservationLinks';
import { useClientPagination } from '../../../lib/useClientPagination';

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
  const [readMode, setReadMode] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setErr(null);
    const token = getToken();
    if (!token) {
      setRows([]);
      setUnreadCount(0);
      setLoading(false);
      setErr('Not signed in. Log in again from the home page.');
      return;
    }
    setLoading(true);
    try {
      const data = await listMyNotifications(token, { limit: 100 });
      setRows(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (e) {
      setErr(
        getRequestErrorMessage(
          e,
          'Could not load notifications. Check the API URL and your session.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((n) => {
      if (readMode === 'unread' && n.readAt) return false;
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      return true;
    });
  }, [rows, readMode, typeFilter]);

  const { page, setPage, setPageSize, pageCount, paged, total, pageSize } =
    useClientPagination(filtered);

  useEffect(() => {
    setPage(1);
  }, [readMode, typeFilter, setPage]);

  const typeOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => s.add(r.type));
    return ['all', ...Array.from(s).sort()];
  }, [rows]);

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
    if (!getToken()) {
      setErr('Not signed in.');
      return;
    }
    try {
      if (!n.readAt) {
        await markReadIfNeeded(n);
      }
    } catch (e) {
      setErr(
        getRequestErrorMessage(
          e,
          'Could not mark this notification as read.',
        ),
      );
      return;
    }
    const path = getNotificationAdminPath(n);
    if (!path) {
      setNavErr(
        'This notification is missing a link target. Try again after refreshing.',
      );
      return;
    }
    router.push(path.path);
  }

  async function onReadAll() {
    const token = getToken();
    if (!token) return;
    setErr(null);
    try {
      await markAllNotificationsRead(token);
      setRows((r) =>
        r.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch (e) {
      setErr(
        getRequestErrorMessage(
          e,
          'Could not mark all as read. Try again or refresh the page.',
        ),
      );
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Notifications"
        description="Click a row to mark it read and open the linked page when a link is available."
      />
      {err && !loading ? (
        <AdminErrorState onRetry={() => void load()}>
          {err}
        </AdminErrorState>
      ) : null}
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
        {unreadCount > 0 && !err ? (
          <Button
            variant="secondary"
            type="button"
            onClick={() => void onReadAll()}
          >
            Mark all as read
          </Button>
        ) : null}
      </div>
      <AdminFilterBar>
        <label className="text-sm text-zinc-800 dark:text-zinc-200">
          <span className="mb-0.5 block">Inbox</span>
          <select
            className={adminSelectClass}
            value={readMode}
            onChange={(e) => setReadMode(e.target.value as 'all' | 'unread')}
          >
            <option value="all">All</option>
            <option value="unread">Unread only</option>
          </select>
        </label>
        <label className="text-sm text-zinc-800 dark:text-zinc-200">
          <span className="mb-0.5 block">Type</span>
          <select
            className={adminSelectClass}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'All types' : t}
              </option>
            ))}
          </select>
        </label>
      </AdminFilterBar>
      {loading && rows.length === 0 && !err ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
      ) : null}
      <ul className="space-y-2">
        {!err && !loading && rows.length === 0 ? (
          <li>
            <AdminEmptyState>No notifications yet.</AdminEmptyState>
          </li>
        ) : null}
        {!err && paged.map((n) => {
          const unread = !n.readAt;
          return (
            <li
              key={n.id}
              className={
                'cursor-pointer rounded-lg border p-3 text-sm transition-colors ' +
                (unread
                  ? 'border-sky-200/90 bg-sky-50/90 dark:border-sky-800/50 dark:bg-sky-950/30'
                  : 'border-zinc-200/90 bg-white dark:border-zinc-700/60 dark:bg-zinc-900/50')
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
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                {n.message}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {fmt(n.createdAt)} — {n.type}
              </p>
            </li>
          );
        })}
      </ul>
      {filtered.length > 0 && !err ? (
        <AdminPaginationBar
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(pageCount, p + 1))}
          total={total}
        />
      ) : null}
    </div>
  );
}
