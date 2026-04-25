'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import {
  createRestaurant,
  getMe,
  listRestaurants,
  type CreateRestaurantInput,
  type MeResponse,
  type Restaurant,
} from '../../../lib/api';
import { getToken } from '../../../lib/auth';

function toNumberOrUndefined(v: string): number | undefined {
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export default function RestaurantsPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    description: '',
    phone: '',
    area: '',
    latitude: '',
    longitude: '',
  });

  const canCreate = me?.role === 'PLATFORM_ADMIN';

  const canSubmit = useMemo(() => {
    return (
      canCreate &&
      !submitting &&
      form.name.trim().length > 0 &&
      form.address.trim().length > 0 &&
      form.city.trim().length > 0
    );
  }, [canCreate, submitting, form]);

  async function refresh() {
    const token = getToken();
    if (!token) return;

    const [meRes, listRes] = await Promise.all([
      getMe(token),
      listRestaurants(token),
    ]);
    setMe(meRes);
    setRestaurants(listRes);
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
            ? String((err as any).message)
            : 'Failed to load restaurants';
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const token = getToken();
    if (!token) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateRestaurantInput = {
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        description: form.description.trim() || undefined,
        phone: form.phone.trim() || undefined,
        area: form.area.trim() || undefined,
        latitude: toNumberOrUndefined(form.latitude),
        longitude: toNumberOrUndefined(form.longitude),
      };

      await createRestaurant(token, payload);
      setForm({
        name: '',
        address: '',
        city: '',
        description: '',
        phone: '',
        area: '',
        latitude: '',
        longitude: '',
      });
      await refresh();
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'message' in err
          ? String((err as any).message)
          : 'Failed to create restaurant';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Restaurants</h1>
        <p className="mt-1 text-sm text-zinc-600">
          View restaurants and create new ones (platform admins only).
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {canCreate ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-zinc-900">
                Create restaurant
              </div>
              <div className="text-xs text-zinc-500">
                Required: name, address, city
              </div>
            </div>
          </div>

          <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Test Restaurant"
              required
            />
            <Input
              label="City *"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Riyadh"
              required
            />
            <div className="sm:col-span-2">
              <Input
                label="Address *"
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="123 King Fahd Rd"
                required
              />
            </div>
            <Input
              label="Area"
              value={form.area}
              onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
              placeholder="Olaya"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+966..."
            />
            <div className="sm:col-span-2">
              <Input
                label="Description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Optional description"
              />
            </div>
            <Input
              label="Latitude"
              value={form.latitude}
              onChange={(e) =>
                setForm((f) => ({ ...f, latitude: e.target.value }))
              }
              placeholder="24.7136"
            />
            <Input
              label="Longitude"
              value={form.longitude}
              onChange={(e) =>
                setForm((f) => ({ ...f, longitude: e.target.value }))
              }
              placeholder="46.6753"
            />

            <div className="sm:col-span-2 flex items-center justify-end">
              <Button type="submit" disabled={!canSubmit}>
                {submitting ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      ) : me ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
          You are signed in as <span className="font-medium">{me.role}</span>.
          Creation is restricted to <span className="font-medium">PLATFORM_ADMIN</span>.
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
          <div className="text-sm font-semibold text-zinc-900">
            Restaurant list
          </div>
          <div className="text-xs text-zinc-500">
            {loading ? 'Loading…' : `${restaurants.length} total`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">City</th>
                <th className="px-6 py-3">Area</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-4 text-zinc-600" colSpan={6}>
                    Loading restaurants…
                  </td>
                </tr>
              ) : restaurants.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-zinc-600" colSpan={6}>
                    No restaurants found.
                  </td>
                </tr>
              ) : (
                restaurants.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-4 font-medium text-zinc-900">
                      {r.name}
                    </td>
                    <td className="px-6 py-4 text-zinc-700">{r.city}</td>
                    <td className="px-6 py-4 text-zinc-700">{r.area ?? '—'}</td>
                    <td className="px-6 py-4 text-zinc-700">
                      {r.phone ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge tone={r.isActive ? 'green' : 'zinc'}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          className="text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-500"
                          href={`/dashboard/restaurants/${r.id}/tables`}
                        >
                          Tables
                        </Link>
                        <Link
                          className="text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-500"
                          href={`/dashboard/restaurants/${r.id}/reservations`}
                        >
                          Reservations
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

