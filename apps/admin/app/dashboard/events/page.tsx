'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminFilterBar } from '../../../components/admin/AdminFilterBar';
import {
  adminInputClass,
  adminSelectClass,
  adminThead,
  adminTableWrap,
} from '../../../components/admin/adminShellClasses';
import { AdminEmptyState } from '../../../components/admin/AdminEmptyState';
import { AdminErrorState } from '../../../components/admin/AdminErrorState';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { AdminStatusBadge } from '../../../components/admin/AdminStatusBadge';
import { AdminPaginationBar } from '../../../components/AdminPaginationBar';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Modal } from '../../../components/Modal';
import {
  createRestaurantEvent,
  getMe,
  getRequestErrorMessage,
  reviewRestaurantEvent,
  type CreateRestaurantEventInput,
  type MeResponse,
  type Restaurant,
  type RestaurantEvent,
  type RestaurantEventStatus,
} from '../../../lib/api';
import { getToken } from '../../../lib/auth';
import { loadAllAccessibleEventNights } from '../../../lib/staffReservationsData';
import { useClientPagination } from '../../../lib/useClientPagination';

const STATUS_OPTIONS: (RestaurantEventStatus | 'ALL')[] = [
  'ALL',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];

function eventTone(
  s: RestaurantEventStatus,
): Parameters<typeof AdminStatusBadge>[0]['tone'] {
  if (s === 'PENDING') return 'yellow';
  if (s === 'APPROVED') return 'green';
  if (s === 'REJECTED' || s === 'CANCELLED') return 'zinc';
  return 'zinc';
}

function fmt(dt: string) {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleString();
}

function restaurantName(
  rlist: Restaurant[],
  restaurantId: string,
): string {
  return rlist.find((x) => x.id === restaurantId)?.name ?? '—';
}

