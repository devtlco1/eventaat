'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../../../components/Badge';
import { Button } from '../../../../../components/Button';
import { Input } from '../../../../../components/Input';
import {
  createRestaurantEvent,
  deactivateRestaurantEvent,
  getMe,
  listRestaurants,
  listRestaurantEvents,
  reviewRestaurantEvent,
  updateRestaurantEvent,
  type CreateRestaurantEventInput,
  type MeResponse,
  type Restaurant,
  type RestaurantEvent,
  type RestaurantEventStatus,
} from '../../../../../lib/api';
import { getToken } from '../../../../../lib/auth';

function statusTone(
  s: RestaurantEventStatus,
): 'zinc' | 'yellow' | 'green' | 'red' {
  switch (s) {
    case 'PENDING':
      return 'yellow';
    case 'APPROVED':
      return 'green';
    case 'REJECTED':
      return 'red';
    default:
      return 'zinc';
  }
}

const emptyForm = {
  title: '',
  description: '',
  startsAt: '',
  endsAt: '',
  isFree: 'true',
  price: '',
};

export default function RestaurantEventsPage() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId;

  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [events, setEvents] = useState<RestaurantEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState<RestaurantEvent | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});

  const isCustomer = me?.role === 'CUSTOMER';
  const isPlatform = me?.role === 'PLATFORM_ADMIN';
  const canWrite = !isCustomer;

  const canSubmit = useMemo(() => {
    return (
      canWrite &&
      !submitting &&
      form.title.trim().length > 0 &&
      form.startsAt.trim().length > 0 &&
      form.endsAt.trim().length > 0
    );
  }, [canWrite, submitting, form]);

  async function refresh() {
    const token = getToken();
    if (!token) return;

    const [meRes, restaurantsRes, eventsRes] = await Promise.all([
      getMe(token),
      listRestaurants(token),
      listRestaurantEvents(token, restaurantId, {}),
    ]);

    setMe(meRes);
    setRestaurant(restaurantsRes.find((r) => r.id === restaurantId) ?? null);
    setEvents(eventsRes);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await refresh();
      } catch (err) {
        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load events';
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  function buildCreatePayload(): CreateRestaurantEventInput {
    const isFree = form.isFree === 'true';
    const p = form.price.trim();
    const n = p ? Number(p) : undefined;
    return {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      startsAt: form.startsAt.trim(),
      endsAt: form.endsAt.trim(),
      isFree,
      price: isFree || n == null || Number.isNaN(n) ? undefined : n,
    };
  }

  function startEdit(e: RestaurantEvent) {
    setEditing(e);
    setEditForm({
      title: e.title,
      description: e.description ?? '',
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      isFree: e.isFree ? 'true' : 'false',
      price: e.price != null ? String(e.price) : '',
    });
  }

  function buildUpdatePayload(
    f: typeof emptyForm,
  ): Partial<CreateRestaurantEventInput> {
    const isFree = f.isFree === 'true';
    const p = f.price.trim();
    const n = p ? Number(p) : undefined;
    return {
      title: f.title.trim(),
      description: f.description.trim() || undefined,
      startsAt: f.startsAt.trim(),
      endsAt: f.endsAt.trim(),
      isFree,
      price: isFree || n == null || Number.isNaN(n) ? undefined : n,
    };
  }

  async function onCreate(ev: React.FormEvent) {
    ev.preventDefault();
    if (!canSubmit) return;
    const token = getToken();
    if (!token) return;

    setSubmitting(true);
    setError(null);
    try {
      await createRestaurantEvent(token, restaurantId, buildCreatePayload());
      setForm({ ...emptyForm });
      await refresh();
    } catch (err) {
      setError(
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to create event',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveEdit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editing) return;
    const eventId = editing.id;
    const token = getToken();
    if (!token) return;

    setError(null);
    setActionBusy((m) => ({ ...m, [eventId]: true }));
    try {
      await updateRestaurantEvent(
        token,
        restaurantId,
        eventId,
        buildUpdatePayload(editForm),
      );
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to update',
      );
    } finally {
      setActionBusy((m) => ({ ...m, [eventId]: false }));
    }
  }

  async function onApprove(e: RestaurantEvent) {
    const token = getToken();
    if (!token) return;
    setError(null);
    setActionBusy((m) => ({ ...m, [e.id]: true }));
    try {
      await reviewRestaurantEvent(token, restaurantId, e.id, {
        status: 'APPROVED',
      });
      await refresh();
    } catch (err) {
      setError(
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Approve failed',
      );
    } finally {
      setActionBusy((m) => ({ ...m, [e.id]: false }));
    }
  }

  async function onReject(e: RestaurantEvent) {
    if (typeof window === 'undefined') return;
    const r = window.prompt('Rejection reason (optional, leave empty for default)');
    if (r === null) return;
    const token = getToken();
    if (!token) return;
    setError(null);
    setActionBusy((m) => ({ ...m, [e.id]: true }));
    try {
      await reviewRestaurantEvent(token, restaurantId, e.id, {
        status: 'REJECTED',
        rejectionReason: r.trim() || undefined,
      });
      await refresh();
    } catch (err) {
      setError(
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Reject failed',
      );
    } finally {
      setActionBusy((m) => ({ ...m, [e.id]: false }));
    }
  }

  async function onDeactivate(e: RestaurantEvent) {
    if (typeof window === 'undefined') return;
    if (!window.confirm(`Deactivate (hide) “${e.title}”?`)) return;
    const token = getToken();
    if (!token) return;
    setError(null);
    setActionBusy((m) => ({ ...m, [e.id]: true }));
    try {
      await deactivateRestaurantEvent(token, restaurantId, e.id);
      if (editing?.id === e.id) setEditing(null);
      await refresh();
    } catch (err) {
      setError(
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Deactivate failed',
      );
    } finally {
      setActionBusy((m) => ({ ...m, [e.id]: false }));
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
            <span className="text-sm font-medium text-zinc-700">Events</span>
          </div>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900">
            {restaurant ? restaurant.name : 'Restaurant events'}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Event nights are pending until a platform admin approves them. Customers
            only see approved, active, upcoming events.
          </p>
        </div>
        {restaurant ? (
          <Badge tone={restaurant.isActive ? 'green' : 'zinc'}>
            {restaurant.isActive ? 'Restaurant active' : 'Restaurant inactive'}
          </Badge>
        ) : null}
      </div>

      {isCustomer ? (
        <p className="text-sm text-zinc-600">You do not have access to manage events.</p>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {canWrite ? (
        <form
          onSubmit={onCreate}
          className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-zinc-900">New event</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Input
                label="Title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                disabled={!canWrite}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Free</label>
              <select
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
                value={form.isFree}
                onChange={(e) => setForm((f) => ({ ...f, isFree: e.target.value }))}
                disabled={!canWrite}
              >
                <option value="true">Free</option>
                <option value="false">Paid (set price below)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Description (optional)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={!canWrite}
              />
            </div>
            <div>
              <Input
                label="Starts at (ISO 8601)"
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                disabled={!canWrite}
                placeholder="2026-12-20T20:00:00.000Z"
              />
            </div>
            <div>
              <Input
                label="Ends at (ISO 8601)"
                value={form.endsAt}
                onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                disabled={!canWrite}
                placeholder="2026-12-20T23:00:00.000Z"
              />
            </div>
            {form.isFree === 'false' ? (
              <div>
                <Input
                  label="Price"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  disabled={!canWrite}
                />
              </div>
            ) : null}
          </div>
          <div>
            <Button type="submit" disabled={!canSubmit || submitting}>
              Create event
            </Button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-900">Events</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Active</th>
                <th className="px-4 py-2">Start</th>
                <th className="px-4 py-2">End</th>
                <th className="px-4 py-2">Price</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-zinc-500">
                    No events yet.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-2 font-medium text-zinc-900">
                      {e.title}
                      {e.rejectionReason && e.status === 'REJECTED' ? (
                        <p className="mt-1 text-xs font-normal text-red-600">
                          Reason: {e.rejectionReason}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={statusTone(e.status)}>{e.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{e.isActive ? 'yes' : 'no'}</td>
                    <td className="px-4 py-2 text-zinc-600">
                      {e.startsAt ? new Date(e.startsAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {e.endsAt ? new Date(e.endsAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {e.isFree ? 'Free' : e.price != null ? `${e.price} ${e.currency}` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-1 min-[900px]:flex-row min-[900px]:flex-wrap min-[900px]:items-center min-[900px]:gap-2">
                        {canWrite &&
                        (isPlatform
                          ? true
                          : e.status === 'PENDING' || e.status === 'REJECTED') ? (
                          <button
                            type="button"
                            className="text-left text-sm text-zinc-900 underline decoration-zinc-300 hover:decoration-zinc-500"
                            onClick={() => startEdit(e)}
                            disabled={!!actionBusy[e.id]}
                          >
                            Edit
                          </button>
                        ) : null}
                        {isPlatform && e.status === 'PENDING' ? (
                          <>
                            <button
                              type="button"
                              className="text-left text-sm text-emerald-800 underline decoration-emerald-200 hover:decoration-emerald-500"
                              onClick={() => void onApprove(e)}
                              disabled={!!actionBusy[e.id]}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="text-left text-sm text-red-800 underline decoration-red-200 hover:decoration-red-500"
                              onClick={() => void onReject(e)}
                              disabled={!!actionBusy[e.id]}
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        {canWrite && e.isActive ? (
                          <button
                            type="button"
                            className="text-left text-sm text-zinc-600 underline decoration-zinc-300"
                            onClick={() => void onDeactivate(e)}
                            disabled={!!actionBusy[e.id]}
                          >
                            Deactivate
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && canWrite ? (
        <form
          onSubmit={onSaveEdit}
          className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/30 p-4"
        >
          <h2 className="text-sm font-semibold text-zinc-900">Edit: {editing.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Input
                label="Title"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Free</label>
              <select
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
                value={editForm.isFree}
                onChange={(e) => setEditForm((f) => ({ ...f, isFree: e.target.value }))}
              >
                <option value="true">Free</option>
                <option value="false">Paid (set price below)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Description (optional)"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <Input
                label="Starts at (ISO 8601)"
                value={editForm.startsAt}
                onChange={(e) => setEditForm((f) => ({ ...f, startsAt: e.target.value }))}
                placeholder="2026-12-20T20:00:00.000Z"
              />
            </div>
            <div>
              <Input
                label="Ends at (ISO 8601)"
                value={editForm.endsAt}
                onChange={(e) => setEditForm((f) => ({ ...f, endsAt: e.target.value }))}
                placeholder="2026-12-20T23:00:00.000Z"
              />
            </div>
            {editForm.isFree === 'false' ? (
              <div>
                <Input
                  label="Price"
                  value={editForm.price}
                  onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={!!(editing && actionBusy[editing.id])}>
              Save
            </Button>
            <button
              type="button"
              className="text-sm text-zinc-600 underline"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
