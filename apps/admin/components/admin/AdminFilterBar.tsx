'use client';

import { adminFilterRow } from './adminShellClasses';

type Props = { children: React.ReactNode; className?: string };

/** Single filter toolbar row: consistent wrap + vertical alignment. */
export function AdminFilterBar({ children, className = '' }: Props) {
  return <div className={adminFilterRow + (className ? ' ' + className : '')}>{children}</div>;
}