export default function EventNightsPage() {
  const sp = useSearchParams();
  const highlightEventId = sp.get('eventId')?.trim() || undefined;

  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [events, setEvents] = useState<RestaurantEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<RestaurantEventStatus | 'ALL'>('ALL');
  const [restFilter, setRestFilter] = useState<string>('ALL');
  const [titleQ, setTitleQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [createForm, setCreateForm] = useState<{
    restaurantId: string;
    title: string;
    description: string;
    startLocal: string;
    endLocal: string;
    isFree: boolean;
    price: string;
    currency: string;
    capacity: string;
    seatsAvailableNote: string;
    specialMenuDescription: string;
    specialMenuUrl: string;
    whatIsIncluded: string;
    entertainmentInfo: string;
    coverImageUrl: string;
    isActive: boolean;
  }>({
    restaurantId: '',
    title: '',
    description: '',
    startLocal: '',
    endLocal: '',
    isFree: true,
    price: '',
    currency: 'SAR',
    capacity: '',
    seatsAvailableNote: '',
    specialMenuDescription: '',
    specialMenuUrl: '',
    whatIsIncluded: '',
    entertainmentInfo: '',
    coverImageUrl: '',
    isActive: true,
  });

  const isPlatform = me?.role === 'PLATFORM_ADMIN';
  const canList = isPlatform || me?.role === 'RESTAURANT_ADMIN';

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const u = await getMe(token);
    setMe(u);
    const { restaurants: rlist, events: all } = await loadAllAccessibleEventNights(
      token,
    );
    setRestaurants(rlist);
    setEvents(all);
  }, []);

  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        await load();
      } catch (e) {
        setError(
          getRequestErrorMessage(e, 'Failed to load event nights'),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const filtered = useMemo(() => {
    const tq = titleQ.trim().toLowerCase();
    const fromD = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toD = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    return events.filter((ev) => {
      if (statusFilter !== 'ALL' && ev.status !== statusFilter) return false;
      if (restFilter !== 'ALL' && ev.restaurantId !== restFilter) return false;
      if (tq && !ev.title.toLowerCase().includes(tq)) return false;
      if (activeFilter === 'true' && !ev.isActive) return false;
      if (activeFilter === 'false' && ev.isActive) return false;
      const s = new Date(ev.startsAt);
      if (fromD && !isNaN(fromD.getTime()) && s < fromD) return false;
      if (toD && !isNaN(toD.getTime()) && s > toD) return false;
      return true;
    });
  }, [events, restFilter, statusFilter, titleQ, dateFrom, dateTo, activeFilter]);

  const { page, setPage, setPageSize, pageCount, paged, total, pageSize } =
    useClientPagination(filtered);

  useEffect(() => {
    if (highlightEventId) setPage(1);
  }, [highlightEventId, setPage]);

  useEffect(() => {
    if (loading || !highlightEventId) return;
    const t = setTimeout(() => {
      document
        .getElementById(`admin-event-night-${highlightEventId}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 200);
    return () => clearTimeout(t);
  }, [loading, highlightEventId, paged.length]);

  async function doReview(
    ev: RestaurantEvent,
    s: 'APPROVED' | 'REJECTED',
  ) {
    if (!isPlatform) return;
    const token = getToken();
    if (!token) return;
    if (s === 'REJECTED') {
      const reason = window.prompt('Rejection reason (optional)');
      if (reason === null) return;
      await doReviewWithReason(ev, s, reason || undefined);
    } else {
      if (!window.confirm('Approve this event night?')) return;
      await doReviewWithReason(ev, s);
    }
  }

  async function doReviewWithReason(
    ev: RestaurantEvent,
    s: 'APPROVED' | 'REJECTED',
    rejectionReason?: string,
  ) {
    const token = getToken();
    if (!token) return;
    setUpdating((m) => ({ ...m, [ev.id]: true }));
    setError(null);
    try {
      await reviewRestaurantEvent(token, ev.restaurantId, ev.id, {
        status: s,
        ...(s === 'REJECTED' && rejectionReason?.trim()
          ? { rejectionReason: rejectionReason.trim() }
          : {}),
      });
      await load();
    } catch (e) {
      setError(getRequestErrorMessage(e, 'Update failed'));
    } finally {
      setUpdating((m) => {
        const n = { ...m };
        delete n[ev.id];
        return n;
      });
    }
  }

  function openCreate() {
    setCreateErr(null);
    setCreateForm((f) => ({
      ...f,
      restaurantId: restaurants[0]?.id ?? '',
      title: '',
      description: '',
      startLocal: '',
      endLocal: '',
      isFree: true,
      price: '',
      currency: 'SAR',
      capacity: '',
      seatsAvailableNote: '',
      specialMenuDescription: '',
      specialMenuUrl: '',
      whatIsIncluded: '',
      entertainmentInfo: '',
      coverImageUrl: '',
      isActive: true,
    }));
    setCreateOpen(true);
  }

  async function submitCreate() {
    const token = getToken();
    if (!token) return;
    setCreateErr(null);
    if (!createForm.restaurantId || !createForm.title.trim()) {
      setCreateErr('Restaurant and title are required.');
      return;
    }
    if (!createForm.startLocal || !createForm.endLocal) {
      setCreateErr('Start and end date/time are required.');
      return;
    }
    const startsAt = new Date(createForm.startLocal).toISOString();
    const endsAt = new Date(createForm.endLocal).toISOString();
    const cap = createForm.capacity.trim() ? parseInt(createForm.capacity, 10) : undefined;
    const pr = createForm.price.trim() ? Number(createForm.price) : undefined;
    const input: CreateRestaurantEventInput = {
      title: createForm.title.trim(),
      description: createForm.description.trim() || undefined,
      startsAt,
      endsAt,
      isActive: createForm.isActive,
      isFree: createForm.isFree,
      price:
        !createForm.isFree && pr != null && Number.isFinite(pr) ? pr : undefined,
      currency: createForm.currency.trim() || undefined,
      capacity: cap != null && Number.isFinite(cap) ? cap : undefined,
      seatsAvailableNote: createForm.seatsAvailableNote.trim() || undefined,
      specialMenuDescription: createForm.specialMenuDescription.trim() || undefined,
      specialMenuUrl: createForm.specialMenuUrl.trim() || undefined,
      whatIsIncluded: createForm.whatIsIncluded.trim() || undefined,
      entertainmentInfo: createForm.entertainmentInfo.trim() || undefined,
      coverImageUrl: createForm.coverImageUrl.trim() || undefined,
    };
    setCreateBusy(true);
    try {
      await createRestaurantEvent(token, createForm.restaurantId, input);
      setCreateOpen(false);
      await load();
    } catch (e) {
      setCreateErr(
        getRequestErrorMessage(
          e,
          'Create failed. Check required fields and times.',
        ),
      );
    } finally {
      setCreateBusy(false);
    }
  }

  if (!canList && me) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">You do not have access to this view.</p>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Event nights"
        description="Event listings per restaurant. PENDING events need platform approval before they appear to customers."
      />
      {error ? <AdminErrorState>{error}</AdminErrorState> : null}
      {me && !isPlatform ? (
        <p className="text-sm text-amber-900/90 dark:text-amber-200/85">
          PENDING nights are approved by the platform. You can add nights for your
          assigned venues; status updates appear here.
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
          <span className="mb-0.5 block">Event status</span>
          <select
            className={adminSelectClass + ' min-w-[7rem] text-zinc-900 dark:text-zinc-100'}
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-800 dark:text-zinc-200">
          <span className="mb-0.5 block">Active</span>
          <select
            className={adminSelectClass + ' min-w-[5rem] text-zinc-900 dark:text-zinc-100'}
            value={activeFilter}
            onChange={(e) =>
              setActiveFilter(e.target.value as typeof activeFilter)
            }
          >
            <option value="all">All</option>
            <option value="true">On</option>
            <option value="false">Off</option>
          </select>
        </label>
        <label className="text-sm text-zinc-800 dark:text-zinc-200">
          <span className="mb-0.5 block">Starts from</span>
          <input
            type="date"
            className={adminInputClass}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="text-sm text-zinc-800 dark:text-zinc-200">
          <span className="mb-0.5 block">Starts to</span>
          <input
            type="date"
            className={adminInputClass}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <div className="min-w-[10rem] max-w-sm flex-1">
          <Input
            label="Search title"
            value={titleQ}
            onChange={(e) => setTitleQ(e.target.value)}
            placeholder="…"
          />
        </div>
        {canList ? (
          <Button type="button" onClick={openCreate}>
            Add event night
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={load}>
          Refresh
        </Button>
      </AdminFilterBar>

      {highlightEventId ? (
        <p className="text-xs text-amber-900/90 dark:text-amber-200/80">
          Highlighting a row from your notification link.{' '}
          <Link
            className="underline"
            href="/dashboard/events"
          >
            Clear
          </Link>
        </p>
      ) : null}

      <div className={'overflow-hidden ' + adminTableWrap}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className={adminThead}>
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Restaurant</th>
                <th className="px-3 py-2">Starts / ends</th>
                <th className="px-3 py-2">Cap. / price</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Active</th>
                <th className="min-w-[8rem] px-3 py-2">Notes</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/90 dark:divide-zinc-700/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4">
                    <AdminEmptyState>
                      {filtered.length === 0
                        ? 'No event nights for these filters.'
                        : 'No rows on this page.'}
                    </AdminEmptyState>
                  </td>
                </tr>
              ) : (
                paged.map((ev) => {
                  const busy = !!updating[ev.id];
                  const hi = highlightEventId === ev.id;
                  return (
                    <tr
                      key={ev.id}
                      id={`admin-event-night-${ev.id}`}
                      className={[
                        'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40',
                        hi
                          ? 'bg-amber-50/80 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800/50'
                          : '',
                      ].join(' ')}
                    >
                      <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                        {ev.title}
                      </td>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                        {restaurantName(restaurants, ev.restaurantId)}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {fmt(ev.startsAt)} — {fmt(ev.endsAt)}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300">
                        {ev.capacity != null ? ev.capacity : '—'}
                        <span className="text-zinc-400"> · </span>
                        {ev.isFree
                          ? 'Free'
                          : ev.price
                            ? `${ev.price} ${ev.currency || ''}`.trim()
                            : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <AdminStatusBadge tone={eventTone(ev.status)}>
                          {ev.status}
                        </AdminStatusBadge>
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                        {ev.isActive ? 'Yes' : 'No'}
                      </td>
                      <td className="max-w-[14rem] px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                        {ev.status === 'PENDING' && !isPlatform ? (
                          <span className="text-amber-900/90 dark:text-amber-200/85">
                            Awaiting platform review
                          </span>
                        ) : null}
                        {ev.rejectionReason ? (
                          <div className="text-red-800 dark:text-red-200/90">
                            Reject: {ev.rejectionReason}
                          </div>
                        ) : null}
                        {ev.seatsAvailableNote ? (
                          <div className="text-zinc-500">{ev.seatsAvailableNote}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <Link
                            href={`/dashboard/restaurants/${ev.restaurantId}/events`}
                            className="text-xs text-zinc-800 underline dark:text-amber-200/90"
                          >
                            View
                          </Link>
                          {isPlatform && ev.status === 'PENDING' ? (
                            <>
                              <Button
                                variant="secondary"
                                className="!px-2 !py-0.5 !text-xs"
                                type="button"
                                disabled={busy}
                                onClick={() => doReview(ev, 'APPROVED')}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="secondary"
                                className="!px-2 !py-0.5 !text-xs"
                                type="button"
                                disabled={busy}
                                onClick={() => doReview(ev, 'REJECTED')}
                              >
                                Reject
                              </Button>
                            </>
                          ) : null}
                        </div>
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
        title="Add event night"
        open={createOpen}
        onClose={() => {
          if (!createBusy) setCreateOpen(false);
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={createBusy}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createBusy}
              onClick={() => void submitCreate()}
            >
              {createBusy ? 'Submitting…' : 'Create'}
            </Button>
          </div>
        }
      >
        {createErr ? (
          <p className="mb-2 text-sm text-red-700 dark:text-red-300">{createErr}</p>
        ) : null}
        <div className="max-h-[60dvh] space-y-3 overflow-y-auto pr-1 text-sm sm:max-h-[70dvh]">
          <label className="block text-zinc-800 dark:text-zinc-200">
            <span className="mb-0.5 block">Restaurant *</span>
            <select
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-800"
              value={createForm.restaurantId}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, restaurantId: e.target.value }))
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
          <Input
            label="Title *"
            value={createForm.title}
            onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
          />
          <div>
            <label className="mb-0.5 block text-zinc-800 dark:text-zinc-200">Description</label>
            <textarea
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              rows={3}
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <label className="block text-zinc-800 dark:text-zinc-200">
            <span className="mb-0.5 block">Starts (local) *</span>
            <input
              type="datetime-local"
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-800"
              value={createForm.startLocal}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, startLocal: e.target.value }))
              }
            />
          </label>
          <label className="block text-zinc-800 dark:text-zinc-200">
            <span className="mb-0.5 block">Ends (local) *</span>
            <input
              type="datetime-local"
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-800"
              value={createForm.endLocal}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, endLocal: e.target.value }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={createForm.isActive}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, isActive: e.target.checked }))
              }
            />
            Listing active
          </label>
          <label className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={createForm.isFree}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, isFree: e.target.checked }))
              }
            />
            Free event
          </label>
          {!createForm.isFree ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                label="Price"
                value={createForm.price}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, price: e.target.value }))
                }
              />
              <Input
                label="Currency"
                value={createForm.currency}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, currency: e.target.value }))
                }
              />
            </div>
          ) : null}
          <Input
            label="Capacity (optional)"
            value={createForm.capacity}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, capacity: e.target.value }))
            }
          />
          <Input
            label="Seats / availability note"
            value={createForm.seatsAvailableNote}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, seatsAvailableNote: e.target.value }))
            }
          />
          <div>
            <label className="mb-0.5 block">Special menu description</label>
            <textarea
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              rows={2}
              value={createForm.specialMenuDescription}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  specialMenuDescription: e.target.value,
                }))
              }
            />
          </div>
          <Input
            label="Special menu URL"
            value={createForm.specialMenuUrl}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, specialMenuUrl: e.target.value }))
            }
          />
          <div>
            <label className="mb-0.5 block">What&rsquo;s included</label>
            <textarea
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              rows={2}
              value={createForm.whatIsIncluded}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, whatIsIncluded: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="mb-0.5 block">Entertainment</label>
            <textarea
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              rows={2}
              value={createForm.entertainmentInfo}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, entertainmentInfo: e.target.value }))
              }
            />
          </div>
          <Input
            label="Cover image URL"
            value={createForm.coverImageUrl}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, coverImageUrl: e.target.value }))
            }
          />
        </div>
      </Modal>
    </div>
  );
}
