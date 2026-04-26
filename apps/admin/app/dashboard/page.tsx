'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  getMe,
  getReservationOperations,
  listRestaurants,
  listUsers,
  type MeResponse,
  type ReservationOperationsResponse,
  type Restaurant,
} from '../../lib/api';
import { getToken } from '../../lib/auth';

type OverviewData = {
  me: MeResponse;
  restaurants: Restaurant[];
  totalUsers: number | null;
  restaurantAdminUsers: number | null;
  reservationOperations: ReservationOperationsResponse | null;
};

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-zinc-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-500">{sub}</div> : null}
    </div>
  );
}

function QuickActionCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50/80"
    >
      <div>
        <div className="text-sm font-semibold text-zinc-900 group-hover:underline">
          {title}
        </div>
        <p className="mt-1 text-sm text-zinc-600">{description}</p>
      </div>
      <div className="mt-3 text-sm font-medium text-zinc-900">Open →</div>
    </Link>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await getMe(token);
        const restaurants = await listRestaurants(token);

        let totalUsers: number | null = null;
        let restaurantAdminUsers: number | null = null;
        if (me.role === 'PLATFORM_ADMIN') {
          const [allUsers, raUsers] = await Promise.all([
            listUsers(token),
            listUsers(token, { role: 'RESTAURANT_ADMIN' }),
          ]);
          totalUsers = allUsers.length;
          restaurantAdminUsers = raUsers.length;
        }

        let reservationOperations: ReservationOperationsResponse | null = null;
        if (me.role === 'PLATFORM_ADMIN' || me.role === 'RESTAURANT_ADMIN') {
          try {
            reservationOperations = await getReservationOperations(token);
          } catch {
            reservationOperations = null;
          }
        }

        if (cancelled) return;
        setData({
          me,
          restaurants,
          totalUsers,
          restaurantAdminUsers,
          reservationOperations,
        });
      } catch (err) {
        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load dashboard';
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isPlatformAdmin = data?.me.role === 'PLATFORM_ADMIN';
  const isRestaurantAdmin = data?.me.role === 'RESTAURANT_ADMIN';
  const restaurants = data?.restaurants ?? [];
  const activeCount = restaurants.filter((r) => r.isActive).length;
  const canViewOperations = isPlatformAdmin || isRestaurantAdmin;
  const ops = data?.reservationOperations;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Overview</h1>
        <p className="mt-1 text-sm text-zinc-600">
          A snapshot of your account and the platform.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-600">Loading overview…</div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : data ? (
        <>
          <div>
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">
              Your account
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard label="Email" value={data.me.email} />
              <StatCard label="Role" value={data.me.role} />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">
              Restaurants
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Total restaurants"
                value={data.restaurants.length}
              />
              <StatCard
                label="Active restaurants"
                value={activeCount}
                sub="Restaurants with status active"
              />
              {isPlatformAdmin && data.totalUsers !== null ? (
                <StatCard label="Total users" value={data.totalUsers} />
              ) : null}
              {isPlatformAdmin && data.restaurantAdminUsers !== null ? (
                <StatCard
                  label="Restaurant admins (users)"
                  value={data.restaurantAdminUsers}
                  sub="Users with RESTAURANT_ADMIN role"
                />
              ) : null}
            </div>
          </div>

          {canViewOperations && ops ? (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">
                Reservation work
              </h2>
              <p className="mb-3 text-sm text-zinc-600">
                Counts and pending requests across the restaurants in your
                access ({ops.scopeRestaurantCount} restaurant
                {ops.scopeRestaurantCount === 1 ? '' : 's'}).
              </p>
              <div className="mb-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Pending table"
                  value={ops.summary.pendingTableCount}
                />
                <StatCard
                  label="Pending event"
                  value={ops.summary.pendingEventCount}
                />
                <StatCard
                  label="Confirmed (24h)"
                  value={ops.summary.confirmedLast24hCount}
                  sub="By last update"
                />
                <StatCard
                  label="Rejected / cancelled (7d)"
                  value={ops.summary.rejectedOrCancelledLast7dCount}
                  sub="By last update"
                />
              </div>
            </div>
          ) : null}

          <div>
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">
              Quick actions
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {canViewOperations ? (
                <>
                  <QuickActionCard
                    href="/dashboard/operations"
                    title="Operations"
                    description="Cross-venue work queue, pending and recent, with in-row actions when applicable."
                  />
                  <QuickActionCard
                    href="/dashboard/reservations/tables"
                    title="Table reservations"
                    description="All table requests in your scope, filters, and per-row actions."
                  />
                  <QuickActionCard
                    href="/dashboard/reservations/events"
                    title="Event reservations"
                    description="Event night requests across your restaurants, confirm and reject with capacity on confirm."
                  />
                </>
              ) : null}
              <QuickActionCard
                href="/dashboard/notifications"
                title="Notifications"
                description="In-app messages with links to the related reservation when applicable."
              />
              <QuickActionCard
                href="/dashboard/restaurants"
                title="Restaurants"
                description="List venues, tables, per-restaurant detail, and admin assignments."
              />
              {isPlatformAdmin ? (
                <QuickActionCard
                  href="/dashboard/users"
                  title="Users"
                  description="View and edit users, roles, and active status."
                />
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-zinc-600">No data.</div>
      )}
    </div>
  );
}
