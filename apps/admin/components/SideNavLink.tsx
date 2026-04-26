'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type Props = {
  href: string;
  label: string;
  /**
   * `prefix`: active when `pathname` equals `href` or is under that segment.
   * `exact` (default): `pathname` must match `href` (e.g. `/dashboard` not `/dashboard/...` except when exact and path is /dashboard only).
   */
  match?: 'exact' | 'prefix';
  icon?: ReactNode;
  collapsed?: boolean;
};

export function SideNavLink({
  href,
  label,
  match = 'exact',
  icon,
  collapsed = false,
}: Props) {
  const pathname = usePathname();
  const active =
    match === 'prefix'
      ? pathname === href || pathname.startsWith(`${href}/`)
      : pathname === href;

  if (collapsed && icon) {
    return (
      <Link
        href={href}
        title={label}
        className={[
          'flex h-9 w-9 items-center justify-center rounded-md text-zinc-600 transition-colors dark:text-zinc-300',
          active
            ? 'bg-amber-100/90 text-amber-950 dark:bg-amber-900/40 dark:text-amber-100'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800/80',
        ].join(' ')}
      >
        {icon}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-2 rounded-md py-1.5 pl-2 pr-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-l-2 border-amber-600 bg-zinc-200/60 text-zinc-900 dark:border-amber-500 dark:bg-zinc-700/50 dark:text-zinc-50'
          : 'border-l-2 border-transparent text-zinc-600 hover:bg-zinc-100/90 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-50',
      ].join(' ')}
    >
      {icon ? <span className="shrink-0 opacity-90">{icon}</span> : null}
      {label}
    </Link>
  );
}
