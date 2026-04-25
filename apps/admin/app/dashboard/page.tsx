'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  getMe,
  listRestaurants,
  listRestaurantReservations,
  listUsers,
  type MeResponse,
  type Restaurant,
} from '../../lib/api';
import { getToken } from '../../lib/auth';

type OverviewData = {
  me: MeResponse;
  restaurants: Restaurant[];
  totalUsers: number | null;
  restaurantAdminUsers: number | null;
  reservationsInFirstRestaurant: number | null;
  reservationSampleRestaurantId: string | null;
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

        const first = restaurants[0] ?? null;
        let reservationsInFirstRestaurant: number | null = null;
        let reservationSampleRestaurantId: string | null = first?.id ?? null;

        if (first && (me.role === 'PLATFORM_ADMIN' || me.role === 'RESTAURANT_ADMIN')) {
          try {
            const resList = await listRestaurantReservations(token, first.id);
            reservationsInFirstRestaurant = resList.length;
          } catch {
            reservationsInFirstRestaurant = null;
          }
        }

        if (cancelled) return;
        setData({
          me,
          restaurants,
          totalUsers,
          restaurantAdminUsers,
          reservationsInFirstRestaurant,
          reservationSampleRestaurantId: reservationSampleRestaurantId,
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
  const firstId = data?.reservationSampleRestaurantId ?? null;
  const canViewRestaurantReservations =
    isPlatformAdmin || isRestaurantAdmin;
  const reservationsPath =
    firstId !== null && canViewRestaurantReservations
      ? `/dashboard/restaurants/${firstId}/reservations`
      : '/dashboard/restaurants';

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

          {data.reservationsInFirstRestaurant !== null && firstId ? (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-zinc-900">
                Reservations
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  label="Reservations (sample)"
                  value={data.reservationsInFirstRestaurant}
                  sub={`For «${data.restaurants.find((r) => r.id === firstId)?.name ?? 'first restaurant'}» — total across that restaurant only`}
                />
              </div>
            </div>
          ) : null}

          <div>
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">
              Quick actions
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <QuickActionCard
                href="/dashboard/restaurants"
                title="Manage restaurants"
                description="List restaurants, tables, reservations, and admins per venue."
              />
              {isPlatformAdmin ? (
                <QuickActionCard
                  href="/dashboard/users"
                  title="Manage users"
                  description="View and edit users, roles, and active status."
                />
              ) : null}
              <QuickActionCard
                href={reservationsPath}
                title="View reservations"
                description={
                  canViewRestaurantReservations && firstId
                    ? 'Open reservations for the first restaurant in your list (sample).'
                    : 'Browse restaurants, then open reservations for a venue.'
                }
              />
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-zinc-600">No data.</div>
      )}
    </div>
  );
}
