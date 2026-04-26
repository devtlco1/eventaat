'use client';

import { Button } from './Button';
import { SideNavLink } from './SideNavLink';
import type { MeResponse } from '../lib/api';

type Props = {
  me: MeResponse | null;
  onLogout: () => void;
  variant?: 'desktop' | 'mobile';
};

function BookingsGroup() {
  return (
    <div>
      <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Bookings
      </div>
      <div className="space-y-0.5 pl-0">
        <SideNavLink
          href="/dashboard/bookings/pending"
          label="All pending & recent"
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
      </div>
    </div>
  );
}

function NavList({ isPlatform }: { isPlatform: boolean }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Main
        </div>
        <div className="space-y-0.5">
          <SideNavLink href="/dashboard" label="Dashboard" match="exact" />
        </div>
      </div>
      <div>
        <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Business
        </div>
        <div className="space-y-0.5">
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
        </div>
      </div>
      <BookingsGroup />
      <div>
        <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Inbox
        </div>
        <div className="space-y-0.5">
          <SideNavLink
            href="/dashboard/notifications"
            label="Notifications"
            match="exact"
          />
        </div>
      </div>
      {isPlatform ? (
        <div>
          <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Platform
          </div>
          <div className="space-y-0.5">
            <SideNavLink
              href="/dashboard/users"
              label="Users"
              match="prefix"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function DashboardSidebar({
  me,
  onLogout,
  variant = 'desktop',
}: Props) {
  const isPlatform = me?.role === 'PLATFORM_ADMIN';
  const roleLine = me?.role ?? '—';

  if (variant === 'mobile') {
    return (
      <div className="space-y-2 border border-zinc-200 bg-white p-2 text-left">
        <div className="px-1 text-xs text-zinc-500">{roleLine}</div>
        <div className="max-h-[70vh] overflow-y-auto pl-0">
          <NavList isPlatform={isPlatform} />
        </div>
        <div className="pt-1">
          <Button
            className="w-full"
            type="button"
            variant="secondary"
            onClick={onLogout}
          >
            Logout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className="shrink-0 border-b border-zinc-200/90 pb-3">
        <div className="text-sm font-bold tracking-tight text-zinc-900">
          eventaat
        </div>
        <div className="text-[10px] font-medium uppercase text-zinc-500">
          Restaurant &amp; events
        </div>
        {me ? (
          <p className="mt-1.5 truncate text-xs text-zinc-600" title={me.email}>
            {me.email}
            <span className="mt-0.5 block text-[10px] font-medium text-zinc-500">
              {roleLine}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-xs text-zinc-500">…</p>
        )}
      </div>
      <nav
        className="mt-3 min-h-0 flex-1 overflow-y-auto pr-0.5"
        aria-label="Main"
      >
        <NavList isPlatform={isPlatform} />
      </nav>
      <div className="mt-3 shrink-0 border-t border-zinc-200/90 pt-3">
        <Button
          className="w-full"
          type="button"
          variant="secondary"
          onClick={onLogout}
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
