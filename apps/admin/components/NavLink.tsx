'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = {
  href: string;
  label: string;
};

export function NavLink({ href, label }: Props) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={[
        'rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-zinc-900 text-white'
          : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900',
      ].join(' ')}
    >
      {label}
    </Link>
  );
}

