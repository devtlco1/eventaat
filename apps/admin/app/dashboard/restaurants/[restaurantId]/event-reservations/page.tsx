'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Badge } from '../../../../../components/Badge';
import { Button } from '../../../../../components/Button';
import { Input } from '../../../../../components/Input';
import {
  getMe,
  listRestaurantEventReservations,
  listRestaurants,
  updateEventReservationStatus,
  type AdminEventReservation,
  type EventReservationStatus,
  type MeResponse,
  type Restaurant,
} from '../../../../../lib/api';
import { getToken } from '../../../../../lib/auth';

function eventStatusTone(
  s: EventReservationStatus,
): 'green' | 'zinc' | 'yellow' | 'red' {
  if (s === 'CONFIRMED') return 'green';
  if (s === 'PENDING') return 'yellow';
  if (s === 'REJECTED' || s === 'CANCELLED') return 'red';
  return 'zinc';
}

function fmt(dt: string): string {
  const d = new Date(dt);
  if (isNaN(d.getTime())) return dt;
  return d.toLocaleString();
}

export default function RestaurantEventReservationsPage() {
  const params = useParams<{ restaurantId: string }>();
  const sp = useSearchParams();
  const restaurantId = params.restaurantId;
  const eventFilter = sp.get('eventId')?.trim() || undefined;

  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [list, setList] = useState<AdminEventReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const canManage = useMemo(() => {
    return me?.role === 'PLATFORM_ADMIN' || me?.role === 'RESTAURANT_ADMIN';
  }, [me?.role]);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const [meRes, restaurantsRes, rows] = await Promise.all([
      getMe(token),
      listRestaurants(token),
      listRestaurantEventReservations(token, restaurantId, { eventId: eventFilter }),
    ]);
    setMe(meRes);
    setRestaurant(restaurantsRes.find((r) => r.id === restaurantId) ?? null);
    setList(rows);
  }, [restaurantId, eventFilter]);

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
            ? Number((err as { status?: number }).status)
            : undefined;
        if (status === 403) {
          if (!cancelled) {
            setError(
              'You do not have permission to view event reservations for this restaurant.',
            );
          }
        } else {
          const message =
            typeof err === 'object' && err && 'message' in err
              ? String((err as { message: string }).message)
              : 'Failed to load event reservations';
          if (!cancelled) setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const setStatus = useCallback(
    async (
      eventReservationId: string,
      status: 'CONFIRMED' | 'REJECTED',
      extras?: { rejectionReason?: string },
    ) => {
      const token = getToken();
      if (!token) return;
      setUpdating((m) => ({ ...m, [eventReservationId]: true }));
      setError(null);
      try {
        const updated = await updateEventReservationStatus(
          token,
          restaurantId,
          eventReservationId,
          {
            status,
            ...(status === 'REJECTED' && extras?.rejectionReason?.trim()
              ? { rejectionReason: extras.rejectionReason.trim() }
              : {}),
          },
        );
        setList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        setRejectingId(null);
        setRejectReason((m) => {
          const c = { ...m };
          delete c[eventReservationId];
          return c;
        });
      } catch (err) {
        const code =
          typeof err === 'object' && err && 'status' in err
            ? Number((err as { status?: number }).status)
            : undefined;
        if (code === 403) {
          setError(
            'You do not have permission to manage event reservations for this restaurant.',
          );
        } else {
          setError(
            err instanceof Error ? err.message : 'Failed to update event reservation',
          );
        }
      } finally {
        setUpdating((m) => {
          const n = { ...m };
          delete n[eventReservationId];
          return n;
        });
      }
    },
    [restaurantId],
  );

  if (!restaurantId) {
    return <p className="p-4 text-sm text-zinc-600">Missing restaurant.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/restaurants"
              className="text-sm font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 hover:decoration-zinc-500"
            >
              Restaurants
            </Link>
            <span className="text-zinc-400">/</span>
            <Link
              href={`/dashboard/restaurants/${restaurantId}/reservations`}
              className="text-sm font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900 hover:decoration-zinc-500"
            >
              Table reservations
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="text-sm font-medium text-zinc-700">Event reservations</span>
          </div>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900">
            {restaurant ? restaurant.name : 'Event night reservations'}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Approve or reject <strong>event</strong> booking requests. These are separate
            from normal table reservations. Capacity is enforced when you confirm.
          </p>
          {eventFilter ? (
            <p className="mt-1 text-xs text-zinc-500">
              Filtered to event:{' '}
              <code className="text-zinc-700">{eventFilter}</code>{' '}
              <Link
                href={`/dashboard/restaurants/${restaurantId}/event-reservations`}
                className="text-zinc-800 underline"
              >
                clear
              </Link>
            </p>
          ) : null}
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
          <div className="text-sm font-semibold text-zinc-900">Event reservation requests</div>
          <div className="text-xs text-zinc-500">
            {loading ? 'Loading…' : `${list.length} total`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Event</th>
                <th className="px-6 py-3">When</th>
                <th className="px-6 py-3">Party</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Note</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-4 text-zinc-600" colSpan={8}>
                    Loading event reservations…
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-zinc-600" colSpan={8}>
                    No event reservation requests.
                  </td>
                </tr>
              ) : (
                list.map((row) => {
                  const busy = !!updating[row.id];
                  const terminal = row.status === 'REJECTED' || row.status === 'CANCELLED';
                  const canAct = canManage && !busy && !terminal;
                  const isRejecting = rejectingId === row.id;
                  const typeLabel = row.type ?? 'EVENT';
                  const priceLine =
                    row.event.isFree || row.event.price == null
                      ? 'Free'
                      : `${row.event.price} ${row.event.currency}`.trim();

                  return (
                    <Fragment key={row.id}>
                      <tr className="hover:bg-zinc-50/50">
                        <td className="px-6 py-4 align-top text-xs font-semibold text-zinc-800">
                          {typeLabel}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-zinc-900">{row.customer.email}</div>
                          {row.customer.fullName ? (
                            <div className="text-xs text-zinc-500">{row.customer.fullName}</div>
                          ) : null}
                          {row.customer.phone ? (
                            <div className="text-xs text-zinc-500">{row.customer.phone}</div>
                          ) : null}
                        </td>
                        <td className="max-w-[12rem] px-6 py-4 text-zinc-800">
                          <div className="font-medium">{row.event.title}</div>
                          <div className="text-xs text-zinc-500">{priceLine}</div>
                        </td>
                        <td className="px-6 py-4 text-zinc-700">
                          <div className="whitespace-nowrap">{fmt(row.event.startsAt)}</div>
                          {row.restaurant ? (
                            <div className="text-xs text-zinc-500">{row.restaurant.name}</div>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 text-zinc-700">{row.partySize}</td>
                        <td className="px-6 py-4">
                          <Badge tone={eventStatusTone(row.status)}>{row.status}</Badge>
                          {row.rejectionReason && row.status === 'REJECTED' ? (
                            <div
                              className="mt-1 max-w-xs text-xs text-zinc-600"
                              title={row.rejectionReason}
                            >
                              {row.rejectionReason}
                            </div>
                          ) : null}
                          {row.cancellationReason && row.status === 'CANCELLED' ? (
                            <div
                              className="mt-1 max-w-xs text-xs text-zinc-600"
                              title={row.cancellationReason}
                            >
                              Cancel: {row.cancellationReason}
                            </div>
                          ) : null}
                        </td>
                        <td className="max-w-[14rem] px-6 py-4 text-xs text-zinc-700">
                          {row.note || row.specialRequest ? (
                            <div
                              className="line-clamp-2"
                              title={row.note || row.specialRequest || ''}
                            >
                              {row.note || row.specialRequest}
                            </div>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isRejecting ? (
                            <form
                              className="flex max-w-md flex-col gap-2"
                              onSubmit={(e: FormEvent) => {
                                e.preventDefault();
                                const rr = rejectReason[row.id] ?? '';
                                void setStatus(row.id, 'REJECTED', { rejectionReason: rr });
                              }}
                            >
                              <Input
                                id={`rr-${row.id}`}
                                label="Rejection reason (optional)"
                                value={rejectReason[row.id] ?? ''}
                                onChange={(ev) =>
                                  setRejectReason((m) => ({ ...m, [row.id]: ev.target.value }))
                                }
                                placeholder="Visible to the customer if provided"
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button type="submit" variant="secondary" disabled={busy}>
                                  {busy ? '…' : 'Submit reject'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() => {
                                    setRejectingId(null);
                                    setRejectReason((m) => {
                                      const c = { ...m };
                                      delete c[row.id];
                                      return c;
                                    });
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex max-w-md flex-wrap items-center gap-2">
                              <Button
                                variant="secondary"
                                onClick={() => void setStatus(row.id, 'CONFIRMED')}
                                disabled={!canAct || row.status !== 'PENDING'}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() => setRejectingId(row.id)}
                                disabled={!canAct || row.status !== 'PENDING'}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {row.statusHistory && row.statusHistory.length > 0 ? (
                        <tr className="bg-zinc-50/40">
                          <td colSpan={8} className="px-6 py-2">
                            <details>
                              <summary className="cursor-pointer text-xs font-medium text-zinc-600">
                                Status history ({row.statusHistory.length})
                              </summary>
                              <ul className="mt-2 list-none space-y-1 pl-0 text-xs text-zinc-600">
                                {row.statusHistory.map((h) => (
                                  <li key={h.id}>
                                    <span className="text-zinc-500">{fmt(h.createdAt)}</span>
                                    {' — '}
                                    {h.fromStatus ?? '—'} → {h.toStatus}
                                    {h.note ? ` · ${h.note}` : ''}
                                    {h.changedBy
                                      ? ` (${h.changedBy.fullName || h.changedBy.email})`
                                      : ''}
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
    </div>
  );
}
