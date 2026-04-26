'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminEmptyState } from '../../../../components/admin/AdminEmptyState';
import { AdminErrorState } from '../../../../components/admin/AdminErrorState';
import { AdminPageHeader } from '../../../../components/admin/AdminPageHeader';
import { AdminStatusBadge } from '../../../../components/admin/AdminStatusBadge';
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
  const [rowError, setRowError] = useState<Record<string, string | undefined>>(
    {},
  );
  const [restFilter, setRestFilter] = useState<string>(qRest || 'ALL');
  const [eventFilter, setEventFilter] = useState<string>(qEvent || 'ALL');
  const [statusFilter, setStatusFilter] = useState<
    EventReservationStatus | 'ALL'
  >('ALL');
  const [missingHighlight, setMissingHighlight] = useState(false);
  const deepLinkTuned = useRef(false);

  const canManage = me?.role === 'PLATFORM_ADMIN' || me?.role === 'RESTAURANT_ADMIN';

  const eventOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) {
      m.set(
        r.eventId,
        r.event?.title ?? `Event ${r.eventId.slice(0, 8)}…`,
      );
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
            : 'Failed to load event bookings',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  useEffect(() => {
    if (loading || !rows.length) return;
    if (!highlightId) {
      deepLinkTuned.current = false;
      setMissingHighlight(false);
      return;
    }
    if (deepLinkTuned.current) return;
    const found = rows.find((r) => r.id === highlightId);
    if (found) {
      setRestFilter(found.restaurantId);
      setEventFilter(found.eventId);
      setStatusFilter('ALL');
      setMissingHighlight(false);
    } else {
      setMissingHighlight(true);
    }
    deepLinkTuned.current = true;
  }, [loading, highlightId, rows]);

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
  }, [loading, highlightId, filtered.length, rows.length]);

  async function setStatus(
    restaurantId: string,
    id: string,
    status: 'CONFIRMED' | 'REJECTED',
    rejectionReason?: string,
  ) {
    const token = getToken();
    if (!token || !canManage) return;
    setError(null);
    setRowError((m) => ({ ...m, [id]: undefined }));
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
        setRowError((m) => ({
          ...m,
          [id]: 'You do not have permission to update this request.',
        }));
        return;
      }
      if (code === 422) {
        setRowError((m) => ({
          ...m,
          [id]:
            (typeof err === 'object' &&
              err &&
              'message' in err &&
              String((err as { message: string }).message)) ||
            'Capacity or another rule blocked this change.',
        }));
        return;
      }
      setRowError((m) => ({
        ...m,
        [id]:
          err instanceof Error
            ? err.message
            : 'Failed to update the booking',
      }));
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
      <AdminPageHeader
        title="Event bookings"
        description="Guest bookings for an approved event night. Table seating requests are under Restaurant bookings."
        extra={
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-500">
            <Link
              href="/dashboard/bookings/restaurants"
              className="font-medium text-zinc-800 underline dark:text-amber-200/90"
            >
              Open Restaurant bookings
            </Link>
          </p>
        }
      />

      {error ? <AdminErrorState>{error}</AdminErrorState> : null}

      {highlightId && !loading ? (
        <p
          className={[
            'text-xs',
            missingHighlight
              ? 'text-amber-900 dark:text-amber-200/90'
              : 'text-amber-900/90 dark:text-amber-200/90',
          ].join(' ')}
        >
          {missingHighlight
            ? 'The linked event booking is not in your list (wrong account or it no longer exists).'
            : 'A row is highlighted from the link.'}{' '}
          <Link
            className="font-medium underline"
            href="/dashboard/bookings/events"
          >
            Clear link
          </Link>
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-zinc-700 dark:text-zinc-200">
          <span className="mr-2">Restaurant</span>
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
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
        <label className="text-sm text-zinc-700 dark:text-zinc-200">
          <span className="mr-2">Event night</span>
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
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
        <label className="text-sm text-zinc-700 dark:text-zinc-200">
          <span className="mr-2">Status</span>
          <select
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
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

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/60">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-800/80 dark:text-zinc-400">
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
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700/80">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-4 text-zinc-600 dark:text-zinc-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-4">
                  <AdminEmptyState>
                    No event bookings match the filters.
                  </AdminEmptyState>
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const busy = !!updating[r.id];
                const re = rowError[r.id];
                return (
                  <tr
                    key={r.id}
                    id={`admin-event-resv-${r.id}`}
                    className={
                      highlightId === r.id
                        ? 'bg-amber-50/70 ring-1 ring-amber-300 dark:bg-amber-950/30 dark:ring-amber-700/60'
                        : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50'
                    }
                  >
                    <td className="px-3 py-2 align-top text-xs">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        EVENT
                      </span>
                      <div className="mt-0.5 break-all text-[10px] text-zinc-500">
                        {r.id}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-zinc-800 dark:text-zinc-200">
                      {r.restaurant?.name ?? '—'}
                      <div>
                        <Link
                          className="text-xs text-zinc-600 underline dark:text-amber-200/80"
                          href={perRestaurantEventReservationsPath(
                            r.restaurantId,
                          )}
                        >
                          Venue list
                        </Link>
                      </div>
                      <div>
                        <Link
                          className="text-xs text-zinc-500 underline dark:text-zinc-500"
                          href={globalEventReservationsPath({
                            restaurantId: r.restaurantId,
                            eventId: r.eventId,
                            eventReservationId: r.id,
                          })}
                        >
                          Link
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200 max-w-[10rem]">
                      {r.event?.title ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {r.event
                        ? `${fmt(r.event.startsAt)} — ${fmt(r.event.endsAt)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div>{r.customer?.fullName ?? '—'}</div>
                      <div className="text-xs text-zinc-500">
                        {r.customer?.email ?? '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2">{r.partySize}</td>
                    <td className="px-3 py-2">
                      <AdminStatusBadge tone={eventStatusTone(r.status)}>
                        {r.status}
                      </AdminStatusBadge>
                    </td>
                    <td className="max-w-[12rem] px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                      {r.note || r.specialRequest || '—'}
                      {r.rejectionReason ? (
                        <div className="text-amber-900/90 dark:text-amber-200/80">
                          Reject: {r.rejectionReason}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {r.status === 'PENDING' && canManage ? (
                        <div className="flex max-w-[8rem] flex-col gap-1">
                          <Button
                            variant="secondary"
                            className="!px-2 !py-1 !text-xs"
                            disabled={busy}
                            onClick={() => {
                              if (!window.confirm('Confirm this event booking?')) {
                                return;
                              }
                              void setStatus(r.restaurantId, r.id, 'CONFIRMED');
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
                          {re ? (
                            <span className="text-[11px] text-red-600 dark:text-red-300/95">
                              {re}
                            </span>
                          ) : null}
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
