'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLayoutEffect, useState } from 'react';

/**
 * @deprecated — “Pending work” queue removed from navigation; links redirect here, then to dashboard.
 */
export default function PendingWorkCompatRedirect() {
  const r = useRouter();
  const sp = useSearchParams();
  const [d, setD] = useState(false);
  useLayoutEffect(() => {
    const q = sp.toString();
    r.replace('/dashboard' + (q ? `?${q}` : ''));
    setD(true);
  }, [r, sp]);
  if (!d) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Redirecting…</p>
    );
  }
  return null;
}
