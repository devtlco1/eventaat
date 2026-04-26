'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLayoutEffect, useState } from 'react';

/**
 * @deprecated — use `/dashboard/events` (event nights) or the hidden event-booking list.
 */
export default function LegacyEventReservationsRedirect() {
  const r = useRouter();
  const sp = useSearchParams();
  const [d, setD] = useState(false);
  useLayoutEffect(() => {
    const q = sp.toString();
    r.replace('/dashboard/events' + (q ? `?${q}` : ''));
    setD(true);
  }, [r, sp]);
  if (!d) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Redirecting…</p>;
  }
  return null;
}
