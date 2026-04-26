'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminErrorState } from '../../components/admin/AdminErrorState';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { AdminStatusBadge } from '../../components/admin/AdminStatusBadge';
import {
  getMe,
  listRestaurants,
  type MeResponse,
  type Restaurant,
  type RestaurantEvent,
  type RestaurantReservation,
  type ReservationStatus,
} from '../../lib/api';
import { getToken } from '../../lib/auth';
import {
  loadAllAccessibleEventNights,
  loadAllAccessibleTableReservations,
} from '../../lib/staffReservationsData';

function fmt(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString();
}

function rsvTone(
  s: ReservationStatus,
): Parameters<typeof AdminStatusBadge>[0]['tone'] {
  switch (s) {
    case 'PENDING':
    case 'HELD':
      return 'yellow';
    case 'CONFIRMED':
      return 'blue';
    case 'REJECTED':
    case 'CANCELLED':
      return 'zinc';
    case 'COMPLETED':
      return 'green';
    default:
      return 'zinc';
  }
}

type Stat = { label: string; value: number; href?: string; sub?: string };

function StatCard({ label, value, sub, href }: Stat) {
  const inner = (
    <div className="rounded-lg border border-zinc-200/90 bg-white p-3.5 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/70">
      <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
          {sub}
        </div>
      ) : null}
    </div>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block outline-none transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-amber-500/80"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function DashboardPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [tableBookings, setTableBookings] = useState<RestaurantReservation[]>(
    [],
  );
  const [eventNights, setEventNights] = useState<RestaurantEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setErr(null);
    const u = await getMe(token);
    setMe(u);
    const rlist = await listRestaurants(token);
    setRestaurants(rlist);
    if (u.role === 'RESTAURANT_ADMIN' || u.role === 'PLATFORM_ADMIN') {
      const [{ rows }, { events: evs }] = await Promise.all([
        loadAllAccessibleTableReservations(token),
        loadAllAccessibleEventNights(token),
      ]);
      setTableBookings(rows);
      setEventNights(evs);
    } else {
      setTableBookings([]);
      setEventNights([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        await load();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const stats = useMemo(() => {
    const t = tableBookings;
    const totalBookings = t.length;
    const pending = t.filter((x) => x.status === 'PENDING').length;
    const cancelled = t.filter((x) => x.status === 'CANCELLED').length;
    return { totalBookings, pending, cancelled };
  }, [tableBookings]);

  const latestTable = useMemo(() => {
    return [...tableBookings]
      .sort(
        (a, b) =>
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
      )
      .slice(0, 8);
  }, [tableBookings]);

  const latestNights = useMemo(() => {
    return [...eventNights]
      .sort(
        (a, b) =>
          new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
      )
      .slice(0, 8);
  }, [eventNights]);

  const isStaff = me && (me.role === 'RESTAURANT_ADMIN' || me.role === 'PLATFORM_ADMIN');

  if (loading) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>;
  }
  if (err) {
    return <AdminErrorState>{err}</AdminErrorState>;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Dashboard"
        description="Overview of restaurants, restaurant table bookings, and event nights in your scope."
      />

      {isStaff ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Summary
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Restaurants"
              value={restaurants.length}
              href="/dashboard/restaurants"
            />
            <StatCard
              label="Restaurant bookings"
              value={stats.totalBookings}
              sub="all statuses"
              href="/dashboard/bookings/restaurants"
            />
            <StatCard
              label="Pending (tables)"
              value={stats.pending}
              href="/dashboard/bookings/restaurants"
            />
            <StatCard
              label="Cancelled (tables)"
              value={stats.cancelled}
              href="/dashboard/bookings/restaurants"
            />
            <StatCard
              label="Event nights"
              value={eventNights.length}
              href="/dashboard/events"
            />
          </div>
        </section>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Use the menu to open the sections you have access to.
        </p>
      )}

      {isStaff && latestTable.length > 0 ? (
        <section>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Latest restaurant bookings
            </h2>
            <Link
              className="text-xs font-medium text-amber-800 underline dark:text-amber-300/90"
              href="/dashboard/bookings/restaurants"
            >
              View all
            </Link>
          </div>
          <div className="overflow-x-auto rounded-lg border border-zinc-200/90 bg-white text-sm dark:border-zinc-700/80 dark:bg-zinc-900/70">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Restaurant</th>
                  <th className="px-3 py-2">Guest</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/80">
                {latestTable.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {fmt(r.startAt)}
                    </td>
                    <td className="px-3 py-2 text-zinc-800 dark:text-zinc-100">
                      {r.restaurant.name}
                    </td>
                    <td className="px-3 py-2">
                      {r.customer.fullName} · {r.partySize}
                    </td>
                    <td className="px-3 py-2">
                      <AdminStatusBadge tone={rsvTone(r.status)}>
                        {r.status}
                      </AdminStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-500">
            <Link
              className="underline"
              href="/dashboard/bookings/restaurants"
            >
              Open restaurant bookings
            </Link>{' '}
            to confirm, reject, or change status. Event-night marketing events are
            under Event nights.
          </p>
        </section>
      ) : null}

      {isStaff && latestNights.length > 0 ? (
        <section>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Latest event nights
            </h2>
            <Link
              className="text-xs font-medium text-amber-800 underline dark:text-amber-300/90"
              href="/dashboard/events"
            >
              View all
            </Link>
          </div>
          <div className="overflow-x-auto rounded-lg border border-zinc-200/90 bg-white text-sm dark:border-zinc-700/80 dark:bg-zinc-900/70">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">Starts</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/80">
                {latestNights.map((e) => (
                  <tr key={e.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {fmt(e.startsAt)}
                    </td>
                    <td className="px-3 py-2 text-zinc-800 dark:text-zinc-100">
                      {e.title}
                    </td>
                    <td className="px-3 py-2">
                      <AdminStatusBadge
                        tone={
                          e.status === 'PENDING'
                            ? 'yellow'
                            : e.status === 'APPROVED'
                              ? 'green'
                              : 'zinc'
                        }
                      >
                        {e.status}
                      </AdminStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
