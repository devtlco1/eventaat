'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../components/Badge';
import { AdminPaginationBar } from '../../../components/AdminPaginationBar';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { getToken } from '../../../lib/auth';
import { useClientPagination } from '../../../lib/useClientPagination';
import {
  getMe,
  listUsers,
  updateUser,
  type MeResponse,
  type PlatformUser,
  type UserRole,
} from '../../../lib/api';

function fmt(dt: string): string {
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString();
}

function toBoolFilter(v: string): boolean | undefined {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}

export default function UsersPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [tab, setTab] = useState<'system' | 'mobile'>('system');
  const [q, setQ] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>(
    'all',
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const editingUser = useMemo(
    () => users.find((u) => u.id === editingId) ?? null,
    [users, editingId],
  );

  const [editForm, setEditForm] = useState<{
    fullName: string;
    phone: string;
    role: UserRole;
    isActive: boolean;
  } | null>(null);

  const isPlatformAdmin = me?.role === 'PLATFORM_ADMIN';

  useEffect(() => {
    if (!editingUser) {
      setEditForm(null);
      return;
    }
    setEditForm({
      fullName: editingUser.fullName,
      phone: editingUser.phone ?? '',
      role: editingUser.role,
      isActive: editingUser.isActive,
    });
  }, [editingUser]);

  async function refresh() {
    const token = getToken();
    if (!token) return;

    const meRes = await getMe(token);
    setMe(meRes);
    if (meRes.role !== 'PLATFORM_ADMIN') {
      setUsers([]);
      return;
    }
    const usersRes = await listUsers(token, {
      isActive: activeFilter === 'all' ? undefined : toBoolFilter(activeFilter),
    });
    setUsers(usersRes);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        await refresh();
      } catch (err) {
        const status =
          typeof err === 'object' && err && 'status' in err
            ? Number((err as any).status)
            : undefined;
        if (status === 403) {
          if (!cancelled) {
            setError('You do not have permission to view users.');
          }
        } else {
          const message =
            typeof err === 'object' && err && 'message' in err
              ? String((err as any).message)
              : 'Failed to load users';
          if (!cancelled) setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const forTab = useMemo(() => {
    if (tab === 'system') {
      return users.filter((u) => u.role !== 'CUSTOMER');
    }
    return users.filter((u) => u.role === 'CUSTOMER');
  }, [users, tab]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return forTab;
    return forTab.filter(
      (u) =>
        u.fullName.toLowerCase().includes(t) ||
        u.email.toLowerCase().includes(t) ||
        (u.phone && u.phone.toLowerCase().includes(t)),
    );
  }, [forTab, q]);

  const { page, setPage, setPageSize, pageCount, paged, total, pageSize } =
    useClientPagination(filtered);

  useEffect(() => {
    setPage(1);
  }, [tab, setPage]);

  const canSave = useMemo(() => {
    return isPlatformAdmin && !!editForm && !submitting && !!editingUser;
  }, [isPlatformAdmin, editForm, submitting, editingUser]);

  async function onSave() {
    if (!canSave || !editForm || !editingUser) return;
    const token = getToken();
    if (!token) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await updateUser(token, editingUser.id, {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
        role: editForm.role,
        isActive: editForm.isActive,
      });
      setEditingId(null);
      await refresh();
      setSuccess('User updated.');
      setTimeout(() => setSuccess(null), 2500);
    } catch (err) {
      const status =
        typeof err === 'object' && err && 'status' in err
          ? Number((err as any).status)
          : undefined;
      if (status === 403) {
        setError('Only PLATFORM_ADMIN can update users.');
      } else {
        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as any).message)
            : 'Failed to update user';
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Users</h1>
        <p className="mt-1 text-sm text-zinc-600">
          View and manage platform users (platform admins only).
        </p>
      </div>

      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {me && !isPlatformAdmin ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
          You are signed in as <span className="font-medium">{me.role}</span>.
          Access is restricted to{' '}
          <span className="font-medium">PLATFORM_ADMIN</span>.
        </div>
      ) : null}

      {isPlatformAdmin ? (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/60">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Directory
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'system' as const, label: 'System users' },
                { id: 'mobile' as const, label: 'Mobile (customers)' },
              ] as const
            ).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setTab(b.id);
                  setPage(1);
                }}
                className={[
                  'rounded-full border px-3 py-1.5 text-xs font-medium',
                  tab === b.id
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200',
                ].join(' ')}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Search name, email, or phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="…"
            />
            <div className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <div className="font-medium">Account active</div>
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { label: 'All', value: 'all' as const },
                    { label: 'Active', value: 'true' as const },
                    { label: 'Inactive', value: 'false' as const },
                  ] as const
                ).map((opt) => {
                  const on = activeFilter === opt.value;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setActiveFilter(opt.value)}
                      className={[
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        on
                          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                          : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editingUser && editForm ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-900">Edit user</div>
              <div className="text-xs text-zinc-500">{editingUser.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setEditingId(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={onSave} disabled={!canSave}>
                {submitting ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              value={editForm.fullName}
              onChange={(e) =>
                setEditForm((f) => (f ? { ...f, fullName: e.target.value } : f))
              }
            />
            <Input
              label="Phone"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm((f) => (f ? { ...f, phone: e.target.value } : f))
              }
              placeholder="+966..."
            />
            <label className="flex flex-col gap-2 text-sm text-zinc-700">
              <span className="font-medium">Role</span>
              <select
                className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-zinc-900 outline-none ring-zinc-900/10 focus:ring-4"
                value={editForm.role}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, role: e.target.value as UserRole } : f,
                  )
                }
                disabled={!isPlatformAdmin}
              >
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="RESTAURANT_ADMIN">RESTAURANT_ADMIN</option>
                <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-zinc-700">
              <span className="font-medium">Status</span>
              <select
                className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-zinc-900 outline-none ring-zinc-900/10 focus:ring-4"
                value={String(editForm.isActive)}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, isActive: e.target.value === 'true' } : f,
                  )
                }
                disabled={!isPlatformAdmin}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          </div>

          {!isPlatformAdmin ? (
            <div className="mt-4 text-sm text-zinc-600">
              Editing is restricted to PLATFORM_ADMIN.
            </div>
          ) : null}
        </div>
      ) : null}

      {isPlatformAdmin ? (
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-700/80">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            User list
          </div>
          <div className="text-xs text-zinc-500">
            {loading
              ? 'Loading…'
              : `${tab === 'system' ? 'System' : 'Mobile'} · ${total} in view (${users.length} loaded)`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">
              <tr>
                <th className="px-6 py-3">Full name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Active</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700/80">
              {loading ? (
                <tr>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400" colSpan={7}>
                    Loading users…
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400" colSpan={7}>
                    {filtered.length === 0
                      ? 'No users in this tab.'
                      : 'No rows on this page.'}
                  </td>
                </tr>
              ) : (
                paged.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                      {u.fullName}
                    </td>
                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                      {u.email}
                    </td>
                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                      {u.phone ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                      {u.role}
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={u.isActive ? 'green' : 'zinc'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                      {fmt(u.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      {isPlatformAdmin ? (
                        <Button
                          variant="secondary"
                          onClick={() => setEditingId(u.id)}
                        >
                          Edit
                        </Button>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPaginationBar
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(pageCount, p + 1))}
          total={total}
        />
      </div>
      ) : null}
    </div>
  );
}

