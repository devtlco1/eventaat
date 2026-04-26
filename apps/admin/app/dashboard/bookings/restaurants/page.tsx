'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../../components/Badge';
import { Button } from '../../../../components/Button';
import {
  getMe,
  type AdminReservationStatus,
  type MeResponse,
  type ReservationStatus,
  type Restaurant,
  type RestaurantReservation,
  updateReservationStatus,
} from '../../../../lib/api';
import { getToken } from '../../../../lib/auth';
import {
  globalTableReservationsPath,
  perRestaurantTableReservationsPath,
} from '../../../../lib/reservationLinks';
import { loadAllAccessibleTableReservations } from '../../../../lib/staffReservationsData';

const STATUS_FILTER: (ReservationStatus | 'ALL')[] = [
  'ALL',
  'PENDING',
  'HELD',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
];

function statusTone(
  status: ReservationStatus,
): Parameters<typeof Badge>[0]['tone'] {
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

function fmt(dt: string) {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleString();
}

export default function GlobalTableReservationsPage() {
  const sp = useSearchParams();
  const highlightReservationId = sp.get('reservationId')?.trim() || undefined;
  const qRest = sp.get('restaurantId')?.trim();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [reservations, setReservations] = useState<RestaurantReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [restFilter, setRestFilter] = useState<string>(qRest || 'ALL');
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'ALL'>('ALL');

  const canManage = me?.role === 'PLATFORM_ADMIN' || me?.role === 'RESTAURANT_ADMIN';

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const u = await getMe(token);
    setMe(u);
    const { restaurants: restList, rows } = await loadAllAccessibleTableReservations(
      token,
    );
    setRestaurants(restList);
    setReservations(rows);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await refresh();
      } catch (err) {
        setError(
          typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load reservations',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (restFilter !== 'ALL' && r.restaurant.id !== restFilter) return false;
      return true;
    });
  }, [reservations, restFilter, statusFilter]);

  useEffect(() => {
    if (loading || !highlightReservationId) return;
    const t = setTimeout(() => {
      document
        .getElementById(`admin-table-resv-${highlightReservationId}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(t);
  }, [loading, highlightReservationId, filtered.length]);

  async function setStatus(
    restaurantId: string,
    reservationId: string,
    status: AdminReservationStatus,
    note?: string,
  ) {
    const token = getToken();
    if (!token || !canManage) return;
    setError(null);
    setUpdating((m) => ({ ...m, [reservationId]: true }));
    try {
      await updateReservationStatus(
        token,
        restaurantId,
        reservationId,
        status,
        note,
      );
      await refresh();
    } catch (err) {
      const code =
        typeof err === 'object' && err && 'status' in err
          ? Number((err as { status: number }).status)
          : undefined;
      setError(
        code === 403
          ? 'No permission to update this restaurant.'
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: string }).message)
            : 'Update failed',
      );
    } finally {
      setUpdating((m) => ({ ...m, [reservationId]: false }));
    }
  }

  function rejectWithPrompt(restaurantId: string, reservationId: string) {
    const note =
      typeof window === 'undefined'
        ? null
        : window.prompt('Rejection reason (optional)');
    if (note === null) return;
    void setStatus(restaurantId, reservationId, 'REJECTED', note || undefined);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Restaurant bookings
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Regular table reservation requests. Event night guest lists are
          under{' '}
          <Link
            href="/dashboard/bookings/events"
            className="font-medium text-zinc-800 underline"
          >
            Event bookings
          </Link>
          .
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {highlightReservationId ? (
        <p className="text-xs text-amber-900/90">
          Row{' '}
          <code className="text-zinc-700">{highlightReservationId}</code>{' '}
          highlighted —{' '}
          <Link
            className="font-medium underline"
            href="/dashboard/bookings/restaurants"
          >
            Clear
          </Link>
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-zinc-700">
          <span className="mr-2">Restaurant</span>
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
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
        <label className="text-sm text-zinc-700">
          <span className="mr-2">Status</span>
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ReservationStatus | 'ALL')
            }
          >
            {STATUS_FILTER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={refresh}>
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Type / ID</th>
              <th className="px-3 py-2">Restaurant</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Party</th>
              <th className="px-3 py-2">Window</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Note / reason</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {loading ? (
              <tr>
                <td className="px-3 py-4 text-zinc-600" colSpan={8}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-zinc-600" colSpan={8}>
                  No reservations match the filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const busy = !!updating[r.id];
                const terminal =
                  r.status === 'CANCELLED' ||
                  r.status === 'COMPLETED' ||
                  r.status === 'REJECTED';
                const canCancelThis =
                  r.status === 'PENDING' ||
                  r.status === 'HELD' ||
                  r.status === 'CONFIRMED';
                const disableActions = !canManage || busy || terminal;
                const history = r.statusHistory ?? [];
                return (
                  <Fragment key={r.id}>
                    <tr
                      id={`admin-table-resv-${r.id}`}
                      className={
                        highlightReservationId === r.id
                          ? 'bg-amber-50/70 ring-1 ring-amber-300'
                          : 'hover:bg-zinc-50/80'
                      }
                    >
                      <td className="px-3 py-2 align-top text-xs">
                        <span className="font-semibold">TABLE</span>
                        <div className="mt-0.5 break-all text-[10px] text-zinc-500">
                          {r.id}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-zinc-800">
                        {r.restaurant.name}
                        <div>
                          <Link
                            className="text-xs text-zinc-600 underline"
                            href={perRestaurantTableReservationsPath(
                              r.restaurantId,
                            )}
                          >
                            Venue list
                          </Link>
                        </div>
                        <div>
                          <Link
                            className="text-xs text-zinc-500 underline"
                            href={globalTableReservationsPath({
                              restaurantId: r.restaurantId,
                              reservationId: r.id,
                            })}
                          >
                            Link
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="text-zinc-900">{r.customer.fullName}</div>
                        <div className="text-xs text-zinc-500">
                          {r.customer.email}
                        </div>
                      </td>
                      <td className="px-3 py-2">{r.partySize}</td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {fmt(r.startAt)} — {fmt(r.endAt)}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                      </td>
                      <td className="max-w-[12rem] px-3 py-2 text-xs text-zinc-600">
                        {r.note || r.specialRequest || '—'}
                        {r.rejectionReason ? (
                          <div className="mt-0.5 text-amber-900/90">
                            Reject: {r.rejectionReason}
                          </div>
                        ) : null}
                        {r.cancellationReason ? (
                          <div className="text-zinc-500">
                            Cancel: {r.cancellationReason}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex max-w-xs flex-col gap-1">
                          <div className="flex flex-wrap gap-1">
                            <Button
                              variant="secondary"
                              onClick={() => setStatus(r.restaurantId, r.id, 'HELD')}
                              disabled={disableActions || r.status !== 'PENDING'}
                            >
                              Hold
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() =>
                                setStatus(r.restaurantId, r.id, 'CONFIRMED')
                              }
                              disabled={
                                disableActions ||
                                (r.status !== 'PENDING' && r.status !== 'HELD')
                              }
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => rejectWithPrompt(r.restaurantId, r.id)}
                              disabled={
                                disableActions ||
                                (r.status !== 'PENDING' && r.status !== 'HELD')
                              }
                            >
                              Reject
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => setStatus(r.restaurantId, r.id, 'CANCELLED')}
                              disabled={disableActions || !canCancelThis}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() =>
                                setStatus(r.restaurantId, r.id, 'COMPLETED')
                              }
                              disabled={disableActions || r.status !== 'CONFIRMED'}
                            >
                              Complete
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {history.length > 0 ? (
                      <tr className="bg-zinc-50/50">
                        <td colSpan={8} className="px-3 py-1">
                          <details>
                            <summary className="cursor-pointer text-xs text-zinc-600">
                              History ({history.length})
                            </summary>
                            <ul className="mt-1 list-none text-xs text-zinc-500">
                              {history.map((h) => (
                                <li key={h.id}>
                                  {fmt(h.createdAt)}: {h.fromStatus ?? '—'} →{' '}
                                  {h.toStatus}
                                  {h.note ? ` · ${h.note}` : ''}
                                </li>
                              ))}
                            </ul>
                          </details>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
