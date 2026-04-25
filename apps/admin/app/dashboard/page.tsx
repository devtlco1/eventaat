'use client';

import { useEffect, useState } from 'react';
import { getMe, type MeResponse } from '../../lib/api';
import { getToken } from '../../lib/auth';

export default function DashboardPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await getMe(token);
        if (!cancelled) setMe(res);
      } catch (err) {
        const message =
          typeof err === 'object' && err && 'message' in err
            ? String((err as any).message)
            : 'Failed to load user';
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      {loading ? (
        <div className="text-sm text-zinc-600">Loading…</div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : me ? (
        <div className="space-y-3">
          <div className="text-lg font-semibold text-zinc-900">Signed in</div>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2">
              <span className="text-zinc-600">Email</span>
              <span className="font-medium text-zinc-900">{me.email}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2">
              <span className="text-zinc-600">Role</span>
              <span className="font-medium text-zinc-900">{me.role}</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            Restaurant management UI will be added in later steps.
          </p>
        </div>
      ) : (
        <div className="text-sm text-zinc-600">No user data.</div>
      )}
    </div>
  );
}

