/** Shared Tailwind tokens for admin surfaces (light + dark). */

export const adminTableWrap =
  'overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/70';

export const adminTable = 'min-w-full text-left text-sm';

export const adminThead =
  'bg-zinc-100 text-left text-xs font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';

export const adminTbodyRow =
  'divide-y divide-zinc-200 border-zinc-200 dark:divide-zinc-700/60 dark:border-zinc-700/50';

export const adminTableCellHover = 'hover:bg-zinc-50/90 dark:hover:bg-zinc-800/45';

export const adminCard =
  'rounded-lg border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/70';

export const adminInputClass =
  'rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-900 shadow-sm focus:border-amber-500/80 focus:outline-none focus:ring-1 focus:ring-amber-500/50 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:placeholder-zinc-500';

export const adminSelectClass = adminInputClass + ' pr-8';

export const adminFilterRow =
  'flex flex-wrap items-end gap-3 text-sm text-zinc-800 dark:text-zinc-200';
