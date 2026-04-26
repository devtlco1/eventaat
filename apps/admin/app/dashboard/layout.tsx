'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  DashboardSidebar,
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from '../../components/DashboardSidebar';
import { DashboardHeaderBar } from '../../components/DashboardHeaderBar';
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const logout = useCallback(() => {
    clearToken();
    setMe(null);
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    setSidebarCollapsed(readSidebarCollapsed());
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => {
      const n = !c;
      writeSidebarCollapsed(n);
      return n;
    });
  }, []);

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
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
        Loading…
      </div>
    );
  }

  if (!getToken() || (me && me.role === 'CUSTOMER')) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
        Redirecting…
      </div>
    );
  }

  const asideW = sidebarCollapsed ? 'w-16' : 'w-56';

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <div className="flex min-h-0 min-w-0 flex-1">
        <aside
          className={[
            'hidden shrink-0 border-r border-zinc-200 bg-white shadow-sm transition-[width] duration-200 dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:shadow-none md:block',
            asideW,
          ].join(' ')}
        >
          <div className="flex h-full max-h-dvh flex-col">
            <DashboardSidebar
              me={me}
              onLogout={logout}
              collapsed={sidebarCollapsed}
              onToggleCollapsed={toggleSidebar}
            />
          </div>
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex min-h-12 shrink-0 items-stretch border-b border-zinc-200 bg-white dark:border-zinc-700/80 dark:bg-zinc-900/95">
            <div className="flex min-w-0 flex-1 items-center">
              <details className="group min-w-0 border-zinc-200 dark:border-zinc-700/80 md:hidden">
                <summary className="list-none px-3 py-2.5 text-sm font-semibold text-zinc-900 after:float-right after:content-['+'] after:text-zinc-500 group-open:after:content-['−'] dark:text-zinc-100 dark:after:text-zinc-500">
                  Menu
                </summary>
                <div className="mt-0 max-h-[calc(100dvh-8rem)] overflow-y-auto border-b border-zinc-200 dark:border-zinc-700/80">
                  <DashboardSidebar
                    me={me}
                    onLogout={logout}
                    collapsed={false}
                    onToggleCollapsed={toggleSidebar}
                    variant="mobile"
                  />
                </div>
              </details>
              <div className="min-w-0 flex-1 md:pl-0">
                <DashboardHeaderBar />
              </div>
            </div>
          </header>
          <main className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto overflow-x-hidden bg-zinc-50/80 p-4 dark:bg-zinc-950/90 md:px-8 md:py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
