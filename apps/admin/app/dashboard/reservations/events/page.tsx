'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../../components/Badge';
import { Button } from '../../../../components/Button';
import {
  getMe,
  type AdminEventReservation,
  type EventReservationStatus,
  type MeResponse,
  type Restaurant,
  updateEventReservationStatus,
} from '../../../../lib/api';
import { getToken } from '../../../../lib/auth';
import {
  globalEventReservationsPath,
  perRestaurantEventReservationsPath,
} from '../../../../lib/reservationLinks';
import { loadAllAccessibleEventReservations } from '../../../../lib/staffReservationsData';

const STATUS_FILTER: (EventReservationStatus | 'ALL')[] = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
];

function eventStatusTone(
  s: EventReservationStatus,
): 'green' | 'zinc' | 'yellow' | 'red' {
  if (s === 'CONFIRMED') return 'green';
  if (s === 'PENDING') return 'yellow';
  if (s === 'REJECTED' || s === 'CANCELLED') return 'red';
  return 'zinc';
}

function fmt(dt: string) {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleString();
}

export default function GlobalEventReservationsPage() {
  const sp = useSearchParams();
  const highlightId = sp.get('eventReservationId')?.trim() || undefined;
  const qRest = sp.get('restaurantId')?.trim();
  const qEvent = sp.get('eventId')?.trim();

  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [rows, setRows] = useState<AdminEventReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [restFilter, setRestFilter] = useState<string>(qRest || 'ALL');
  const [eventFilter, setEventFilter] = useState<string>(qEvent || 'ALL');
  const [statusFilter, setStatusFilter] = useState<
    EventReservationStatus | 'ALL'
  >('ALL');

  const canManage = me?.role === 'PLATFORM_ADMIN' || me?.role === 'RESTAURANT_ADMIN';

  const eventOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      m.set(r.eventId, r.event.title);
    }
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const [meRes, { restaurants: rlist, rows: all }] = await Promise.all([
      getMe(token),
      loadAllAccessibleEventReservations(token),
    ]);
    setMe(meRes);
    setRestaurants(rlist);
    setRows(all);
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
            : 'Failed to load event reservations',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (restFilter !== 'ALL' && r.restaurantId !== restFilter) return false;
      if (eventFilter !== 'ALL' && r.eventId !== eventFilter) return false;
      return true;
    });
  }, [rows, restFilter, eventFilter, statusFilter]);

  useEffect(() => {
    if (loading || !highlightId) return;
    const t = setTimeout(() => {
      document
        .getElementById(`admin-event-resv-${highlightId}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(t);
  }, [loading, highlightId, filtered.length]);

  async function setStatus(
    restaurantId: string,
    id: string,
    status: 'CONFIRMED' | 'REJECTED',
    rejectionReason?: string,
  ) {
    const token = getToken();
    if (!token || !canManage) return;
    setError(null);
    setUpdating((m) => ({ ...m, [id]: true }));
    try {
      await updateEventReservationStatus(token, restaurantId, id, {
        status,
        ...(status === 'REJECTED' && rejectionReason?.trim()
          ? { rejectionReason: rejectionReason.trim() }
          : {}),
      });
      await refresh();
    } catch (err) {
      const code =
        typeof err === 'object' && err && 'status' in err
          ? Number((err as { status: number }).status)
          : undefined;
      if (code === 403) {
        setError('You do not have permission to update this request.');
        return;
      }
      if (code === 422) {
        setError(
          typeof err === 'object' && err && 'message' in err
            ? String((err as { message: string }).message)
            : 'Request could not be processed (e.g. capacity).',
        );
        return;
      }
      setError(
        err instanceof Error ? err.message : 'Failed to update reservation',
      );
    } finally {
      setUpdating((m) => {
        const n = { ...m };
        delete n[id];
        return n;
      });
    }
  }

  function onReject(restaurantId: string, id: string) {
    const reason = window.prompt('Rejection reason (optional)');
    if (reason === null) return;
    void setStatus(restaurantId, id, 'REJECTED', reason || undefined);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Event reservations
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Event night booking requests. Table bookings are separate:{' '}
          <Link
            className="font-medium text-zinc-800 underline"
            href="/dashboard/reservations/tables"
          >
            Table reservations
          </Link>
          . Capacity is enforced on confirm in the API.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {highlightId ? (
        <p className="text-xs text-amber-900/90">
          Row <code className="text-zinc-700">{highlightId}</code> —{' '}
          <Link className="font-medium underline" href="/dashboard/reservations/events">
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
          <span className="mr-2">Event</span>
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="ALL">All</option>
            {eventOptions.map(([eid, title]) => (
              <option key={eid} value={eid}>
                {title}
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
              setStatusFilter(e.target.value as EventReservationStatus | 'ALL')
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
              <th className="px-3 py-2">Event</th>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Party</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Note / reason</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-4 text-zinc-600">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-4 text-zinc-600">
                  No rows match the filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const busy = !!updating[r.id];
                return (
                  <tr
                    key={r.id}
                    id={`admin-event-resv-${r.id}`}
                    className={
                      highlightId === r.id
                        ? 'bg-amber-50/70 ring-1 ring-amber-300'
                        : 'hover:bg-zinc-50/80'
                    }
                  >
                    <td className="px-3 py-2 align-top text-xs">
                      <span className="font-semibold">EVENT</span>
                      <div className="mt-0.5 break-all text-[10px] text-zinc-500">
                        {r.id}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-zinc-800">
                      {r.restaurant.name}
                      <div>
                        <Link
                          className="text-xs text-zinc-600 underline"
                          href={perRestaurantEventReservationsPath(r.restaurantId)}
                        >
                          Venue list
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-2 max-w-[10rem] text-zinc-800">
                      {r.event.title}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-600">
                      {fmt(r.event.startsAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div>{r.customer.fullName}</div>
                      <div className="text-xs text-zinc-500">{r.customer.email}</div>
                    </td>
                    <td className="px-3 py-2">{r.partySize}</td>
                    <td className="px-3 py-2">
                      <Badge tone={eventStatusTone(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="max-w-[12rem] px-3 py-2 text-xs text-zinc-600">
                      {r.note || r.specialRequest || '—'}
                      {r.rejectionReason ? (
                        <div className="text-amber-900/90">Reject: {r.rejectionReason}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {r.status === 'PENDING' && canManage ? (
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="secondary"
                            className="!px-2 !py-1 !text-xs"
                            disabled={busy}
                            onClick={() => {
                              if (!window.confirm('Confirm this event reservation?'))
                                return;
                              void setStatus(
                                r.restaurantId,
                                r.id,
                                'CONFIRMED',
                              );
                            }}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="secondary"
                            className="!px-2 !py-1 !text-xs"
                            disabled={busy}
                            onClick={() => onReject(r.restaurantId, r.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
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
