'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminEmptyState } from '../../../../components/admin/AdminEmptyState';
import { AdminErrorState } from '../../../../components/admin/AdminErrorState';
import { AdminPageHeader } from '../../../../components/admin/AdminPageHeader';
import { AdminTypeBadge } from '../../../../components/admin/AdminTypeBadge';
import { Button } from '../../../../components/Button';
import {
  getReservationOperations,
  type ReservationOperationsEventItem,
  type ReservationOperationsResponse,
  type ReservationOperationsTableItem,
  updateEventReservationStatus,
  updateReservationStatus,
} from '../../../../lib/api';
import { getToken } from '../../../../lib/auth';
import {
  globalEventReservationsPath,
  globalTableReservationsPath,
} from '../../../../lib/reservationLinks';

type TypeFilter = 'ALL' | 'TABLE' | 'EVENT';
type StatusFilter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

type OpRow = ReservationOperationsTableItem | ReservationOperationsEventItem;

function itemStatus(r: OpRow): string {
  return r.status;
}

function matchesType(r: OpRow, t: TypeFilter): boolean {
  if (t === 'ALL') return true;
  return r.type === t;
}

function matchesStatus(r: OpRow, s: StatusFilter): boolean {
  if (s === 'ALL') return true;
  return r.status === s;
}

function when(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'All types' },
  { value: 'TABLE', label: 'Restaurant (table)' },
  { value: 'EVENT', label: 'Event' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function StatLine({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700/80 dark:bg-zinc-900/60">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">{sub}</div>
      ) : null}
    </div>
  );
}

type RowBlockProps = {
  row: OpRow;
  showEventTitle: boolean;
  showRequestSlot: boolean;
  showActions: boolean;
  onAfterAction: () => void;
};

