'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLayoutEffect, useState } from 'react';

/**
 * @deprecated Use `/dashboard/bookings/pending`.
 */
export default function LegacyPendingRedirect() {
  const r = useRouter();
  const sp = useSearchParams();
  const [d, setD] = useState(false);
  useLayoutEffect(() => {
    const q = sp.toString();
    r.replace('/dashboard/bookings/pending' + (q ? `?${q}` : ''));
    setD(true);
  }, [r, sp]);
  if (!d) {
    return (
      <p className="text-sm text-zinc-600">Redirecting to pending work…</p>
    );
  }
  return null;
}
