'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../../../../components/Button';
import { Input } from '../../../../../components/Input';
import {
  createRestaurantContact,
  deleteRestaurantContact,
  getMe,
  getRestaurantContacts,
  getRestaurantProfile,
  listRestaurants,
  updateRestaurantProfile,
  type MeResponse,
  type Restaurant,
  type RestaurantContact,
  type RestaurantContactType,
  type RestaurantProfile,
} from '../../../../../lib/api';
import { getToken } from '../../../../../lib/auth';

const TYPES: RestaurantContactType[] = [
  'PHONE',
  'WHATSAPP',
  'INSTAGRAM',
  'WEBSITE',
  'EMAIL',
  'OTHER',
];

export default function RestaurantProfilePage() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId;

  const [me, setMe] = useState<MeResponse | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [contacts, setContacts] = useState<RestaurantContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pf, setPf] = useState({
    websiteUrl: '',
    menuUrl: '',
    locationUrl: '',
    instagramUrl: '',
    coverImageUrl: '',
    profileImageUrl: '',
    shortDescription: '',
    profileDescription: '',
  });

  const [newC, setNewC] = useState({
    label: '',
    type: 'PHONE' as RestaurantContactType,
    value: '',
    isPrimary: false,
  });

  const canWrite = me && me.role !== 'CUSTOMER';

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    const [meRes, list, p, c] = await Promise.all([
      getMe(token),
      listRestaurants(token),
      getRestaurantProfile(token, restaurantId),
      getRestaurantContacts(token, restaurantId),
    ]);
    setMe(meRes);
    setRestaurant(list.find((r) => r.id === restaurantId) ?? null);
    setProfile(p);
    setContacts(c);
    setPf({
      websiteUrl: p.websiteUrl ?? '',
      menuUrl: p.menuUrl ?? '',
      locationUrl: p.locationUrl ?? '',
      instagramUrl: p.instagramUrl ?? '',
      coverImageUrl: p.coverImageUrl ?? '',
      profileImageUrl: p.profileImageUrl ?? '',
      shortDescription: p.shortDescription ?? '',
      profileDescription: p.profileDescription ?? '',
    });
  }, [restaurantId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        if (!cancelled) await load();
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            typeof e === 'object' && e && 'message' in e
              ? String((e as { message: unknown }).message)
              : 'Failed to load profile',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function saveProfile() {
    if (!canWrite) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const p = await updateRestaurantProfile(token, restaurantId, {
        websiteUrl: pf.websiteUrl,
        menuUrl: pf.menuUrl,
        locationUrl: pf.locationUrl,
        instagramUrl: pf.instagramUrl,
        coverImageUrl: pf.coverImageUrl,
        profileImageUrl: pf.profileImageUrl,
        shortDescription: pf.shortDescription,
        profileDescription: pf.profileDescription,
      });
      setProfile(p);
    } catch (e) {
      setError(
        typeof e === 'object' && e && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Failed to save profile',
      );
    } finally {
      setSaving(false);
    }
  }

  async function onAddContact() {
    if (!canWrite) return;
    const token = getToken();
    if (!token) return;
    if (!newC.label.trim() || !newC.value.trim()) {
      setError('Contact label and value are required');
      return;
    }
    setAddBusy(true);
    setError(null);
    try {
      await createRestaurantContact(token, restaurantId, {
        label: newC.label.trim(),
        type: newC.type,
        value: newC.value.trim(),
        isPrimary: newC.isPrimary,
      });
      setNewC({ label: '', type: 'PHONE', value: '', isPrimary: false });
      const c = await getRestaurantContacts(token, restaurantId);
      setContacts(c);
    } catch (e) {
      setError(
        typeof e === 'object' && e && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Failed to add contact',
      );
    } finally {
      setAddBusy(false);
    }
  }

  async function onDeleteContact(id: string) {
    if (!canWrite) return;
    const token = getToken();
    if (!token) return;
    if (!window.confirm('Remove this contact?')) return;
    setError(null);
    try {
      await deleteRestaurantContact(token, restaurantId, id);
      const c = await getRestaurantContacts(token, restaurantId);
      setContacts(c);
    } catch (e) {
      setError(
        typeof e === 'object' && e && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Failed to delete',
      );
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-zinc-500">Loading profile…</div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-2">
        <Link
          className="text-sm font-medium text-zinc-500 underline"
          href="/dashboard/restaurants"
        >
          ← Restaurants
        </Link>
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </div>
      </div>
    );
  }

  if (!me || !profile) {
    return <div className="text-sm text-zinc-600">Not available</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          className="text-sm font-medium text-zinc-500 underline"
          href="/dashboard/restaurants"
        >
          ← Restaurants
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-zinc-900">
          Profile: {restaurant?.name ?? restaurantId}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Public URLs and contact rows (read-only in customer app; editing requires admin).
        </p>
      </div>
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {canWrite ? null : (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You can only view. Editing is for platform and restaurant admins.
        </div>
      )}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Web & images (strings)</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input
            label="Website URL"
            value={pf.websiteUrl}
            onChange={(e) => setPf((f) => ({ ...f, websiteUrl: e.target.value }))}
            disabled={!canWrite}
          />
          <Input
            label="Menu URL"
            value={pf.menuUrl}
            onChange={(e) => setPf((f) => ({ ...f, menuUrl: e.target.value }))}
            disabled={!canWrite}
          />
          <Input
            label="Location (maps) URL"
            value={pf.locationUrl}
            onChange={(e) => setPf((f) => ({ ...f, locationUrl: e.target.value }))}
            disabled={!canWrite}
          />
          <Input
            label="Instagram URL"
            value={pf.instagramUrl}
            onChange={(e) => setPf((f) => ({ ...f, instagramUrl: e.target.value }))}
            disabled={!canWrite}
          />
          <Input
            label="Cover image URL"
            value={pf.coverImageUrl}
            onChange={(e) => setPf((f) => ({ ...f, coverImageUrl: e.target.value }))}
            disabled={!canWrite}
          />
          <Input
            label="Profile image URL"
            value={pf.profileImageUrl}
            onChange={(e) => setPf((f) => ({ ...f, profileImageUrl: e.target.value }))}
            disabled={!canWrite}
          />
        </div>
        <div className="mt-3 space-y-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            <span className="font-medium">Short description</span>
            <textarea
              className="min-h-[80px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              value={pf.shortDescription}
              onChange={(e) => setPf((f) => ({ ...f, shortDescription: e.target.value }))}
              disabled={!canWrite}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-700">
            <span className="font-medium">Profile description</span>
            <textarea
              className="min-h-[100px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              value={pf.profileDescription}
              onChange={(e) => setPf((f) => ({ ...f, profileDescription: e.target.value }))}
              disabled={!canWrite}
            />
          </label>
        </div>
        {canWrite ? (
          <div className="mt-4">
            <Button onClick={() => void saveProfile()} disabled={saving} type="button">
              {saving ? 'Saving…' : 'Save profile fields'}
            </Button>
          </div>
        ) : null}
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Contacts</h2>
        <p className="text-xs text-zinc-500">
          One &quot;primary&quot; per type: marking primary clears others of that type.
        </p>
        <ul className="mt-2 divide-y divide-zinc-100 text-sm text-zinc-800">
          {contacts.length === 0 ? (
            <li className="py-2 text-zinc-500">No contacts yet.</li>
          ) : (
            contacts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{c.label}</span>{' '}
                  <span className="text-zinc-500">({c.type})</span>
                  {c.isPrimary ? <span className="text-emerald-600"> — primary</span> : null}
                  <br />
                  <code className="text-xs break-all text-zinc-600">{c.value}</code>
                </span>
                {canWrite ? (
                  <button
                    type="button"
                    onClick={() => void onDeleteContact(c.id)}
                    className="text-sm text-red-600 underline"
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))
          )}
        </ul>
        {canWrite ? (
          <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                label="Label *"
                value={newC.label}
                onChange={(e) => setNewC((c) => ({ ...c, label: e.target.value }))}
              />
              <label className="flex flex-col gap-1 text-sm text-zinc-700">
                <span className="font-medium">Type *</span>
                <select
                  className="h-10 rounded-md border border-zinc-200 bg-white px-2 text-sm"
                  value={newC.type}
                  onChange={(e) =>
                    setNewC((c) => ({ ...c, type: e.target.value as RestaurantContactType }))
                  }
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Value *"
                value={newC.value}
                onChange={(e) => setNewC((c) => ({ ...c, value: e.target.value }))}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={newC.isPrimary}
                onChange={(e) => setNewC((c) => ({ ...c, isPrimary: e.target.checked }))}
              />
              Primary for this type
            </label>
            <div>
              <Button onClick={() => void onAddContact()} disabled={addBusy} type="button">
                {addBusy ? 'Adding…' : 'Add contact'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
