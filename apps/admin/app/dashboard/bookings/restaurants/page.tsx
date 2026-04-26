'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminFilterBar } from '../../../../components/admin/AdminFilterBar';
import {
  adminInputClass,
  adminSelectClass,
  adminTableWrap,
  adminThead,
} from '../../../../components/admin/adminShellClasses';
import { AdminEmptyState } from '../../../../components/admin/AdminEmptyState';
import { AdminErrorState } from '../../../../components/admin/AdminErrorState';
import { AdminPageHeader } from '../../../../components/admin/AdminPageHeader';
import { AdminStatusBadge } from '../../../../components/admin/AdminStatusBadge';
import { AdminPaginationBar } from '../../../../components/AdminPaginationBar';
import { Button } from '../../../../components/Button';
import { Input } from '../../../../components/Input';
import { Modal } from '../../../../components/Modal';
import {
  createAdminTableReservation,
  getMe,
  getRequestErrorMessage,
  listUsers,
  type AdminReservationStatus,
  type MeResponse,
  type PlatformUser,
  type ReservationStatus,
  type Restaurant,
  type RestaurantReservation,
  updateReservationStatus,
} from '../../../../lib/api';
import { getToken } from '../../../../lib/auth';
import { loadAllAccessibleTableReservations } from '../../../../lib/staffReservationsData';
import { useClientPagination } from '../../../../lib/useClientPagination';
import {
  globalTableReservationsPath,
  perRestaurantTableReservationsPath,
} from '../../../../lib/reservationLinks';

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
): Parameters<typeof AdminStatusBadge>[0]['tone'] {
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

function shortBookingId(id: string) {
  if (id.length <= 8) return `Booking #${id}`;
  return `Booking #${id.slice(0, 8)}`;
}

function includesCustomer(r: RestaurantReservation, q: string) {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const c = r.customer;
  if (!c) return false;
  return (
    (c.fullName?.toLowerCase() ?? '').includes(t) ||
    (c.email?.toLowerCase() ?? '').includes(t) ||
    (c.phone && c.phone.toLowerCase().includes(t))
  );
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
  const [customerQ, setCustomerQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [partyMax, setPartyMax] = useState('');
  const [missingHighlight, setMissingHighlight] = useState(false);
  const deepLinkTuned = useRef(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);
  const [customerPick, setCustomerPick] = useState<PlatformUser[]>([]);
  const [addForm, setAddForm] = useState({
    restaurantId: '',
    customerId: '',
    partySize: 2,
    startLocal: '',
    endLocal: '',
    specialRequest: '',
  });
  const [historyFor, setHistoryFor] = useState<RestaurantReservation | null>(
    null,
  );

  const isPa = me?.role === 'PLATFORM_ADMIN';
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
    const pMax = partyMax.trim() ? Number(partyMax) : NaN;
    const fromT = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toT = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    return reservations.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (restFilter !== 'ALL' && r.restaurant?.id !== restFilter) return false;
      if (!includesCustomer(r, customerQ)) return false;
      const st = new Date(r.startAt);
      if (fromT && !isNaN(fromT.getTime()) && st < fromT) return false;
      if (toT && !isNaN(toT.getTime()) && st > toT) return false;
      if (Number.isFinite(pMax) && pMax > 0 && r.partySize > pMax) return false;
      return true;
    });
  }, [reservations, restFilter, statusFilter, customerQ, dateFrom, dateTo, partyMax]);

  const { page, setPage, setPageSize, pageCount, paged, total, pageSize } =
    useClientPagination(filtered);

  useEffect(() => {
    if (highlightReservationId) setPage(1);
  }, [highlightReservationId, setPage]);

  useEffect(() => {
    if (loading || !reservations.length) return;
    if (!highlightReservationId) {
      deepLinkTuned.current = false;
      setMissingHighlight(false);
      return;
    }
    if (deepLinkTuned.current) return;
    const found = reservations.find((r) => r.id === highlightReservationId);
    if (found) {
      setRestFilter(found.restaurantId);
      setStatusFilter('ALL');
      setMissingHighlight(false);
    } else {
      setMissingHighlight(true);
    }
    deepLinkTuned.current = true;
  }, [loading, highlightReservationId, reservations]);

  useEffect(() => {
    if (loading || !highlightReservationId) return;
    const t = setTimeout(() => {
      document
        .getElementById(`admin-table-resv-${highlightReservationId}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(t);
  }, [loading, highlightReservationId, paged.length, page]);

  useEffect(() => {
    if (!addOpen || !isPa) return;
    const token = getToken();
    if (!token) return;
    void (async () => {
      try {
        const list = await listUsers(token, { role: 'CUSTOMER' });
        setCustomerPick(list);
      } catch {
        setCustomerPick([]);
      }
    })();
  }, [addOpen, isPa]);

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
          : getRequestErrorMessage(err, 'Update failed'),
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

  function openAdd() {
    setAddErr(null);
    setAddForm((f) => ({
      ...f,
      restaurantId: restaurants[0]?.id ?? '',
      customerId: '',
      partySize: 2,
      startLocal: '',
      endLocal: '',
      specialRequest: '',
    }));
    setAddOpen(true);
  }

  async function submitAdd() {
    const token = getToken();
    if (!token || !canManage) return;
    setAddErr(null);
    if (!addForm.restaurantId || !addForm.customerId.trim()) {
      setAddErr('Choose a restaurant and customer (user id).');
      return;
    }
    if (!addForm.startLocal || !addForm.endLocal) {
      setAddErr('Start and end date/time are required.');
      return;
    }
    const startAt = new Date(addForm.startLocal).toISOString();
    const endAt = new Date(addForm.endLocal).toISOString();
    setAddBusy(true);
    try {
      await createAdminTableReservation(token, addForm.restaurantId, {
        customerId: addForm.customerId.trim(),
        partySize: addForm.partySize,
        startAt,
        endAt,
        specialRequest: addForm.specialRequest.trim() || undefined,
      });
      setAddOpen(false);
      await refresh();
    } catch (e) {
      setAddErr(
        getRequestErrorMessage(
          e,
          'Could not create booking. Check times and id.',
        ),
      );
    } finally {
      setAddBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Restaurant bookings"
        description="Table and seating-time reservations only. Event-night guest tickets stay on the separate event flow in the app."
      />

      {error ? <AdminErrorState>{error}</AdminErrorState> : null}

      {highlightReservationId && !loading ? (
        <p
          className={[
            'text-xs',
            missingHighlight
              ? 'text-amber-900 dark:text-amber-200/90'
              : 'text-amber-900/90 dark:text-amber-200/90',
          ].join(' ')}
        >
          {missingHighlight
            ? 'The linked booking is not in your list (wrong account or it no longer exists).'
            : 'A row is highlighted from the link.'}{' '}
          <Link
            className="font-medium underline"
            href="/dashboard/bookings/restaurants"
          >
            Clear link
          </Link>
        </p>
      ) : null}

      <AdminFilterBar>
        <label className="text-sm text-zinc-800 dark:text-zinc-200">
          <span className="mb-0.5 block">Restaurant</span>
          <select
            className={adminSelectClass + ' min-w-[10rem] text-zinc-900 dark:text-zinc-100'}
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
          <span className="mb-0.5 block">Status</span>
          <select
            className={adminSelectClass + ' min-w-[8rem] text-zinc-900 dark:text-zinc-100'}
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
        <label className="text-sm text-zinc-800 dark:text-zinc-200">
          <span className="mb-0.5 block">From date</span>
          <input
            type="date"
            className={adminInputClass}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="text-sm text-zinc-800 dark:text-zinc-200">
          <span className="mb-0.5 block">To date</span>
          <input
            type="date"
            className={adminInputClass}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <div className="w-full min-w-[12rem] sm:max-w-xs sm:flex-1">
          <Input
            label="Customer (name, email, phone)"
            value={customerQ}
            onChange={(e) => setCustomerQ(e.target.value)}
            placeholder="Filter…"
          />
        </div>
        <div className="w-20">
          <Input
            label="Max party"
            value={partyMax}
            onChange={(e) => setPartyMax(e.target.value)}
            placeholder="—"
          />
        </div>
        {canManage ? (
          <Button type="button" onClick={openAdd}>
            Add booking
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={refresh}>
          Refresh
        </Button>
      </AdminFilterBar>

      <div className={'overflow-hidden ' + adminTableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className={adminThead}>
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
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700/60">
              {loading ? (
                <tr>
                  <td
                    className="px-3 py-4 text-zinc-600 dark:text-zinc-400"
                    colSpan={8}
                  >
                    Loading…
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td className="px-3 py-4" colSpan={8}>
                    <AdminEmptyState>
                      {filtered.length === 0
                        ? 'No bookings match the filters.'
                        : 'No rows on this page.'}
                    </AdminEmptyState>
                  </td>
                </tr>
              ) : (
                paged.map((r) => {
                  const busy = !!updating[r.id];
                  const s = r.status;
                  const canCancelThis =
                    s === 'PENDING' ||
                    s === 'HELD' ||
                    s === 'CONFIRMED';
                  const canAct = canManage && !busy;
                  const history = r.statusHistory ?? [];
                  return (
                    <tr
                      key={r.id}
                        id={`admin-table-resv-${r.id}`}
                        className={
                          highlightReservationId === r.id
                            ? 'bg-amber-50/70 ring-1 ring-amber-300 dark:bg-amber-950/30 dark:ring-amber-700/60'
                            : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/45'
                        }
                      >
                        <td
                          className="px-3 py-2 align-top text-xs text-zinc-800 dark:text-zinc-200"
                          title={r.id}
                        >
                          <span className="font-semibold">TABLE</span>
                          <div className="mt-0.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                            {shortBookingId(r.id)}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top text-zinc-800 dark:text-zinc-200">
                          {r.restaurant?.name ?? '—'}
                          <div>
                            <Link
                              className="text-xs text-amber-800 underline dark:text-amber-300/90"
                              href={perRestaurantTableReservationsPath(
                                r.restaurantId,
                              )}
                            >
                              Venue
                            </Link>
                            <span className="text-zinc-400"> · </span>
                            <Link
                              className="text-xs text-zinc-600 underline dark:text-zinc-400"
                              href={globalTableReservationsPath({
                                restaurantId: r.restaurantId,
                                reservationId: r.id,
                              })}
                            >
                              Copy link
                            </Link>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="text-zinc-900 dark:text-zinc-100">
                            {r.customer?.fullName ?? '—'}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-500">
                            {r.customer?.email ?? '—'}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200">
                          {r.partySize}
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300">
                          {fmt(r.startAt)} — {fmt(r.endAt)}
                        </td>
                        <td className="px-3 py-2">
                          <AdminStatusBadge tone={statusTone(r.status)}>
                            {r.status}
                          </AdminStatusBadge>
                        </td>
                        <td className="max-w-[12rem] px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                          {r.note || r.specialRequest || '—'}
                          {r.rejectionReason ? (
                            <div className="mt-0.5 text-amber-900/90 dark:text-amber-200/80">
                              Reject: {r.rejectionReason}
                            </div>
                          ) : null}
                          {r.cancellationReason ? (
                            <div className="text-zinc-500">
                              Cancel: {r.cancellationReason}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {!canAct ? (
                            <span className="text-xs text-zinc-500">—</span>
                          ) : s === 'CANCELLED' ||
                            s === 'COMPLETED' ||
                            s === 'REJECTED' ? (
                            <span className="text-xs text-zinc-500">—</span>
                          ) : (
                            <div className="flex max-w-[14rem] flex-col gap-1.5">
                              <div className="flex flex-wrap gap-1">
                                {s === 'PENDING' ? (
                                  <Button
                                    variant="secondary"
                                    className="!px-2 !py-0.5 !text-xs"
                                    onClick={() =>
                                      setStatus(r.restaurantId, r.id, 'HELD')
                                    }
                                  >
                                    Hold
                                  </Button>
                                ) : null}
                                {s === 'PENDING' || s === 'HELD' ? (
                                  <>
                                    <Button
                                      variant="secondary"
                                      className="!px-2 !py-0.5 !text-xs"
                                      onClick={() =>
                                        setStatus(
                                          r.restaurantId,
                                          r.id,
                                          'CONFIRMED',
                                        )
                                      }
                                    >
                                      Confirm
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      className="!px-2 !py-0.5 !text-xs"
                                      onClick={() =>
                                        rejectWithPrompt(
                                          r.restaurantId,
                                          r.id,
                                        )
                                      }
                                    >
                                      Reject
                                    </Button>
                                  </>
                                ) : null}
                                {canCancelThis ? (
                                  <Button
                                    variant="secondary"
                                    className="!px-2 !py-0.5 !text-xs"
                                    onClick={() =>
                                      setStatus(
                                        r.restaurantId,
                                        r.id,
                                        'CANCELLED',
                                      )
                                    }
                                  >
                                    Cancel
                                  </Button>
                                ) : null}
                                {s === 'CONFIRMED' ? (
                                  <Button
                                    variant="secondary"
                                    className="!px-2 !py-0.5 !text-xs"
                                    onClick={() =>
                                      setStatus(
                                        r.restaurantId,
                                        r.id,
                                        'COMPLETED',
                                      )
                                    }
                                  >
                                    Complete
                                  </Button>
                                ) : null}
                              </div>
                              {history.length > 0 ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="!h-7 w-fit !px-2 !text-xs"
                                  onClick={() => setHistoryFor(r)}
                                >
                                  History ({history.length})
                                </Button>
                              ) : null}
                            </div>
                          )}
                        </td>
                      </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <AdminPaginationBar
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(pageCount, p + 1))}
          total={total}
        />
      </div>

      <Modal
        title={
          historyFor
            ? `Status history — ${shortBookingId(historyFor.id)}`
            : 'History'
        }
        open={!!historyFor}
        onClose={() => setHistoryFor(null)}
        footer={
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setHistoryFor(null)}
            >
              Close
            </Button>
          </div>
        }
      >
        {historyFor ? (
          <div className="text-sm text-zinc-800 dark:text-zinc-200">
            <p className="mb-2 font-mono text-xs text-zinc-500" title={historyFor.id}>
              {historyFor.id}
            </p>
            <ul className="list-none space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              {(historyFor.statusHistory ?? []).map((h) => (
                <li key={h.id}>
                  {fmt(h.createdAt)}: {h.fromStatus ?? '—'} → {h.toStatus}
                  {h.note ? ` — ${h.note}` : ''}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Modal>

      <Modal
        title="Add restaurant booking"
        open={addOpen}
        onClose={() => {
          if (!addBusy) setAddOpen(false);
        }}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={addBusy}
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={addBusy}
              onClick={() => void submitAdd()}
            >
              {addBusy ? 'Creating…' : 'Create'}
            </Button>
          </div>
        }
      >
        {addErr ? (
          <p className="mb-2 text-sm text-red-700 dark:text-red-300">{addErr}</p>
        ) : null}
        <div className="space-y-3 text-sm">
          <label className="block text-zinc-700 dark:text-zinc-200">
            <span className="mb-0.5 block">Restaurant *</span>
            <select
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-800"
              value={addForm.restaurantId}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, restaurantId: e.target.value }))
              }
            >
              <option value="">—</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          {isPa && customerPick.length > 0 ? (
            <label className="block text-zinc-700 dark:text-zinc-200">
              <span className="mb-0.5 block">Customer *</span>
              <select
                className="w-full max-w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-800"
                value={addForm.customerId}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, customerId: e.target.value }))
                }
              >
                <option value="">—</option>
                {customerPick.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} · {u.email}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <Input
              label="Customer user id (UUID) *"
              value={addForm.customerId}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, customerId: e.target.value }))
              }
              placeholder="Paste customer id from Users → Mobile"
            />
          )}
          <Input
            label="Party size *"
            type="number"
            min={1}
            value={String(addForm.partySize)}
            onChange={(e) =>
              setAddForm((f) => ({
                ...f,
                partySize: Math.max(1, Number(e.target.value) || 1),
              }))
            }
          />
          <label className="block text-zinc-700 dark:text-zinc-200">
            <span className="mb-0.5 block">Starts (local) *</span>
            <input
              type="datetime-local"
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              value={addForm.startLocal}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, startLocal: e.target.value }))
              }
            />
          </label>
          <label className="block text-zinc-700 dark:text-zinc-200">
            <span className="mb-0.5 block">Ends (local) *</span>
            <input
              type="datetime-local"
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              value={addForm.endLocal}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, endLocal: e.target.value }))
              }
            />
          </label>
          <p className="text-[11px] text-zinc-500">
            End time must be after start (same rules as the customer app). Set both
            in your local time zone.
          </p>
          <div>
            <Input
              label="Special request (optional)"
              value={addForm.specialRequest}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, specialRequest: e.target.value }))
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