function RowBlock({
  row,
  showEventTitle,
  showRequestSlot,
  showActions,
  onAfterAction,
}: RowBlockProps) {
  const listHref =
    row.type === 'TABLE'
      ? globalTableReservationsPath({
          restaurantId: row.restaurant.id,
          reservationId: row.id,
        })
      : globalEventReservationsPath({
          restaurantId: row.restaurant.id,
          eventReservationId: row.id,
          eventId: row.type === 'EVENT' ? row.eventId : undefined,
        });

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onConfirmTable() {
    if (row.type !== 'TABLE') return;
    if (!window.confirm('Confirm this restaurant booking?')) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await updateReservationStatus(
        token,
        row.restaurant.id,
        row.id,
        'CONFIRMED',
      );
      onAfterAction();
    } catch (e) {
      setErr(
        typeof e === 'object' && e && 'message' in e
          ? String((e as { message: string }).message)
          : 'Confirm failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onRejectTable() {
    if (row.type !== 'TABLE') return;
    const note = window.prompt('Rejection reason (optional)');
    if (note === null) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await updateReservationStatus(
        token,
        row.restaurant.id,
        row.id,
        'REJECTED',
        note || undefined,
      );
      onAfterAction();
    } catch (e) {
      setErr(
        typeof e === 'object' && e && 'message' in e
          ? String((e as { message: string }).message)
          : 'Reject failed',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmEvent() {
    if (row.type !== 'EVENT') return;
    if (!window.confirm('Confirm this event booking?')) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await updateEventReservationStatus(
        token,
        row.restaurant.id,
        row.id,
        { status: 'CONFIRMED' },
      );
      onAfterAction();
    } catch (e) {
      const code =
        typeof e === 'object' && e && 'status' in e
          ? Number((e as { status: number }).status)
          : undefined;
      if (code === 422) {
        setErr(
          typeof e === 'object' && e && 'message' in e
            ? String((e as { message: string }).message)
            : 'Not enough capacity or a business rule blocked this.',
        );
      } else {
        setErr(
          typeof e === 'object' && e && 'message' in e
            ? String((e as { message: string }).message)
            : 'Confirm failed',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function onRejectEvent() {
    if (row.type !== 'EVENT') return;
    const reason = window.prompt('Rejection reason (optional)');
    if (reason === null) return;
    const token = getToken();
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      await updateEventReservationStatus(
        token,
        row.restaurant.id,
        row.id,
        { status: 'REJECTED', rejectionReason: reason || undefined },
      );
      onAfterAction();
    } catch (e) {
      setErr(
        typeof e === 'object' && e && 'message' in e
          ? String((e as { message: string }).message)
          : 'Reject failed',
      );
    } finally {
      setBusy(false);
    }
  }

  const pending = row.status === 'PENDING';

  return (
    <li className="list-none">
      <div className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700/80 dark:bg-zinc-900/60 sm:flex-row sm:items-stretch sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <AdminTypeBadge type={row.type} />
              {showEventTitle && row.type === 'EVENT' ? (
                <span className="text-zinc-700 dark:text-zinc-200">
                  {row.eventTitle}
                </span>
              ) : null}
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-500">
              {itemStatus(row)}
            </span>
          </div>
          <div className="mt-1 text-zinc-800 dark:text-zinc-200">
            {row.customer.fullName} · {row.customer.email}
            {row.customer.phone ? ` · ${row.customer.phone}` : ''}
          </div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            {row.restaurant.name} · party {row.partySize} · requested{' '}
            {when(row.requestedAt)}
          </div>
          {row.type === 'TABLE' && showRequestSlot ? (
            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
              Seating window: {when(row.startAt)} – {when(row.endAt)}
            </div>
          ) : null}
          {row.type === 'EVENT' && showRequestSlot ? (
            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
              Event night: {when(row.eventStartsAt)} – {when(row.eventEndsAt)}
            </div>
          ) : null}
          {row.note ? (
            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
              Note: {row.note}
            </div>
          ) : null}
          <div className="mt-2">
            <Link
              href={listHref}
              className="text-xs font-medium text-amber-800 underline dark:text-amber-300/90"
            >
              {row.type === 'TABLE'
                ? 'Open in Restaurant bookings'
                : 'Open in Event bookings'}
            </Link>
          </div>
          {err ? <div className="mt-2 text-xs text-red-700 dark:text-red-300">{err}</div> : null}
        </div>
        {showActions && pending ? (
          <div className="flex shrink-0 flex-col justify-center gap-2 sm:w-36">
            {row.type === 'TABLE' ? (
              <>
                <Button
                  variant="secondary"
                  className="!px-2 !py-1.5 !text-xs"
                  type="button"
                  disabled={busy}
                  onClick={onConfirmTable}
                >
                  Confirm
                </Button>
                <Button
                  variant="secondary"
                  className="!px-2 !py-1.5 !text-xs"
                  type="button"
                  disabled={busy}
                  onClick={onRejectTable}
                >
                  Reject
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  className="!px-2 !py-1.5 !text-xs"
                  type="button"
                  disabled={busy}
                  onClick={onConfirmEvent}
                >
                  Confirm
                </Button>
                <Button
                  variant="secondary"
                  className="!px-2 !py-1.5 !text-xs"
                  type="button"
                  disabled={busy}
                  onClick={onRejectEvent}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}

export default function PendingWorkPage() {
  const [data, setData] = useState<ReservationOperationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const load = useCallback(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const o = await getReservationOperations(token);
        setData(o);
      } catch (err) {
        setError(
          typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load the work queue',
        );
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { filteredNeeds, filteredRecent, showNeedsSection } = useMemo(() => {
    if (!data) {
      return {
        filteredNeeds: [] as OpRow[],
        filteredRecent: [] as OpRow[],
        showNeedsSection: true,
      };
    }
    const canSeeNeeds = statusFilter === 'ALL' || statusFilter === 'PENDING';
    const needs = canSeeNeeds
      ? data.needsAttention.filter(
          (r) =>
            matchesType(r, typeFilter) &&
            (statusFilter === 'ALL' || r.status === 'PENDING'),
        )
      : [];
    const recent = data.recentActivity.filter(
      (r) => matchesType(r, typeFilter) && matchesStatus(r, statusFilter),
    );
    return {
      filteredNeeds: needs,
      filteredRecent: recent,
      showNeedsSection: canSeeNeeds,
    };
  }, [data, typeFilter, statusFilter]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Pending work"
        description={`Table and event bookings for your access (${data?.scopeRestaurantCount ?? 0} restaurant${
          (data?.scopeRestaurantCount ?? 0) === 1 ? '' : 's'
        }). Use filters to view recent non-pending activity.`}
      />

      {loading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">Loading…</p>
      ) : error ? (
        <AdminErrorState>{error}</AdminErrorState>
      ) : data ? (
        <>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Summary
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatLine
                label="Pending restaurant"
                value={data.summary.pendingTableCount}
              />
              <StatLine
                label="Pending event"
                value={data.summary.pendingEventCount}
              />
              <StatLine
                label="Confirmed (24h)"
                value={data.summary.confirmedLast24hCount}
                sub="Table + event, by last update"
              />
              <StatLine
                label="Rejected or cancelled (7d)"
                value={data.summary.rejectedOrCancelledLast7dCount}
                sub="By last update"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-zinc-700 dark:text-zinc-200">
              <span className="mr-2">Type</span>
              <select
                className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
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
                  setStatusFilter(e.target.value as StatusFilter)
                }
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="text-sm text-zinc-600 underline dark:text-zinc-400"
              onClick={load}
            >
              Refresh
            </button>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Queued (pending)
            </h2>
            {showNeedsSection ? (
              filteredNeeds.length > 0 ? (
                <ul className="space-y-2">
                  {filteredNeeds.map((row) => (
                    <RowBlock
                      key={`${row.type}-${row.id}`}
                      row={row}
                      showEventTitle
                      showRequestSlot
                      showActions
                      onAfterAction={load}
                    />
                  ))}
                </ul>
              ) : (
                <AdminEmptyState>
                  No pending items match the filters.
                </AdminEmptyState>
              )
            ) : (
              <AdminEmptyState>
                Set status to &quot;All&quot; or &quot;Pending&quot; to work the
                live queue.
              </AdminEmptyState>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Recent (7 days)
            </h2>
            {filteredRecent.length > 0 ? (
              <ul className="space-y-2">
                {filteredRecent.map((row) => (
                  <RowBlock
                    key={`r-${row.type}-${row.id}`}
                    row={row}
                    showEventTitle
                    showRequestSlot
                    showActions={false}
                    onAfterAction={load}
                  />
                ))}
              </ul>
            ) : (
              <AdminEmptyState>No items match the filters.</AdminEmptyState>
            )}
          </div>
        </>
      ) : (
        <AdminEmptyState>Nothing to show.</AdminEmptyState>
      )}
    </div>
  );
}
