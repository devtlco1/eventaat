'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import {
  getMe,
  patchMyPassword,
  patchMyProfile,
  type MeResponse,
} from '../../../lib/api';
import { getToken } from '../../../lib/auth';

export default function AccountPage() {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const load = useCallback(async () => {
    const t = getToken();
    if (!t) return;
    const u = await getMe(t);
    setUser(u);
    setFullName(u.fullName);
    setPhone(u.phone ?? '');
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        await load();
      } catch (e) {
        setErr(
          e instanceof Error ? e.message : 'Failed to load account',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setErr(null);
    setOk(null);
    setSaving(true);
    try {
      const u = await patchMyProfile(t, {
        fullName: fullName.trim() || undefined,
        phone: phone.trim() === '' ? null : phone.trim(),
      });
      setUser(u);
      setErr(null);
      setOk('Profile saved.');
    } catch (e) {
      setErr(
        typeof e === 'object' && e && 'message' in e
          ? String((e as { message: string }).message)
          : 'Failed to save',
      );
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setPwErr(null);
    setPwOk(null);
    if (newPassword.length < 8) {
      setPwErr('New password must be at least 8 characters.');
      return;
    }
    setPwBusy(true);
    try {
      await patchMyPassword(t, { currentPassword, newPassword });
      setPwOk('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (e) {
      setPwErr(
        typeof e === 'object' && e && 'message' in e
          ? String((e as { message: string }).message)
          : 'Failed to change password',
      );
    } finally {
      setPwBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-300">Loading…</p>
    );
  }
  if (err && !user) {
    return (
      <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800/80 dark:bg-red-950/40 dark:text-red-200">
        {err}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Profile & account
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Your sign-in and contact details. Changes apply to this account only.
        </p>
      </div>

      {user && (
        <div className="rounded-lg border border-zinc-200 bg-white/90 p-4 text-sm dark:border-zinc-700/80 dark:bg-zinc-900/60">
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-[7rem_1fr] sm:gap-x-2">
            <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{user.email}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Role</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">{user.role}</dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Status</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {user.isActive ? 'Active' : 'Inactive'}
            </dd>
            <dt className="text-zinc-500 dark:text-zinc-400">Created</dt>
            <dd className="text-zinc-900 dark:text-zinc-100">
              {new Date(user.createdAt).toLocaleString()}
            </dd>
          </dl>
        </div>
      )}

      <form
        onSubmit={onSaveProfile}
        className="rounded-lg border border-zinc-200 bg-white/90 p-4 dark:border-zinc-700/80 dark:bg-zinc-900/60"
      >
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Profile
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          <Input
            label="Display name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="Optional"
          />
        </div>
        {err && user ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {err}
          </p>
        ) : null}
        {ok ? (
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400/90">
            {ok}
          </p>
        ) : null}
        <div className="mt-4">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>

      <form
        onSubmit={onChangePassword}
        className="rounded-lg border border-zinc-200 bg-white/90 p-4 dark:border-zinc-700/80 dark:bg-zinc-900/60"
      >
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Change password
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          At least 8 characters for the new password.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <Input
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        {pwErr ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {pwErr}
          </p>
        ) : null}
        {pwOk ? (
          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400/90">
            {pwOk}
          </p>
        ) : null}
        <div className="mt-4">
          <Button type="submit" disabled={pwBusy}>
            {pwBusy ? 'Updating…' : 'Update password'}
          </Button>
        </div>
      </form>
    </div>
  );
}
