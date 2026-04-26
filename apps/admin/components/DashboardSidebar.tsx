'use client';

import Link from 'next/link';
import { AdminThemeToggle } from './AdminThemeControls';
import { Button } from './Button';
import {
  IconLayoutDashboard,
  IconUserCircle,
  IconCalendarEvent,
  IconUsers,
  IconStore,
  IconPanelLeftOpen,
  IconPanelLeftClose,
  IconClipboardList,
  IconBell,
  IconLogOut,
} from './NavIcons';
import { SideNavLink } from './SideNavLink';
import type { MeResponse } from '../lib/api';

const SIDEBAR_COLLAPSED_KEY = 'eventaat-admin-sidebar-collapsed';

function isPlatformUser(me: MeResponse | null) {
  return me?.role === 'PLATFORM_ADMIN';
}

type Props = {
  me: MeResponse | null;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  variant?: 'desktop' | 'mobile';
};

function MainNavList({ isPlatform, collapsed }: { isPlatform: boolean; collapsed: boolean }) {
  return (
    <div className={['space-y-0.5', collapsed ? 'flex flex-col items-center gap-1' : ''].join(' ')}>
      <SideNavLink
        href="/dashboard"
        label="Dashboard"
        match="exact"
        icon={<IconLayoutDashboard className="h-4 w-4" />}
        collapsed={collapsed}
      />
      <SideNavLink
        href="/dashboard/restaurants"
        label="Restaurants"
        match="prefix"
        icon={<IconStore className="h-4 w-4" />}
        collapsed={collapsed}
      />
      <SideNavLink
        href="/dashboard/events"
        label="Event nights"
        match="prefix"
        icon={<IconCalendarEvent className="h-4 w-4" />}
        collapsed={collapsed}
      />
      <SideNavLink
        href="/dashboard/bookings/restaurants"
        label="Restaurant Bookings"
        match="prefix"
        icon={<IconClipboardList className="h-4 w-4" />}
        collapsed={collapsed}
      />
      <SideNavLink
        href="/dashboard/notifications"
        label="Notifications"
        match="exact"
        icon={<IconBell className="h-4 w-4" />}
        collapsed={collapsed}
      />
      {isPlatform ? (
        <SideNavLink
          href="/dashboard/users"
          label="Users"
          match="prefix"
          icon={<IconUsers className="h-4 w-4" />}
          collapsed={collapsed}
        />
      ) : null}
    </div>
  );
}

function AccountBlock({ onLogout, collapsed }: { onLogout: () => void; collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="mt-1 flex flex-col items-center gap-1.5 border-t border-zinc-200/90 pt-2.5 dark:border-zinc-600/60">
        <SideNavLink
          href="/dashboard/account"
          label="Account"
          match="prefix"
          icon={<IconUserCircle className="h-4 w-4" />}
          collapsed
        />
        <AdminThemeToggle collapsed />
        <Button
          className="!h-9 !w-9 !p-0"
          type="button"
          variant="secondary"
          title="Log out"
          onClick={onLogout}
        >
          <span className="sr-only">Log out</span>
          <IconLogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }
  return (
    <div className="mt-1 space-y-1.5 border-t border-zinc-200/90 pt-2.5 dark:border-zinc-600/60">
      <SideNavLink
        href="/dashboard/account"
        label="Account"
        match="prefix"
        icon={<IconUserCircle className="h-4 w-4" />}
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

export function readSidebarCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(value: boolean): void {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export { SIDEBAR_COLLAPSED_KEY };

export function DashboardSidebar({
  me: meRes,
  onLogout,
  collapsed,
  onToggleCollapsed,
  variant = 'desktop',
}: Props) {
  const isPlatform = isPlatformUser(meRes);

  if (variant === 'mobile') {
    return (
      <div className="space-y-2 border border-zinc-200 bg-white p-2 text-left dark:border-zinc-600 dark:bg-zinc-900/95">
        <div className="max-h-[70vh] overflow-y-auto pl-0">
          <MainNavList isPlatform={isPlatform} collapsed={false} />
        </div>
        <AccountBlock onLogout={onLogout} collapsed={false} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-2">
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-zinc-200/90 pb-2 dark:border-zinc-600/60">
        {collapsed ? (
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center text-sm font-bold text-zinc-900 dark:text-zinc-50"
            title="eventaat"
          >
            e
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="min-w-0 text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            eventaat
          </Link>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <IconPanelLeftOpen className="h-4 w-4" />
          ) : (
            <IconPanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>
      <nav
        className="mt-2 min-h-0 flex-1 overflow-y-auto pr-0.5"
        aria-label="Main"
      >
        <MainNavList isPlatform={isPlatform} collapsed={collapsed} />
      </nav>
      <div className="mt-auto shrink-0 pt-2">
        <AccountBlock onLogout={onLogout} collapsed={collapsed} />
      </div>
    </div>
  );
}
