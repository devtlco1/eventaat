'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminEmptyState } from '../../../components/admin/AdminEmptyState';
import { AdminErrorState } from '../../../components/admin/AdminErrorState';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { AdminStatusBadge } from '../../../components/admin/AdminStatusBadge';
import { Button } from '../../../components/Button';
import {
  getMe,
  reviewRestaurantEvent,
  type MeResponse,
  type Restaurant,
  type RestaurantEvent,
  type RestaurantEventStatus,
} from '../../../lib/api';
import { getToken } from '../../../lib/auth';
import { loadAllAccessibleEventNights } from '../../../lib/staffReservationsData';

const STATUS_OPTIONS: (RestaurantEventStatus | 'ALL')[] = [
  'ALL',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];

function eventTone(
  s: RestaurantEventStatus,
): Parameters<typeof AdminStatusBadge>[0]['tone'] {
  if (s === 'PENDING') return 'yellow';
  if (s === 'APPROVED') return 'green';
  if (s === 'REJECTED' || s === 'CANCELLED') return 'zinc';
  return 'zinc';
}

function fmt(dt: string) {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleString();
}

function restaurantName(
  rlist: Restaurant[],
  restaurantId: string,
): string {
  return rlist.find((x) => x.id === restaurantId)?.name ?? '—';
}

export default function EventNightsPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [events, setEvents] = useState<RestaurantEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<RestaurantEventStatus | 'ALL'>('ALL');
  const [restFilter, setRestFilter] = useState<string>('ALL');

  const isPlatform = me?.role === 'PLATFORM_ADMIN';
  const canList = isPlatform || me?.role === 'RESTAURANT_ADMIN';

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const u = await getMe(token);
    setMe(u);
    const { restaurants: rlist, events: all } = await loadAllAccessibleEventNights(
      token,
    );
    setRestaurants(rlist);
    setEvents(all);
  }, []);

  useEffect(() => {
    (async () => {
      if (!getToken()) return;
      setLoading(true);
      setError(null);
      try {
        await load();
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Failed to load event nights',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      if (statusFilter !== 'ALL' && ev.status !== statusFilter) return false;
      if (restFilter !== 'ALL' && ev.restaurantId !== restFilter) return false;
      return true;
    });
  }, [events, restFilter, statusFilter]);

  async function doReview(
    ev: RestaurantEvent,
    s: 'APPROVED' | 'REJECTED',
  ) {
    if (!isPlatform) return;
    const token = getToken();
    if (!token) return;
    if (s === 'REJECTED') {
      const reason = window.prompt('Rejection reason (optional)');
      if (reason === null) return;
      await doReviewWithReason(ev, s, reason || undefined);
    } else {
      if (!window.confirm('Approve this event night?')) return;
      await doReviewWithReason(ev, s);
    }
  }

  async function doReviewWithReason(
    ev: RestaurantEvent,
    s: 'APPROVED' | 'REJECTED',
    rejectionReason?: string,
  ) {
    const token = getToken();
    if (!token) return;
    setUpdating((m) => ({ ...m, [ev.id]: true }));
    setError(null);
    try {
      await reviewRestaurantEvent(token, ev.restaurantId, ev.id, {
        status: s,
        ...(s === 'REJECTED' && rejectionReason?.trim()
          ? { rejectionReason: rejectionReason.trim() }
          : {}),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setUpdating((m) => {
        const n = { ...m };
        delete n[ev.id];
        return n;
      });
    }
  }

  if (!canList && me) {
    return (
      <p className="text-sm text-zinc-600">You do not have access to this view.</p>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Event nights"
        description="Planned one-off and special event nights (not the guest booking list). Customer bookings for a night are under Event bookings."
        extra={
          me && !isPlatform ? (
            <p className="mt-2 text-sm text-amber-900/90 dark:text-amber-200/85">
              PENDING event nights are approved or rejected by the platform. Open your
              venue&rsquo;s list to add or change details; this page shows every night
              you can access.
            </p>
          ) : null
        }
      />
      {error ? <AdminErrorState>{error}</AdminErrorState> : null}
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-zinc-800 dark:text-zinc-200">
          <span className="mr-2">Restaurant</span>
          <select
            className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            value={restFilter}
            onChange={(e) => setRestFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-800 dark:text-zinc-200">
          <span className="mr-2">Status</span>
          <select
            className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700/80 dark:bg-zinc-900/60">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs text-zinc-500 dark:border-zinc-700/80 dark:bg-zinc-800/80 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Restaurant</th>
              <th className="px-3 py-2">Starts / ends</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2 min-w-[10rem]">Rejection / notes</th>
              <th className="px-3 py-2">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/80">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4">
                  <AdminEmptyState>
                    No event nights for these filters.
                  </AdminEmptyState>
                </td>
              </tr>
            ) : (
              filtered.map((ev) => {
                const busy = !!updating[ev.id];
                return (
                  <tr key={ev.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                    <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      {ev.title}
                    </td>
                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                      {restaurantName(restaurants, ev.restaurantId)}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {fmt(ev.startsAt)} — {fmt(ev.endsAt)}
                    </td>
                    <td className="px-3 py-2">
                      <AdminStatusBadge tone={eventTone(ev.status)}>
                        {ev.status}
                      </AdminStatusBadge>
                    </td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {ev.isActive ? 'Yes' : 'No'}
                    </td>
                    <td className="max-w-[14rem] px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                      {ev.status === 'PENDING' && !isPlatform ? (
                        <span className="text-amber-900/90 dark:text-amber-200/85">
                          Awaiting platform review
                        </span>
                      ) : null}
                      {ev.rejectionReason ? (
                        <div className="text-red-800 dark:text-red-200/90">
                          Reject: {ev.rejectionReason}
                        </div>
                      ) : null}
                      {ev.seatsAvailableNote ? (
                        <div className="text-zinc-500">{ev.seatsAvailableNote}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <Link
                          href={`/dashboard/restaurants/${ev.restaurantId}/events`}
                          className="text-xs text-zinc-800 underline dark:text-amber-200/90"
                        >
                          Venue event nights
                        </Link>
                        {isPlatform && ev.status === 'PENDING' ? (
                          <>
                            <Button
                              variant="secondary"
                              className="!px-2 !py-0.5 !text-xs"
                              type="button"
                              disabled={busy}
                              onClick={() => doReview(ev, 'APPROVED')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="secondary"
                              className="!px-2 !py-0.5 !text-xs"
                              type="button"
                              disabled={busy}
                              onClick={() => doReview(ev, 'REJECTED')}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
