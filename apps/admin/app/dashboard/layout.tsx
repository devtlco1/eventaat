'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { DashboardSidebar } from '../../components/DashboardSidebar';
import { getMe, type MeResponse } from '../../lib/api';
import { clearToken, getToken } from '../../lib/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    clearToken();
    setMe(null);
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        router.replace('/login');
        setReady(true);
        return;
      }
      try {
        const u = await getMe(token);
        if (u.role === 'CUSTOMER') {
          clearToken();
          router.replace('/login');
          return;
        }
        setMe(u);
      } catch {
        clearToken();
        router.replace('/login');
      } finally {
        setReady(true);
      }
    })();
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 text-sm text-zinc-600">
        Loading…
      </div>
    );
  }

  if (!getToken() || (me && me.role === 'CUSTOMER')) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 text-sm text-zinc-600">
        Redirecting…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white shadow-sm md:block">
        <div className="flex h-dvh max-h-dvh flex-col">
          <DashboardSidebar me={me} onLogout={logout} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-zinc-200 bg-white md:hidden">
          <details className="group px-3 py-2">
            <summary className="list-none text-sm font-semibold text-zinc-900 after:float-right after:content-['+'] after:text-zinc-500 group-open:after:content-['−']">
              Menu
            </summary>
            <div className="mt-2 -mx-1 max-h-[calc(100dvh-6rem)] overflow-y-auto">
              <DashboardSidebar me={me} onLogout={logout} variant="mobile" />
            </div>
          </details>
        </header>
        <main className="mx-auto min-w-0 w-full max-w-6xl flex-1 overflow-x-auto bg-zinc-50/80 p-4 md:px-8 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
