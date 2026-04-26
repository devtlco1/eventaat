'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../components/Badge';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import {
  AdminIconButton,
  AdminIconButtonPrimary,
} from '../../../components/admin/AdminIconButton';
import { AdminToolbar } from '../../../components/admin/AdminToolbar';
import { adminIconActionClass } from '../../../components/admin/AdminIconButton';
import {
  adminSelectClass,
  adminThead,
  adminTableWrap,
} from '../../../components/admin/adminShellClasses';
import {
  IconCog,
  IconEye,
  IconPlus,
  IconRefreshCw,
} from '../../../components/NavIcons';
import { AdminPaginationBar } from '../../../components/AdminPaginationBar';
import { AdminEmptyState } from '../../../components/admin/AdminEmptyState';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import {
  createRestaurant,
  getMe,
  getOperatingSettings,
  getRequestErrorMessage,
  listRestaurants,
  type CreateRestaurantInput,
  type MeResponse,
  type Restaurant,
} from '../../../lib/api';
import { getToken } from '../../../lib/auth';
import { useClientPagination } from '../../../lib/useClientPagination';

function toNumberOrUndefined(v: string): number | undefined {
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export default function RestaurantsPage() {
  const sp = useSearchParams();
  const qRest = sp.get('restaurantId')?.trim();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [accByRest, setAccByRest] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [active, setActive] = useState<'all' | 'true' | 'false'>('all');
  const [accFilter, setAccFilter] = useState<'all' | 'true' | 'false'>('all');

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    area: '',
    description: '',
    phone: '',
    latitude: '',
    longitude: '',
    isActive: true,
  });

  const canCreate = me?.role === 'PLATFORM_ADMIN';

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const [meRes, listRes] = await Promise.all([
      getMe(token),
      listRestaurants(token),
    ]);
    setMe(meRes);
    setRestaurants(listRes);
    const accMap: Record<string, boolean> = {};
    await Promise.all(
      listRes.map((r) =>
        getOperatingSettings(token, r.id)
          .then((s) => {
            accMap[r.id] = s.acceptsReservations;
          })
          .catch(() => {
            accMap[r.id] = false;
          }),
      ),
    );
    setAccByRest(accMap);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) {
          setError(getRequestErrorMessage(err, 'Failed to load restaurants'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const filtered = useMemo(() => {
    const sq = search.trim().toLowerCase();
    const cq = city.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (qRest && r.id !== qRest) return false;
      if (sq && !r.name.toLowerCase().includes(sq)) return false;
      if (cq && !r.city.toLowerCase().includes(cq)) return false;
      if (active === 'true' && !r.isActive) return false;
      if (active === 'false' && r.isActive) return false;
      if (accFilter !== 'all') {
        const want = accFilter === 'true';
        if ((accByRest[r.id] ?? false) !== want) return false;
      }
      return true;
    });
  }, [restaurants, search, city, active, accFilter, accByRest, qRest]);

  const { page, setPage, setPageSize, pageCount, paged, total, pageSize } =
    useClientPagination(filtered);

  const canSubmit =
    canCreate &&
    !submitting &&
    form.name.trim().length > 0 &&
    form.address.trim().length > 0 &&
    form.city.trim().length > 0;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const token = getToken();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: CreateRestaurantInput = {
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        description: form.description.trim() || undefined,
        phone: form.phone.trim() || undefined,
        area: form.area.trim() || undefined,
        latitude: toNumberOrUndefined(form.latitude),
        longitude: toNumberOrUndefined(form.longitude),
        isActive: form.isActive,
      };
      await createRestaurant(token, payload);
      setCreateOpen(false);
      setForm({
        name: '',
        address: '',
        city: '',
        area: '',
        description: '',
        phone: '',
        latitude: '',
        longitude: '',
        isActive: true,
      });
      setSuccess('Restaurant created.');
      setTimeout(() => setSuccess(null), 3000);
      await refresh();
    } catch (err) {
      setError(getRequestErrorMessage(err, 'Failed to create restaurant'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Restaurants"
        description="Venue records. Table bookings and event nights are managed on their own pages."
      />

      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800/50 dark:bg-green-950/40 dark:text-green-200/90">
          {success}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-200/90">
          {error}
        </div>
      ) : null}

      <AdminToolbar
        filters={
          <>
            <div className="min-w-[10rem] flex-1 sm:max-w-xs">
              <Input
                label="Search name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="…"
              />
            </div>
            <div className="w-32 min-w-[7rem]">
              <Input
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="…"
              />
            </div>
            <label className="text-sm text-zinc-800 dark:text-zinc-200">
              <span className="mb-0.5 block">Active</span>
              <select
                className={adminSelectClass + ' min-w-[7rem] text-zinc-900 dark:text-zinc-100'}
                value={active}
                onChange={(e) => setActive(e.target.value as typeof active)}
              >
                <option value="all">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <label className="text-sm text-zinc-800 dark:text-zinc-200">
              <span className="mb-0.5 block">Accepts reservations</span>
              <select
                className={adminSelectClass + ' min-w-[7rem] text-zinc-900 dark:text-zinc-100'}
                value={accFilter}
                onChange={(e) => setAccFilter(e.target.value as typeof accFilter)}
              >
                <option value="all">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          </>
        }
        actions={
          <>
            {canCreate ? (
              <AdminIconButtonPrimary
                title="Add restaurant"
                aria-label="Add restaurant"
                onClick={() => setCreateOpen(true)}
              >
                <IconPlus />
              </AdminIconButtonPrimary>
            ) : null}
            <AdminIconButton
              title="Refresh list"
              aria-label="Refresh list"
              onClick={() => void refresh()}
            >
              <IconRefreshCw />
            </AdminIconButton>
          </>
        }
      />

      {me && !canCreate ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70">
          Signed in as <span className="font-medium">{me.role}</span>. Only{' '}
          <span className="font-medium">PLATFORM_ADMIN</span> can add restaurants.
        </div>
      ) : null}

      <div className={'overflow-hidden ' + adminTableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className={adminThead}>
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Reservations</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/90 dark:divide-zinc-700/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6">
                    <AdminEmptyState>
                      {filtered.length === 0
                        ? 'No restaurants match.'
                        : 'No rows on this page.'}
                    </AdminEmptyState>
                  </td>
                </tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {r.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                      {r.city}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {r.area ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      {accByRest[r.id] == null
                        ? '—'
                        : accByRest[r.id]
                          ? 'Yes'
                          : 'No'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={r.isActive ? 'green' : 'zinc'}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-0.5">
                        <Link
                          href={`/dashboard/restaurants/${r.id}/profile`}
                          className={adminIconActionClass}
                          title="Open profile (read-only)"
                          aria-label="Open restaurant profile"
                        >
                          <IconEye />
                        </Link>
                        <Link
                          href={`/dashboard/restaurants/${r.id}/settings`}
                          className={adminIconActionClass}
                          title="Open settings (edit details)"
                          aria-label="Open restaurant settings"
                        >
                          <IconCog />
                        </Link>
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

      <Modal
        title="Add restaurant"
        open={createOpen}
        onClose={() => {
          if (!submitting) setCreateOpen(false);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-restaurant-form"
              disabled={!canSubmit}
            >
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </div>
        }
      >
        <form id="create-restaurant-form" onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="City *"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            required
          />
          <div className="sm:col-span-2">
            <Input
              label="Address *"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              required
            />
          </div>
          <Input
            label="Area"
            value={form.area}
            onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <div className="sm:col-span-2">
            <Input
              label="Description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <Input
            label="Latitude"
            value={form.latitude}
            onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
          />
          <Input
            label="Longitude"
            value={form.longitude}
            onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-zinc-800 sm:col-span-2 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((f) => ({ ...f, isActive: e.target.checked }))
              }
            />
            Active (visible to customers when approved)
          </label>
        </form>
      </Modal>
    </div>
  );
}
