'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../../../../components/Button';
import { Input } from '../../../../../components/Input';
import {
  getMe,
  getOpeningHours,
  getOperatingSettings,
  listRestaurants,
  updateOpeningHours,
  updateOperatingSettings,
  type MeResponse,
  type Restaurant,
  type RestaurantOperatingSettings,
} from '../../../../../lib/api';
import { getToken } from '../../../../../lib/auth';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type HourForm = {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
};

export default function RestaurantSettingsPage() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId;

  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [settings, setSettings] = useState<RestaurantOperatingSettings | null>(null);
  const [hourRows, setHourRows] = useState<HourForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingH, setSavingH] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sf, setSf] = useState({
    defaultReservationDurationMinutes: '',
    minPartySize: '',
    maxPartySize: '',
    manualApprovalRequired: true,
    acceptsReservations: true,
    advanceBookingDays: '',
    sameDayCutoffMinutes: '',
  });

  const canWrite = me && me.role !== 'CUSTOMER';

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const [meRes, list, s, h] = await Promise.all([
      getMe(token),
      listRestaurants(token),
      getOperatingSettings(token, restaurantId),
      getOpeningHours(token, restaurantId),
    ]);
    setMe(meRes);
    setRestaurant(list.find((r) => r.id === restaurantId) ?? null);
    setSettings(s);
    setSf({
      defaultReservationDurationMinutes: String(s.defaultReservationDurationMinutes),
      minPartySize: String(s.minPartySize),
      maxPartySize: s.maxPartySize != null ? String(s.maxPartySize) : '',
      manualApprovalRequired: s.manualApprovalRequired,
      acceptsReservations: s.acceptsReservations,
      advanceBookingDays: String(s.advanceBookingDays),
      sameDayCutoffMinutes: String(s.sameDayCutoffMinutes),
    });
    const byDay = new Map(h.map((x) => [x.dayOfWeek, x]));
    const next: HourForm[] = [];
    for (let d = 0; d <= 6; d++) {
      const r = byDay.get(d);
      if (r) {
        next.push({
          dayOfWeek: d,
          opensAt: r.opensAt,
          closesAt: r.closesAt,
          isClosed: r.isClosed,
        });
      } else {
        next.push({ dayOfWeek: d, opensAt: '12:00', closesAt: '23:00', isClosed: false });
      }
    }
    setHourRows(next);
  }, [restaurantId]);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (!c) await load();
      } catch (err) {
        const m =
          typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to load settings';
        if (!c) setError(m);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [load]);

  async function saveSettings() {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const d = parseInt(sf.defaultReservationDurationMinutes, 10);
      const minP = parseInt(sf.minPartySize, 10);
      const adv = parseInt(sf.advanceBookingDays, 10);
      const cut = parseInt(sf.sameDayCutoffMinutes, 10);
      const maxTrim = sf.maxPartySize.trim();
      const maxN = maxTrim === '' ? null : parseInt(maxTrim, 10);
      const maxPartySizePayload =
        maxTrim === '' ? null : maxN != null && Number.isFinite(maxN) ? maxN : undefined;
      const updated = await updateOperatingSettings(token, restaurantId, {
        defaultReservationDurationMinutes: Number.isFinite(d) ? d : undefined,
        minPartySize: Number.isFinite(minP) ? minP : undefined,
        maxPartySize: maxPartySizePayload,
        manualApprovalRequired: sf.manualApprovalRequired,
        acceptsReservations: sf.acceptsReservations,
        advanceBookingDays: Number.isFinite(adv) ? adv : undefined,
        sameDayCutoffMinutes: Number.isFinite(cut) ? cut : undefined,
      });
      setSettings(updated);
    } catch (err) {
      setError(
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to save settings',
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveHours() {
    const token = getToken();
    if (!token) return;
    setSavingH(true);
    setError(null);
    try {
      await updateOpeningHours(
        token,
        restaurantId,
        hourRows.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          opensAt: r.opensAt,
          closesAt: r.closesAt,
          isClosed: r.isClosed,
        })),
      );
      await load();
    } catch (err) {
      setError(
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to save opening hours',
      );
    } finally {
      setSavingH(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-zinc-600">Loading…</div>;
  }
  if (!me || !settings) {
    return <div className="text-sm text-zinc-600">Could not load settings.</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          className="text-sm font-medium text-zinc-600 underline"
          href="/dashboard/restaurants"
        >
          ← Restaurants
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-zinc-900">
          Operating settings
        </h1>
        {restaurant ? (
          <p className="mt-1 text-sm text-zinc-600">{restaurant.name}</p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {canWrite ? null : (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          View only. Editing requires a restaurant or platform admin.
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Request rules</h2>
        <p className="mb-4 text-xs text-zinc-500">
          All times and calendar limits use the API server’s local time (no IANA
          timezone per venue yet).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={sf.acceptsReservations}
              onChange={(e) =>
                setSf((f) => ({ ...f, acceptsReservations: e.target.checked }))
              }
              disabled={!canWrite}
            />
            Accepts reservation requests
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={sf.manualApprovalRequired}
              onChange={(e) =>
                setSf((f) => ({ ...f, manualApprovalRequired: e.target.checked }))
              }
              disabled={!canWrite}
            />
            Manual approval required
          </label>
          <Input
            label="Default duration (min)"
            value={sf.defaultReservationDurationMinutes}
            onChange={(e) =>
              setSf((f) => ({
                ...f,
                defaultReservationDurationMinutes: e.target.value,
              }))
            }
            disabled={!canWrite}
          />
          <Input
            label="Min party"
            value={sf.minPartySize}
            onChange={(e) => setSf((f) => ({ ...f, minPartySize: e.target.value }))}
            disabled={!canWrite}
          />
          <Input
            label="Max party (empty = no cap)"
            value={sf.maxPartySize}
            onChange={(e) => setSf((f) => ({ ...f, maxPartySize: e.target.value }))}
            disabled={!canWrite}
          />
          <Input
            label="Advance booking (days)"
            value={sf.advanceBookingDays}
            onChange={(e) =>
              setSf((f) => ({ ...f, advanceBookingDays: e.target.value }))
            }
            disabled={!canWrite}
          />
          <Input
            label="Same-day lead time (min before start)"
            value={sf.sameDayCutoffMinutes}
            onChange={(e) =>
              setSf((f) => ({ ...f, sameDayCutoffMinutes: e.target.value }))
            }
            disabled={!canWrite}
          />
        </div>
        {canWrite ? (
          <div className="mt-4">
            <Button onClick={() => void saveSettings()} disabled={saving}>
              {saving ? 'Saving…' : 'Save rules'}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Opening hours</h2>
        <p className="mb-4 text-xs text-zinc-500">
          0=Sun … 6=Sat. When closed, reservations for that day are blocked.
        </p>
        <div className="space-y-3">
          {hourRows.map((row, idx) => (
            <div
              key={row.dayOfWeek}
              className="grid grid-cols-1 items-end gap-2 border-b border-zinc-100 pb-3 sm:grid-cols-12"
            >
              <div className="sm:col-span-1 text-sm font-medium text-zinc-800">
                {DAY[row.dayOfWeek]}
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={row.isClosed}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setHourRows((h) => {
                        const c = h.slice();
                        c[idx] = { ...c[idx]!, isClosed: v };
                        return c;
                      });
                    }}
                    disabled={!canWrite}
                  />
                  Closed
                </label>
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="Opens"
                  value={row.opensAt}
                  onChange={(e) => {
                    const v = e.target.value;
                    setHourRows((h) => {
                      const c = h.slice();
                      c[idx] = { ...c[idx]!, opensAt: v };
                      return c;
                    });
                  }}
                  disabled={!canWrite || row.isClosed}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  label="Closes"
                  value={row.closesAt}
                  onChange={(e) => {
                    const v = e.target.value;
                    setHourRows((h) => {
                      const c = h.slice();
                      c[idx] = { ...c[idx]!, closesAt: v };
                      return c;
                    });
                  }}
                  disabled={!canWrite || row.isClosed}
                />
              </div>
            </div>
          ))}
        </div>
        {canWrite ? (
          <div className="mt-4">
            <Button onClick={() => void saveHours()} disabled={savingH}>
              {savingH ? 'Saving…' : 'Save hours'}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
