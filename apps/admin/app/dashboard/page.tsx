'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import {
  getMe,
  getReservationOperations,
  listMyNotifications,
  listRestaurants,
  listUsers,
  reviewRestaurantEvent,
  type MeResponse,
  type PlatformUser,
  type ReservationOperationsResponse,
  type Restaurant,
  type RestaurantEvent,
  updateEventReservationStatus,
  updateReservationStatus,
  type ReservationOperationsEventItem,
  type ReservationOperationsTableItem,
} from '../../lib/api';
import { getToken } from '../../lib/auth';
import {
  globalEventReservationsPath,
  globalTableReservationsPath,
  pendingBookingsPath,
} from '../../lib/reservationLinks';
import { loadAllAccessibleEventNights } from '../../lib/staffReservationsData';

function fmt(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString();
}

function restName(rl: Restaurant[], id: string) {
  return rl.find((r) => r.id === id)?.name ?? '—';
}

function Counter({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/60">
      <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </div>
      {sub ? (
        <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{sub}</div>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [allEvents, setAllEvents] = useState<RestaurantEvent[]>([]);
  const [ops, setOps] = useState<ReservationOperationsResponse | null>(null);
  const [unread, setUnread] = useState<number>(0);
  const [recentUsers, setRecentUsers] = useState<PlatformUser[] | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});

  const isPa = me?.role === 'PLATFORM_ADMIN';
  const isRa = me?.role === 'RESTAURANT_ADMIN';
  const isStaff = isPa || isRa;

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setErr(null);
    const u = await getMe(token);
    setMe(u);
    const rest = await listRestaurants(token);
    setRestaurants(rest);
    if (u.role === 'PLATFORM_ADMIN') {
      const uu = await listUsers(token);
      setTotalUsers(uu.length);
      setRecentUsers(
        [...uu].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ).slice(0, 5),
      );
    } else {
      setTotalUsers(null);
      setRecentUsers(null);
    }
    if (u.role === 'RESTAURANT_ADMIN' || u.role === 'PLATFORM_ADMIN') {
      const { events: evs } = await loadAllAccessibleEventNights(token);
      setAllEvents(evs);
      const n = await listMyNotifications(token, { limit: 1 }).catch(() => ({
        notifications: [] as { id: string }[],
        unreadCount: 0,
      }));
      setUnread(n.unreadCount);
      let o: ReservationOperationsResponse | null = null;
      try {
        o = await getReservationOperations(token);
      } catch {
        o = null;
      }
      setOps(o);
    } else {
      setAllEvents([]);
      setOps(null);
      setUnread(0);
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

  const now = new Date();
  const pendingNights = allEvents.filter((e) => e.status === 'PENDING');
  const approvedUpcoming = allEvents.filter(
    (e) =>
      e.status === 'APPROVED' &&
      e.isActive &&
      new Date(e.endsAt) > now,
  );

  const pendingEventRows = (ops?.needsAttention?.filter(
    (x) => x.type === 'EVENT',
  ) ?? []) as (ReservationOperationsEventItem & { type: 'EVENT' })[];
  const pendingTableRows = (ops?.needsAttention?.filter(
    (x) => x.type === 'TABLE',
  ) ?? []) as (ReservationOperationsTableItem & { type: 'TABLE' })[];

  const nightSlice = pendingNights.slice(0, 5);
  const tSlice = pendingTableRows.slice(0, 5);
  const eBookSlice = pendingEventRows.slice(0, 5);

  async function onApproveEventNight(ev: RestaurantEvent) {
    if (!isPa) return;
    if (!window.confirm('Approve this event?')) return;
    const t = getToken();
    if (!t) return;
    setActionBusy((m) => ({ ...m, [ev.id]: true }));
    try {
      await reviewRestaurantEvent(t, ev.restaurantId, ev.id, { status: 'APPROVED' });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionBusy((a) => {
        const c = { ...a };
        delete c[ev.id];
        return c;
      });
    }
  }
  async function onRejectEventNight(ev: RestaurantEvent) {
    if (!isPa) return;
    const re = window.prompt('Reason (optional)');
    if (re === null) return;
    const t = getToken();
    if (!t) return;
    setActionBusy((m) => ({ ...m, [ev.id]: true }));
    try {
      await reviewRestaurantEvent(t, ev.restaurantId, ev.id, {
        status: 'REJECTED',
        ...(re.trim() ? { rejectionReason: re.trim() } : {}),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionBusy((a) => {
        const c = { ...a };
        delete c[ev.id];
        return c;
      });
    }
  }

  async function quickTableConfirm(
    r: ReservationOperationsTableItem,
  ) {
    if (!window.confirm('Confirm this request?')) return;
    const t = getToken();
    if (!t) return;
    setActionBusy((m) => ({ ...m, [r.id]: true }));
    try {
      await updateReservationStatus(
        t,
        r.restaurant.id,
        r.id,
        'CONFIRMED',
      );
      await load();
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : 'Action failed',
      );
    } finally {
      setActionBusy((a) => {
        const c = { ...a };
        delete c[r.id];
        return c;
      });
    }
  }

  async function quickTableReject(r: ReservationOperationsTableItem) {
    const n = window.prompt('Reason (optional)');
    if (n === null) return;
    const t = getToken();
    if (!t) return;
    setActionBusy((m) => ({ ...m, [r.id]: true }));
    try {
      await updateReservationStatus(
        t,
        r.restaurant.id,
        r.id,
        'REJECTED',
        n || undefined,
      );
      await load();
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : 'Action failed',
      );
    } finally {
      setActionBusy((a) => {
        const c = { ...a };
        delete c[r.id];
        return c;
      });
    }
  }

  async function quickEventConfirm(
    r: ReservationOperationsEventItem,
  ) {
    if (!window.confirm('Confirm this event booking?')) return;
    const t = getToken();
    if (!t) return;
    setActionBusy((m) => ({ ...m, [r.id]: true }));
    try {
      await updateEventReservationStatus(t, r.restaurant.id, r.id, {
        status: 'CONFIRMED',
      });
      await load();
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : 'Not enough capacity or other rule',
      );
    } finally {
      setActionBusy((a) => {
        const c = { ...a };
        delete c[r.id];
        return c;
      });
    }
  }
  async function quickEventReject(r: ReservationOperationsEventItem) {
    const n = window.prompt('Rejection reason (optional)');
    if (n === null) return;
    const t = getToken();
    if (!t) return;
    setActionBusy((m) => ({ ...m, [r.id]: true }));
    try {
      await updateEventReservationStatus(t, r.restaurant.id, r.id, {
        status: 'REJECTED',
        rejectionReason: n || undefined,
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionBusy((a) => {
        const c = { ...a };
        delete c[r.id];
        return c;
      });
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading…</p>;
  }
  if (err) {
    return (
      <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {err}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        {isStaff && (
          <p className="mt-2 text-sm text-zinc-600">
            <Link
              href={pendingBookingsPath()}
              className="font-medium text-zinc-800 underline dark:text-zinc-200"
            >
              Pending work
            </Link>
            {' · '}
            <Link
              className="font-medium text-zinc-800 underline dark:text-zinc-200"
              href="/dashboard/notifications"
            >
              Notifications
            </Link>
            {unread > 0 ? ` (${unread} unread)` : ''}
          </p>
        )}
      </div>

      {isStaff && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            At a glance
          </h2>
          {!ops ? (
            <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
              The work queue could not be loaded. Booking counts may be zero until it is
              available.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <Counter label="Restaurants" value={restaurants.length} />
            <Counter
              label="Event nights"
              value={allEvents.length}
            />
            <Counter
              label="Pending event approvals"
              value={pendingNights.length}
            />
            <Counter
              label="Upcoming (approved)"
              value={approvedUpcoming.length}
            />
            <Counter
              label="Pending restaurant bookings"
              value={ops?.summary.pendingTableCount ?? 0}
            />
            <Counter
              label="Pending event bookings"
              value={ops?.summary.pendingEventCount ?? 0}
            />
            {isPa ? (
              <Counter
                label="Users"
                value={totalUsers ?? '—'}
                sub="all roles"
              />
            ) : null}
            <Counter label="Unread" value={unread} sub="notifications" />
          </div>
        </div>
      )}

      {!isStaff && (
        <p className="text-sm text-zinc-600">
          Use the apps you have access to from the menu.
        </p>
      )}

      {isPa && recentUsers && recentUsers.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <div className="text-sm font-medium text-zinc-900">Recent sign-ups</div>
          <ul className="mt-1 text-xs text-zinc-600">
            {recentUsers.map((u) => (
              <li key={u.id}>
                {u.email} — {u.role} — {fmt(u.createdAt)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isStaff && isPa && nightSlice.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-800">
            Event nights awaiting approval
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white text-sm">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-2 py-1.5">Event</th>
                  <th className="px-2 py-1.5">Venue</th>
                  <th className="px-2 py-1.5">When</th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {nightSlice.map((ev) => (
                  <tr key={ev.id}>
                    <td className="px-2 py-1.5 text-zinc-800">{ev.title}</td>
                    <td className="px-2 py-1.5">
                      {restName(restaurants, ev.restaurantId)}
                    </td>
                    <td className="px-2 py-1.5 text-zinc-600">
                      {fmt(ev.startsAt)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {isPa ? (
                        <div className="inline-flex flex-wrap justify-end gap-1">
                          <Button
                            variant="secondary"
                            className="!px-1.5 !py-0.5 !text-xs"
                            type="button"
                            disabled={actionBusy[ev.id]}
                            onClick={() => onApproveEventNight(ev)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            className="!px-1.5 !py-0.5 !text-xs"
                            type="button"
                            disabled={actionBusy[ev.id]}
                            onClick={() => onRejectEventNight(ev)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : null}
                      <Link
                        className="ml-1 text-zinc-600 underline"
                        href={`/dashboard/restaurants/${ev.restaurantId}/events`}
                      >
                        Venue
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isStaff && !isPa && pendingNights.length > 0 && (
        <p className="rounded border border-amber-100 bg-amber-50/50 px-3 py-2 text-sm text-amber-950/90">
          {pendingNights.length} event night{pendingNights.length === 1 ? '' : 's'}{' '}
          await platform review.{' '}
          <Link className="font-medium underline" href="/dashboard/events">
            View event nights
          </Link>
        </p>
      )}

      {isStaff && tSlice.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-800">
            Restaurant bookings to review
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white text-sm">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-2 py-1.5">ID</th>
                  <th className="px-2 py-1.5">Venue</th>
                  <th className="px-2 py-1.5">Guest / party</th>
                  <th className="px-2 py-1.5">Time</th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {tSlice.map((r) => (
                  <tr key={r.id}>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-zinc-500">
                      {r.id.slice(0, 8)}…
                    </td>
                    <td className="px-2 py-1.5">{r.restaurant.name}</td>
                    <td className="px-2 py-1.5">
                      {r.customer.fullName} · {r.partySize}
                    </td>
                    <td className="px-2 py-1.5 text-zinc-600">
                      {fmt(r.startAt)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1">
                        <Button
                          variant="secondary"
                          className="!px-1.5 !py-0.5 !text-xs"
                          type="button"
                          disabled={!!actionBusy[r.id]}
                          onClick={() => quickTableConfirm(r)}
                        >
                          OK
                        </Button>
                        <Button
                          variant="secondary"
                          className="!px-1.5 !py-0.5 !text-xs"
                          type="button"
                          disabled={!!actionBusy[r.id]}
                          onClick={() => quickTableReject(r)}
                        >
                          Reject
                        </Button>
                        <Link
                          className="text-zinc-700 underline"
                          href={globalTableReservationsPath({
                            restaurantId: r.restaurant.id,
                            reservationId: r.id,
                          })}
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isStaff && eBookSlice.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-800">
            Event bookings to review
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white text-sm">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-2 py-1.5">ID / event</th>
                  <th className="px-2 py-1.5">Venue</th>
                  <th className="px-2 py-1.5">Guest / party</th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {eBookSlice.map((r) => (
                  <tr key={r.id}>
                    <td className="px-2 py-1.5">
                      <div className="text-[10px] text-zinc-500">
                        {r.id.slice(0, 8)}…
                      </div>
                      <div className="text-zinc-800">{r.eventTitle}</div>
                    </td>
                    <td className="px-2 py-1.5">{r.restaurant.name}</td>
                    <td className="px-2 py-1.5">
                      {r.customer.fullName} · {r.partySize}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1">
                        <Button
                          variant="secondary"
                          className="!px-1.5 !py-0.5 !text-xs"
                          type="button"
                          disabled={!!actionBusy[r.id]}
                          onClick={() => quickEventConfirm(r)}
                        >
                          OK
                        </Button>
                        <Button
                          variant="secondary"
                          className="!px-1.5 !py-0.5 !text-xs"
                          type="button"
                          disabled={!!actionBusy[r.id]}
                          onClick={() => quickEventReject(r)}
                        >
                          Reject
                        </Button>
                        <Link
                          className="text-zinc-700 underline"
                          href={globalEventReservationsPath({
                            restaurantId: r.restaurant.id,
                            eventId: r.eventId,
                            eventReservationId: r.id,
                          })}
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
