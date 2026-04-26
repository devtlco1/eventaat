'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLayoutEffect, useState } from 'react';

/**
 * @deprecated Use `/dashboard/bookings/restaurants` (query params reserved).
 */
export default function LegacyRestaurantBookingsRedirect() {
  const r = useRouter();
  const sp = useSearchParams();
  const [d, setD] = useState(false);
  useLayoutEffect(() => {
    const q = sp.toString();
    r.replace('/dashboard/bookings/restaurants' + (q ? `?${q}` : ''));
    setD(true);
  }, [r, sp]);
  if (!d) {
    return (
      <p className="text-sm text-zinc-600">Redirecting to restaurant bookings…</p>
    );
  }
  return null;
}
