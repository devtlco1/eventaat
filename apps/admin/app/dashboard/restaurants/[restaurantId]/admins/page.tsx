'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../../../components/Badge';
import { Button } from '../../../../../components/Button';
import { Input } from '../../../../../components/Input';
import {
  assignRestaurantAdmin,
  getMe,
  listRestaurantAdmins,
  listRestaurants,
  removeRestaurantAdmin,
  type MeResponse,
  type Restaurant,
  type RestaurantAdminAssignment,
} from '../../../../../lib/api';
import { getToken } from '../../../../../lib/auth';

function fmt(dt: string): string {
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString();
}

export default function RestaurantAdminsPage() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId;

  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [rows, setRows] = useState<RestaurantAdminAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState('');

  const isPlatformAdmin = me?.role === 'PLATFORM_ADMIN';

  const canSubmit = useMemo(() => {
    return (
      isPlatformAdmin &&
      !submitting &&
      userId.trim().length > 0
    );
  }, [isPlatformAdmin, submitting, userId]);

  async function refresh() {
    const token = getToken();
    if (!token) return;

    const [meRes, restaurantsRes, adminsRes] = await Promise.all([
      getMe(token),
      listRestaurants(token),
      listRestaurantAdmins(token, restaurantId),
    ]);

    setMe(meRes);
    setRestaurant(restaurantsRes.find((r) => r.id === restaurantId) ?? null);
    setRows(adminsRes);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await refresh();
      } catch (err) {
        const status =
          typeof err === 'object' && err && 'status' in err
            ? Number((err as any).status)
            : undefined;
        if (status === 403) {
          if (!cancelled) {
            setError('You do not have permission to view admins for this restaurant.');
          }
        } else {
          const message =
            typeof err === 'object' && err && 'message' in err
              ? String((err as any).message)
              : 'Failed to load admins';
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
  }, [restaurantId]);

  async function onAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const token = getToken();
    if (!token) return;

    setSubmitting(true);
    setError(null);
    try {
      await assignRestaurantAdmin(token, restaurantId, userId.trim());
      setUserId('');
      await refresh();
    } catch (err) {
      const status =
        typeof err === 'object' && err && 'status' in err
          ? Number((err as any).status)
          : undefined;
      if (status === 403) {
        setError('Only PLATFORM_ADMIN can assign admins.');
      } else {
        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as any).message)
            : 'Failed to assign admin';
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onRemove(targetUserId: string) {
    if (!isPlatformAdmin) return;
    const token = getToken();
    if (!token) return;

    setError(null);
    setRemoving((m) => ({ ...m, [targetUserId]: true }));
    try {
      await removeRestaurantAdmin(token, restaurantId, targetUserId);
      await refresh();
    } catch (err) {
      const status =
        typeof err === 'object' && err && 'status' in err
          ? Number((err as any).status)
          : undefined;
      if (status === 403) {
        setError('Only PLATFORM_ADMIN can remove admins.');
      } else {
        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as any).message)
            : 'Failed to remove admin';
        setError(message);
      }
    } finally {
      setRemoving((m) => ({ ...m, [targetUserId]: false }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/restaurants"
              className="text-sm font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 hover:decoration-zinc-500"
            >
              Restaurants
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="text-sm font-medium text-zinc-700">Admins</span>
          </div>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900">
            {restaurant ? restaurant.name : 'Restaurant admins'}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            View assigned restaurant admins. Only platform admins can assign/remove.
          </p>
        </div>
        {restaurant ? (
          <Badge tone={restaurant.isActive ? 'green' : 'zinc'}>
            {restaurant.isActive ? 'Restaurant active' : 'Restaurant inactive'}
          </Badge>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isPlatformAdmin ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <div className="text-sm font-semibold text-zinc-900">Assign admin</div>
            <div className="text-xs text-zinc-500">
              Enter a RESTAURANT_ADMIN userId (UUID).
            </div>
          </div>

          <form onSubmit={onAssign} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                required
              />
            </div>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? 'Assigning…' : 'Assign'}
            </Button>
          </form>
        </div>
      ) : me ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
          You are signed in as <span className="font-medium">{me.role}</span>.
          Assign/remove is restricted to <span className="font-medium">PLATFORM_ADMIN</span>.
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
          <div className="text-sm font-semibold text-zinc-900">Assigned admins</div>
          <div className="text-xs text-zinc-500">
            {loading ? 'Loading…' : `${rows.length} total`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-6 py-3">Full name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Assigned</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-4 text-zinc-600" colSpan={5}>
                    Loading admins…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-zinc-600" colSpan={5}>
                    No admins assigned.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.userId} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-4 font-medium text-zinc-900">
                      {r.user.fullName}
                    </td>
                    <td className="px-6 py-4 text-zinc-700">{r.user.email}</td>
                    <td className="px-6 py-4 text-zinc-700">{r.user.role}</td>
                    <td className="px-6 py-4 text-zinc-700">
                      {fmt(r.assignedAt)}
                    </td>
                    <td className="px-6 py-4">
                      {isPlatformAdmin ? (
                        <Button
                          variant="secondary"
                          onClick={() => onRemove(r.userId)}
                          disabled={!!removing[r.userId]}
                        >
                          {removing[r.userId] ? 'Removing…' : 'Remove'}
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
    </div>
  );
}

