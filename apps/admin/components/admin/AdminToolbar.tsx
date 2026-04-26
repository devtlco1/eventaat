'use client';

import {
  adminToolbar,
  adminToolbarActions,
  adminToolbarFilters,
} from './adminShellClasses';

type Props = {
  /** Filters and search fields (left, wraps). */
  filters: React.ReactNode;
  /** Primary row actions: typically Add (icon) + Refresh (icon), right-aligned. */
  actions?: React.ReactNode;
  className?: string;
};

export function AdminToolbar({ filters, actions, className = '' }: Props) {
  return (
    <div
      className={[adminToolbar, className].filter(Boolean).join(' ')}
      role="toolbar"
      aria-label="Filters and actions"
    >
      <div className={adminToolbarFilters}>{filters}</div>
      {actions ? (
        <div className={adminToolbarActions}>{actions}</div>
      ) : null}
    </div>
  );
}
