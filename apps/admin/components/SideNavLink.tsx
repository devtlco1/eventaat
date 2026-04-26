'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = {
  href: string;
  label: string;
  /**
   * `prefix`: active when `pathname` equals `href` or is under that segment.
   * `exact` (default): `pathname` must match `href` (use for `/dashboard` overview so child routes are not "Overview").
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
        'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-white/15 text-white'
          : 'text-zinc-300 hover:bg-white/10 hover:text-white',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}
