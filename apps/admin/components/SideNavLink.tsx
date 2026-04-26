'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = {
  href: string;
  label: string;
  /**
   * `prefix`: active when `pathname` equals `href` or is under that segment.
   * `exact` (default): `pathname` must match `href` (e.g. `/dashboard` not `/dashboard/...` except when exact and path is /dashboard only).
   */
  match?: 'exact' | 'prefix';
};

export function SideNavLink({ href, label, match = 'exact' }: Props) {
  const pathname = usePathname();
  const active =
    match === 'prefix'
      ? pathname === href || pathname.startsWith(`${href}/`)
      : pathname === href;

  return (
    <Link
      href={href}
      className={[
        'block rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-l-2 border-amber-600 bg-zinc-200/60 pl-2 text-zinc-900'
          : 'border-l-2 border-transparent pl-2 text-zinc-600 hover:bg-zinc-100/90 hover:text-zinc-900',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}
