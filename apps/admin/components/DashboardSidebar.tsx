'use client';

import Link from 'next/link';
import { AdminThemeToggle } from './AdminThemeControls';
import { Button } from './Button';
import { SideNavLink } from './SideNavLink';
import type { MeResponse } from '../lib/api';

type Props = {
  me: MeResponse | null;
  onLogout: () => void;
  variant?: 'desktop' | 'mobile';
};

function MainNavList({ isPlatform }: { isPlatform: boolean }) {
  return (
    <div className="space-y-0.5">
      <SideNavLink href="/dashboard" label="Dashboard" match="exact" />
      <SideNavLink
        href="/dashboard/restaurants"
        label="Restaurants"
        match="prefix"
      />
      <SideNavLink
        href="/dashboard/events"
        label="Event nights"
        match="prefix"
      />
      <SideNavLink
        href="/dashboard/bookings/pending"
        label="Pending work"
        match="exact"
      />
      <SideNavLink
        href="/dashboard/bookings/restaurants"
        label="Restaurant bookings"
        match="prefix"
      />
      <SideNavLink
        href="/dashboard/bookings/events"
        label="Event bookings"
        match="prefix"
      />
      <SideNavLink
        href="/dashboard/notifications"
        label="Notifications"
        match="exact"
      />
      {isPlatform ? (
        <SideNavLink href="/dashboard/users" label="Users" match="prefix" />
      ) : null}
    </div>
  );
}

function AccountBlock({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="mt-1 space-y-1.5 border-t border-zinc-200/90 pt-2.5 dark:border-zinc-600/60">
      <SideNavLink
        href="/dashboard/account"
        label="Profile & account"
        match="prefix"
      />
      <AdminThemeToggle />
      <Button
        className="w-full"
        type="button"
        variant="secondary"
        onClick={onLogout}
      >
        Logout
      </Button>
    </div>
  );
}

export function DashboardSidebar({
  me: _me,
  onLogout,
  variant = 'desktop',
}: Props) {
  const isPlatform = _me?.role === 'PLATFORM_ADMIN';

  if (variant === 'mobile') {
    return (
      <div className="space-y-2 border border-zinc-200 bg-white p-2 text-left dark:border-zinc-600 dark:bg-zinc-900/95">
        <div className="max-h-[70vh] overflow-y-auto pl-0">
          <MainNavList isPlatform={isPlatform} />
        </div>
        <AccountBlock onLogout={onLogout} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className="shrink-0 border-b border-zinc-200/90 pb-3 dark:border-zinc-600/60">
        <Link
          href="/dashboard"
          className="block text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          eventaat
        </Link>
      </div>
      <nav
        className="mt-3 min-h-0 flex-1 overflow-y-auto pr-0.5"
        aria-label="Main"
      >
        <MainNavList isPlatform={isPlatform} />
      </nav>
      <div className="mt-auto shrink-0 pt-3">
        <AccountBlock onLogout={onLogout} />
      </div>
    </div>
  );
}
