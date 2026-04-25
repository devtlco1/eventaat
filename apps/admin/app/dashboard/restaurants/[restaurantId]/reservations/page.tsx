'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../../../components/Badge';
import { Button } from '../../../../../components/Button';
import {
  getMe,
  listRestaurantReservations,
  listRestaurants,
  updateReservationStatus,
  type AdminReservationStatus,
  type MeResponse,
  type ReservationStatus,
  type Restaurant,
  type RestaurantReservation,
} from '../../../../../lib/api';
import { getToken } from '../../../../../lib/auth';

function statusTone(status: ReservationStatus): Parameters<typeof Badge>[0]['tone'] {
  switch (status) {
    case 'PENDING':
      return 'yellow';
    case 'HELD':
      return 'blue';
    case 'CONFIRMED':
      return 'blue';
    case 'REJECTED':
      return 'zinc';
    case 'CANCELLED':
      return 'zinc';
    case 'COMPLETED':
      return 'green';
    default:
      return 'zinc';
  }
}

function fmt(dt: string): string {
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString();
}

export default function RestaurantReservationsPage() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId;

  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reservations, setReservations] = useState<RestaurantReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const canManage = useMemo(() => {
    return me?.role === 'PLATFORM_ADMIN' || me?.role === 'RESTAURANT_ADMIN';
  }, [me?.role]);

  async function refresh() {
    const token = getToken();
    if (!token) return;

    const [meRes, restaurantsRes, reservationsRes] = await Promise.all([
      getMe(token),
      listRestaurants(token),
      listRestaurantReservations(token, restaurantId),
    ]);

    setMe(meRes);
    setRestaurant(restaurantsRes.find((r) => r.id === restaurantId) ?? null);
    setReservations(reservationsRes);
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
            setError(
              'You do not have permission to view reservations for this restaurant.',
            );
          }
        } else {
          const message =
            typeof err === 'object' && err && 'message' in err
              ? String((err as any).message)
              : 'Failed to load reservations';
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

  async function setStatus(reservationId: string, status: AdminReservationStatus) {
    const token = getToken();
    if (!token) return;
    if (!canManage) return;

    setError(null);
    setUpdating((m) => ({ ...m, [reservationId]: true }));
    try {
      await updateReservationStatus(token, restaurantId, reservationId, status);
      await refresh();
    } catch (err) {
      const code =
        typeof err === 'object' && err && 'status' in err
          ? Number((err as any).status)
          : undefined;
      if (code === 403) {
        setError(
          'You do not have permission to manage reservations for this restaurant.',
        );
      } else {
        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as any).message)
            : 'Failed to update reservation';
        setError(message);
      }
    } finally {
      setUpdating((m) => ({ ...m, [reservationId]: false }));
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
            <span className="text-sm font-medium text-zinc-700">Reservations</span>
          </div>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900">
            {restaurant ? restaurant.name : 'Restaurant reservations'}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            View and manage reservations for this restaurant.
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

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
          <div className="text-sm font-semibold text-zinc-900">Reservation list</div>
          <div className="text-xs text-zinc-500">
            {loading ? 'Loading…' : `${reservations.length} total`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Table</th>
                <th className="px-6 py-3">Party</th>
                <th className="px-6 py-3">Start</th>
                <th className="px-6 py-3">End</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Guest / seat / type</th>
                <th className="px-6 py-3">Contact & notes</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-4 text-zinc-600" colSpan={9}>
                    Loading reservations…
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-zinc-600" colSpan={9}>
                    No reservations found.
                  </td>
                </tr>
              ) : (
                reservations.map((r) => {
                  const busy = !!updating[r.id];
                  const terminal =
                    r.status === 'CANCELLED' ||
                    r.status === 'COMPLETED' ||
                    r.status === 'REJECTED';
                  const disableActions = !canManage || busy || terminal;
                  const customerLabel =
                    r.customer?.email ?? r.customerId;
                  const customerName = r.customer?.fullName;
                  const customerPhone = r.customer?.phone;
                  const tableLabel = r.table
                    ? r.table.name
                    : 'Request only';

                  return (
                    <tr key={r.id} className="hover:bg-zinc-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-900">
                          {customerLabel}
                        </div>
                        {customerName ? (
                          <div className="text-xs text-zinc-500">{customerName}</div>
                        ) : null}
                        {customerPhone ? (
                          <div className="text-xs text-zinc-500">{customerPhone}</div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-zinc-700">{tableLabel}</td>
                      <td className="px-6 py-4 text-zinc-700">{r.partySize}</td>
                      <td className="px-6 py-4 text-zinc-700">{fmt(r.startAt)}</td>
                      <td className="px-6 py-4 text-zinc-700">{fmt(r.endAt)}</td>
                      <td className="px-6 py-4">
                        <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                      </td>
                      <td className="max-w-[10rem] px-6 py-4 text-xs text-zinc-700">
                        <div className="font-medium text-zinc-800">{r.guestType}</div>
                        <div className="text-zinc-600">{r.seatingPreference}</div>
                        <div className="text-zinc-500">{r.bookingType}</div>
                      </td>
                      <td className="max-w-[14rem] px-6 py-4 text-xs text-zinc-700">
                        {r.customerPhone ? (
                          <div>
                            <span className="font-medium text-zinc-800">Phone: </span>
                            {r.customerPhone}
                          </div>
                        ) : (
                          <div className="text-zinc-400">Phone: —</div>
                        )}
                        {r.occasionNote ? (
                          <div className="mt-1 line-clamp-2" title={r.occasionNote}>
                            <span className="font-medium text-zinc-800">Occasion: </span>
                            {r.occasionNote}
                          </div>
                        ) : null}
                        {r.specialRequest ? (
                          <div className="mt-1 line-clamp-2" title={r.specialRequest}>
                            <span className="font-medium text-zinc-800">Request: </span>
                            {r.specialRequest}
                          </div>
                        ) : null}
                        {!r.occasionNote && !r.specialRequest ? (
                          <div className="mt-1 text-zinc-400">—</div>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex max-w-md flex-wrap items-center gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => setStatus(r.id, 'HELD')}
                            disabled={disableActions || r.status !== 'PENDING'}
                          >
                            Hold
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setStatus(r.id, 'CONFIRMED')}
                            disabled={
                              disableActions ||
                              (r.status !== 'PENDING' && r.status !== 'HELD')
                            }
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setStatus(r.id, 'REJECTED')}
                            disabled={disableActions || (r.status !== 'PENDING' && r.status !== 'HELD')}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setStatus(r.id, 'COMPLETED')}
                            disabled={disableActions || r.status !== 'CONFIRMED'}
                          >
                            Complete
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => setStatus(r.id, 'CANCELLED')}
                            disabled={disableActions}
                          >
                            Cancel
                          </Button>
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
    </div>
  );
}

