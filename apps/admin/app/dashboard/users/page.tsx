'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { getToken } from '../../../lib/auth';
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

  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
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
      role: roleFilter || undefined,
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
  }, [roleFilter, activeFilter]);

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
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-900">Filters</div>
            <div className="text-xs text-zinc-500">Role and active status</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 text-sm text-zinc-700">
              <div className="font-medium">Role</div>
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { label: 'All', value: '' },
                    { label: 'CUSTOMER', value: 'CUSTOMER' },
                    { label: 'RESTAURANT_ADMIN', value: 'RESTAURANT_ADMIN' },
                    { label: 'PLATFORM_ADMIN', value: 'PLATFORM_ADMIN' },
                  ] as const
                ).map((opt) => {
                  const active = roleFilter === opt.value;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setRoleFilter(opt.value as any)}
                      className={[
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 text-sm text-zinc-700">
              <div className="font-medium">Active</div>
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { label: 'All', value: 'all' },
                    { label: 'Active', value: 'true' },
                    { label: 'Inactive', value: 'false' },
                  ] as const
                ).map((opt) => {
                  const active = activeFilter === opt.value;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() =>
                        setActiveFilter(opt.value as 'all' | 'true' | 'false')
                      }
                      className={[
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50',
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
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
          <div className="text-sm font-semibold text-zinc-900">User list</div>
          <div className="text-xs text-zinc-500">
            {loading ? 'Loading…' : `${users.length} total`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
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
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-4 text-zinc-600" colSpan={7}>
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-zinc-600" colSpan={7}>
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-4 font-medium text-zinc-900">
                      {u.fullName}
                    </td>
                    <td className="px-6 py-4 text-zinc-700">{u.email}</td>
                    <td className="px-6 py-4 text-zinc-700">{u.phone ?? '—'}</td>
                    <td className="px-6 py-4 text-zinc-700">{u.role}</td>
                    <td className="px-6 py-4">
                      <Badge tone={u.isActive ? 'green' : 'zinc'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-zinc-700">
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
      </div>
      ) : null}
    </div>
  );
}

