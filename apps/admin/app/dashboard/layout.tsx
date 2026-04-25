'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '../../components/Button';
import { NavLink } from '../../components/NavLink';
import { clearToken, getToken } from '../../lib/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) router.replace('/login');
  }, [router]);

  function logout() {
    clearToken();
    router.replace('/login');
  }

  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm font-semibold text-zinc-900">
                eventaat Admin
              </div>
              <div className="text-xs text-zinc-500">Admin dashboard</div>
            </div>
            <nav className="hidden items-center gap-1 sm:flex">
              <NavLink href="/dashboard" label="Dashboard" />
              <NavLink href="/dashboard/restaurants" label="Restaurants" />
              <NavLink href="/dashboard/users" label="Users" />
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="sm:hidden">
              <NavLink href="/dashboard" label="Dashboard" />
            </div>
            <div className="sm:hidden">
              <NavLink href="/dashboard/restaurants" label="Restaurants" />
            </div>
            <div className="sm:hidden">
              <NavLink href="/dashboard/users" label="Users" />
            </div>
            <Button variant="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}

