'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../components/Badge';
import { AdminPaginationBar } from '../../../components/AdminPaginationBar';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import {
  AdminIconButton,
  AdminIconButtonPrimary,
} from '../../../components/admin/AdminIconButton';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { AdminToolbar } from '../../../components/admin/AdminToolbar';
import {
  adminInputClass,
  adminSelectClass,
  adminThead,
} from '../../../components/admin/adminShellClasses';
import {
  IconEye,
  IconCheck,
  IconPencil,
  IconPlus,
  IconRefreshCw,
  IconUserSlash,
} from '../../../components/NavIcons';
import { getToken } from '../../../lib/auth';
import { useClientPagination } from '../../../lib/useClientPagination';
import {
  createUser,
  getMe,
  getRequestErrorMessage,
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
  const [viewUser, setViewUser] = useState<PlatformUser | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'RESTAURANT_ADMIN' as UserRole,
  });

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

  const refresh = useCallback(async () => {
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
  }, [activeFilter]);

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
            ? Number((err as { status: number }).status)
            : undefined;
        if (status === 403) {
          if (!cancelled) {
            setError('You do not have permission to view users.');
          }
        } else {
          if (!cancelled) {
            setError(getRequestErrorMessage(err, 'Failed to load users'));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh]);

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

  function openAdd() {
    setAddErr(null);
    setAddForm((f) => ({
      ...f,
      email: '',
      password: '',
      fullName: '',
      phone: '',
      role: tab === 'mobile' ? 'CUSTOMER' : 'RESTAURANT_ADMIN',
    }));
    setAddOpen(true);
  }

  async function submitAdd() {
    const token = getToken();
    if (!token || !isPlatformAdmin) return;
    setAddErr(null);
    if (!addForm.email.trim() || !addForm.password || !addForm.fullName.trim()) {
      setAddErr('Email, password, and full name are required.');
      return;
    }
    if (addForm.password.length < 8) {
      setAddErr('Password must be at least 8 characters.');
      return;
    }
    setAddBusy(true);
    try {
      await createUser(token, {
        email: addForm.email.trim().toLowerCase(),
        password: addForm.password,
        fullName: addForm.fullName.trim(),
        phone: addForm.phone.trim() || undefined,
        role: tab === 'mobile' ? 'CUSTOMER' : addForm.role,
      });
      setAddOpen(false);
      setSuccess('User created.');
      setTimeout(() => setSuccess(null), 2500);
      await refresh();
    } catch (e) {
      setAddErr(getRequestErrorMessage(e, 'Could not create user.'));
    } finally {
      setAddBusy(false);
    }
  }

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
          ? Number((err as { status: number }).status)
          : undefined;
      if (status === 403) {
        setError('Only PLATFORM_ADMIN can update users.');
      } else {
        setError(getRequestErrorMessage(err, 'Failed to update user'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActiveRow(u: PlatformUser) {
    const token = getToken();
    if (!token) return;
    setError(null);
    try {
      await updateUser(token, u.id, { isActive: !u.isActive });
      await refresh();
      setSuccess(!u.isActive ? 'User activated.' : 'User deactivated.');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(getRequestErrorMessage(err, 'Update failed.'));
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="System accounts and mobile customers. Platform admin only."
      />

      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800/50 dark:bg-green-950/35 dark:text-green-200/90">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/35 dark:text-red-200/90">
          {error}
        </div>
      ) : null}

      {me && !isPlatformAdmin ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/60">
          You are signed in as <span className="font-medium">{me.role}</span>.
          Access is restricted to{' '}
          <span className="font-medium">PLATFORM_ADMIN</span>.
        </div>
      ) : null}

      {isPlatformAdmin ? (
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="User directory"
        >
          {(
            [
              { id: 'system' as const, label: 'System users' },
              { id: 'mobile' as const, label: 'Mobile (customers)' },
            ] as const
          ).map((b) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={tab === b.id}
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
      ) : null}

      {isPlatformAdmin ? (
        <AdminToolbar
          filters={
            <>
              <div className="min-w-[10rem] max-w-md flex-1 sm:min-w-[14rem]">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Search
                </label>
                <input
                  className={adminInputClass + ' mt-0.5 w-full'}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Name, email, phone"
                  type="search"
                />
              </div>
              <div>
                <span className="mb-0.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Active
                </span>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      { label: 'All', value: 'all' as const },
                      { label: 'Yes', value: 'true' as const },
                      { label: 'No', value: 'false' as const },
                    ] as const
                  ).map((opt) => {
                    const on = activeFilter === opt.value;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setActiveFilter(opt.value)}
                        className={[
                          'h-8 rounded-md border px-2.5 text-xs font-medium',
                          on
                            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900'
                            : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          }
          actions={
            <>
              <AdminIconButtonPrimary
                title="Add member"
                aria-label="Add member"
                onClick={openAdd}
              >
                <IconPlus />
              </AdminIconButtonPrimary>
              <AdminIconButton
                title="Refresh list"
                aria-label="Refresh list"
                onClick={() => void refresh()}
                disabled={loading}
              >
                <IconRefreshCw
                  className={loading ? 'animate-spin' : undefined}
                />
              </AdminIconButton>
            </>
          }
        />
      ) : null}

      {editingUser && editForm ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Edit user
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {editingUser.email}
              </div>
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
              placeholder="+966…"
            />
            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-200">
              <span className="font-medium">Role</span>
              <select
                className={adminSelectClass + ' w-full text-zinc-900 dark:text-zinc-100'}
                value={editForm.role}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, role: e.target.value as UserRole } : f,
                  )
                }
              >
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="RESTAURANT_ADMIN">RESTAURANT_ADMIN</option>
                <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-200">
              <span className="font-medium">Status</span>
              <select
                className={adminSelectClass + ' w-full text-zinc-900 dark:text-zinc-100'}
                value={String(editForm.isActive)}
                onChange={(e) =>
                  setEditForm((f) =>
                    f ? { ...f, isActive: e.target.value === 'true' } : f,
                  )
                }
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
          </div>
        </div>
      ) : null}

      <Modal
        open={!!viewUser}
        title="User details"
        onClose={() => setViewUser(null)}
        footer={
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setViewUser(null)}>
              Close
            </Button>
          </div>
        }
      >
        {viewUser ? (
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-[6rem_1fr] sm:gap-x-2">
            <dt className="text-zinc-500 dark:text-zinc-400">Name</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{viewUser.fullName}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
            <dd className="break-all">{viewUser.email}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Phone</dt>
            <dd>{viewUser.phone ?? '—'}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Role</dt>
            <dd>{viewUser.role}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Active</dt>
            <dd>{viewUser.isActive ? 'Yes' : 'No'}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Created</dt>
            <dd>{fmt(viewUser.createdAt)}</dd>
          </dl>
        ) : null}
      </Modal>

      <Modal
        open={addOpen}
        title="Add member"
        onClose={() => {
          if (!addBusy) setAddOpen(false);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={addBusy}
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={addBusy} onClick={() => void submitAdd()}>
              {addBusy ? 'Creating…' : 'Create'}
            </Button>
          </div>
        }
      >
        {addErr ? (
          <p className="mb-2 text-sm text-red-600 dark:text-red-300/90">{addErr}</p>
        ) : null}
        <div className="space-y-3 text-sm text-zinc-800 dark:text-zinc-200">
          <div>
            <span className="mb-0.5 block text-xs font-medium">Email *</span>
            <input
              className={adminInputClass + ' w-full'}
              value={addForm.email}
              onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="off"
            />
          </div>
          <div>
            <span className="mb-0.5 block text-xs font-medium">Password * (min 8)</span>
            <input
              className={adminInputClass + ' w-full'}
              type="password"
              value={addForm.password}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, password: e.target.value }))
              }
            />
          </div>
          <div>
            <span className="mb-0.5 block text-xs font-medium">Full name *</span>
            <input
              className={adminInputClass + ' w-full'}
              value={addForm.fullName}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, fullName: e.target.value }))
              }
            />
          </div>
          <div>
            <span className="mb-0.5 block text-xs font-medium">Phone</span>
            <input
              className={adminInputClass + ' w-full'}
              value={addForm.phone}
              onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          {tab === 'system' ? (
            <label className="block">
              <span className="mb-0.5 block text-xs font-medium">Role *</span>
              <select
                className={adminSelectClass + ' w-full'}
                value={addForm.role}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    role: e.target.value as UserRole,
                  }))
                }
              >
                <option value="RESTAURANT_ADMIN">RESTAURANT_ADMIN</option>
                <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>
              </select>
            </label>
          ) : (
            <p className="text-xs text-zinc-500">New account will be role CUSTOMER.</p>
          )}
        </div>
      </Modal>

      {isPlatformAdmin ? (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/50">
          <div className="border-b border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
            {loading
              ? 'Loading…'
              : `${tab === 'system' ? 'System' : 'Mobile'} · ${total} in this tab (of ${users.length} loaded)`}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className={adminThead}>
                <tr>
                  <th className="px-4 py-3">Full name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/90 dark:divide-zinc-700/60">
                {loading ? (
                  <tr>
                    <td
                      className="px-4 py-4 text-zinc-600 dark:text-zinc-400"
                      colSpan={7}
                    >
                      Loading…
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-4 text-zinc-600 dark:text-zinc-400"
                      colSpan={7}
                    >
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
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {u.fullName}
                      </td>
                      <td className="max-w-[10rem] truncate px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {u.email}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {u.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {u.role}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={u.isActive ? 'green' : 'zinc'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {fmt(u.createdAt)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-0.5">
                          <AdminIconButton
                            title="View details"
                            aria-label="View user details"
                            onClick={() => setViewUser(u)}
                          >
                            <IconEye />
                          </AdminIconButton>
                          <AdminIconButton
                            title="Edit"
                            aria-label="Edit user"
                            onClick={() => setEditingId(u.id)}
                          >
                            <IconPencil />
                          </AdminIconButton>
                          <AdminIconButton
                            title={
                              u.isActive ? 'Deactivate user' : 'Activate user'
                            }
                            aria-label={
                              u.isActive ? 'Deactivate user' : 'Activate user'
                            }
                            onClick={() => void toggleActiveRow(u)}
                          >
                            {u.isActive ? <IconUserSlash /> : <IconCheck />}
                          </AdminIconButton>
                        </div>
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
