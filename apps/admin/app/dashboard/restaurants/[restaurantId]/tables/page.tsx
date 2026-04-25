'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../../../../../components/Badge';
import { Button } from '../../../../../components/Button';
import { Input } from '../../../../../components/Input';
import {
  createRestaurantTable,
  getMe,
  listRestaurants,
  listRestaurantTables,
  updateRestaurantTable,
  type MeResponse,
  type Restaurant,
  type RestaurantTable,
} from '../../../../../lib/api';
import { getToken } from '../../../../../lib/auth';

export default function RestaurantTablesPage() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId;

  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', capacity: '' });

  const isCustomer = me?.role === 'CUSTOMER';
  const canWrite = !isCustomer;

  const canSubmit = useMemo(() => {
    const cap = Number(form.capacity);
    return (
      canWrite &&
      !submitting &&
      form.name.trim().length > 0 &&
      Number.isInteger(cap) &&
      cap >= 1
    );
  }, [canWrite, submitting, form]);

  async function refresh() {
    const token = getToken();
    if (!token) return;

    const [meRes, restaurantsRes, tablesRes] = await Promise.all([
      getMe(token),
      listRestaurants(token),
      listRestaurantTables(token, restaurantId),
    ]);

    setMe(meRes);
    setRestaurant(restaurantsRes.find((r) => r.id === restaurantId) ?? null);
    setTables(tablesRes);
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
            : 'Failed to load tables';
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const token = getToken();
    if (!token) return;

    setSubmitting(true);
    setError(null);
    try {
      const capacity = Number(form.capacity);
      await createRestaurantTable(token, restaurantId, {
        name: form.name.trim(),
        capacity,
      });
      setForm({ name: '', capacity: '' });
      await refresh();
    } catch (err) {
      const status =
        typeof err === 'object' && err && 'status' in err
          ? Number((err as any).status)
          : undefined;
      if (status === 403) {
        setError('You do not have permission to manage tables for this restaurant.');
      } else {
        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as any).message)
            : 'Failed to create table';
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(table: RestaurantTable) {
    const token = getToken();
    if (!token) return;
    if (!canWrite) return;

    setError(null);
    setToggling((t) => ({ ...t, [table.id]: true }));
    try {
      await updateRestaurantTable(token, restaurantId, table.id, {
        isActive: !table.isActive,
      });
      await refresh();
    } catch (err) {
      const status =
        typeof err === 'object' && err && 'status' in err
          ? Number((err as any).status)
          : undefined;
      if (status === 403) {
        setError('You do not have permission to manage tables for this restaurant.');
      } else {
        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as any).message)
            : 'Failed to update table';
        setError(message);
      }
    } finally {
      setToggling((t) => ({ ...t, [table.id]: false }));
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
            <span className="text-sm font-medium text-zinc-700">Tables</span>
          </div>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900">
            {restaurant ? restaurant.name : 'Restaurant tables'}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage tables for this restaurant.
          </p>
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

      {!canWrite && me ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 shadow-sm">
          You are signed in as <span className="font-medium">{me.role}</span>.
          Table creation and updates are disabled.
        </div>
      ) : null}

      {canWrite ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <div className="text-sm font-semibold text-zinc-900">
              Create table
            </div>
            <div className="text-xs text-zinc-500">Required: name, capacity</div>
          </div>

          <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name *"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Table 1"
              required
            />
            <Input
              label="Capacity *"
              value={form.capacity}
              onChange={(e) =>
                setForm((f) => ({ ...f, capacity: e.target.value }))
              }
              placeholder="4"
              inputMode="numeric"
              required
            />

            <div className="sm:col-span-2 flex items-center justify-end">
              <Button type="submit" disabled={!canSubmit}>
                {submitting ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4">
          <div className="text-sm font-semibold text-zinc-900">Table list</div>
          <div className="text-xs text-zinc-500">
            {loading ? 'Loading…' : `${tables.length} total`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Capacity</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-4 text-zinc-600" colSpan={4}>
                    Loading tables…
                  </td>
                </tr>
              ) : tables.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-zinc-600" colSpan={4}>
                    No tables found.
                  </td>
                </tr>
              ) : (
                tables.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-4 font-medium text-zinc-900">
                      {t.name}
                    </td>
                    <td className="px-6 py-4 text-zinc-700">{t.capacity}</td>
                    <td className="px-6 py-4">
                      <Badge tone={t.isActive ? 'green' : 'zinc'}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="secondary"
                        onClick={() => toggleActive(t)}
                        disabled={!canWrite || toggling[t.id]}
                      >
                        {t.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
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

