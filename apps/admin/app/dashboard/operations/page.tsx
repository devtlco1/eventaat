'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getReservationOperations,
  type ReservationOperationsEventItem,
  type ReservationOperationsResponse,
  type ReservationOperationsTableItem,
} from '../../../lib/api';
import { getToken } from '../../../lib/auth';
import {
  adminEventReservationListPath,
  adminTableReservationListPath,
} from '../../../lib/notificationLinks';

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

function RowBlock({
  row,
  showEventTitle,
  showRequestSlot,
}: {
  row: OpRow;
  showEventTitle: boolean;
  showRequestSlot: boolean;
}) {
  const href =
    row.type === 'TABLE'
      ? adminTableReservationListPath(row.restaurant.id, row.id)
      : adminEventReservationListPath(
          row.restaurant.id,
          row.id,
          row.eventId,
        );
  return (
    <li className="list-none">
      <Link
        href={href}
        className="block rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-sm hover:bg-zinc-50"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-medium text-zinc-900">
            {row.type === 'TABLE' ? 'TABLE' : 'EVENT'}
            {showEventTitle && row.type === 'EVENT' ? (
              <span className="ml-1 font-normal text-zinc-600">
                — {row.eventTitle}
              </span>
            ) : null}
          </span>
          <span className="text-xs text-zinc-500">{itemStatus(row)}</span>
        </div>
        <div className="mt-1 text-zinc-700">
          {row.customer.fullName} · {row.customer.email}
          {row.customer.phone ? ` · ${row.customer.phone}` : ''}
        </div>
        <div className="mt-1 text-xs text-zinc-500">
          {row.restaurant.name} · party {row.partySize} · requested{' '}
          {when(row.requestedAt)}
        </div>
        {row.type === 'TABLE' && showRequestSlot ? (
          <div className="mt-0.5 text-xs text-zinc-500">
            Table window: {when(row.startAt)} – {when(row.endAt)}
          </div>
        ) : null}
        {row.type === 'EVENT' && showRequestSlot ? (
          <div className="mt-0.5 text-xs text-zinc-500">
            Event: {when(row.eventStartsAt)} – {when(row.eventEndsAt)}
          </div>
        ) : null}
        {row.note ? (
          <div className="mt-1 text-xs text-zinc-600">Note: {row.note}</div>
        ) : null}
        <div className="mt-1 text-xs font-medium text-zinc-800">Open in restaurant →</div>
      </Link>
    </li>
  );
}

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
    <div className="rounded-md border border-zinc-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-zinc-500">{sub}</div> : null}
    </div>
  );
}

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'All types' },
  { value: 'TABLE', label: 'Table' },
  { value: 'EVENT', label: 'Event' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function OperationsPage() {
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
        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load reservation operations';
        setError(message);
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
    const canSeeNeeds =
      statusFilter === 'ALL' || statusFilter === 'PENDING';
    const needs = canSeeNeeds
      ? data.needsAttention
          .filter(
            (r) =>
              matchesType(r, typeFilter) &&
              (statusFilter === 'ALL' || r.status === 'PENDING'),
          )
      : [];
    const recent = data.recentActivity.filter(
      (r) => matchesType(r, typeFilter) && matchesStatus(r, statusFilter),
    );
    return { filteredNeeds: needs, filteredRecent: recent, showNeedsSection: canSeeNeeds };
  }, [data, typeFilter, statusFilter]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Reservation operations
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Pending requests and status changes in the last 7 days for your scope
          (restaurants in view: {data?.scopeRestaurantCount ?? 0}).
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          <Link className="underline" href="/dashboard">
            ← Dashboard
          </Link>
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-600">Loading…</p>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : data ? (
        <>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-900">Summary</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatLine
                label="Pending table"
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
                sub="Terminal states, by last update"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-zinc-700">
              <span className="mr-2">Type</span>
              <select
                className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
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
            <label className="text-sm text-zinc-700">
              <span className="mr-2">Status</span>
              <select
                className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm"
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
              className="text-sm text-zinc-600 underline"
              onClick={load}
            >
              Refresh
            </button>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-900">
              Needs attention (pending)
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
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">No pending items match the filters.</p>
              )
            ) : (
              <p className="text-sm text-zinc-500">
                This section is only for pending work. Set status to “All
                statuses” or “Pending” to see open requests.
              </p>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-zinc-900">
              Recent activity (7 days, last update)
            </h2>
            {filteredRecent.length > 0 ? (
              <ul className="space-y-2">
                {filteredRecent.map((row) => (
                  <RowBlock
                    key={`r-${row.type}-${row.id}`}
                    row={row}
                    showEventTitle
                    showRequestSlot
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">
                No items match the filters. (Includes HELD/COMPLETED table states
                when type is not filtered to event-only.)
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-zinc-600">No data.</p>
      )}
    </div>
  );
}
