'use client';

import { Button } from './Button';
import { SideNavLink } from './SideNavLink';
import type { MeResponse } from '../lib/api';

type Props = {
  me: MeResponse | null;
  onLogout: () => void;
  /** 'desktop' = full list; 'mobile' = same links, lighter variant */
  variant?: 'desktop' | 'mobile';
};

function NavList({ isPlatform }: { isPlatform: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Main
        </div>
        <div className="space-y-0.5">
          <SideNavLink href="/dashboard" label="Overview" match="exact" />
        </div>
      </div>

      <div>
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Reservations
        </div>
        <div className="space-y-0.5">
          <SideNavLink
            href="/dashboard/operations"
            label="Operations"
            match="exact"
          />
          <SideNavLink
            href="/dashboard/reservations/tables"
            label="Table reservations"
            match="prefix"
          />
          <SideNavLink
            href="/dashboard/reservations/events"
            label="Event reservations"
            match="prefix"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Platform
        </div>
        <div className="space-y-0.5">
          <SideNavLink
            href="/dashboard/restaurants"
            label="Restaurants"
            match="prefix"
          />
          <SideNavLink href="/dashboard/notifications" label="Notifications" />
        </div>
      </div>

      {isPlatform ? (
        <div>
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Administration
          </div>
          <div className="space-y-0.5">
            <SideNavLink href="/dashboard/users" label="Users" match="prefix" />
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
  const roleLine = me?.role ?? '…';

  if (variant === 'mobile') {
    return (
      <div className="space-y-2 border border-zinc-200 bg-zinc-900 p-2 text-left text-zinc-100">
        <div className="px-1 text-xs text-zinc-400">{roleLine}</div>
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
    <div className="flex h-full min-h-0 flex-col p-4">
      <div className="shrink-0">
        <div className="text-sm font-bold tracking-tight text-white">
          eventaat
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">Admin</div>
        {me ? (
          <p className="mt-2 text-xs text-zinc-400" title={me.email}>
            {me.email}
            <span className="mt-1 block font-medium text-zinc-300">
              {roleLine}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">Session…</p>
        )}
      </div>
        <nav
        className="mt-6 min-h-0 flex-1 overflow-y-auto"
        aria-label="Dashboard"
      >
        <NavList isPlatform={isPlatform} />
      </nav>
      <div className="mt-4 shrink-0 border-t border-zinc-700/80 pt-4">
        <Button type="button" variant="secondary" onClick={onLogout}>
          Logout
        </Button>
      </div>
    </div>
  );
}
