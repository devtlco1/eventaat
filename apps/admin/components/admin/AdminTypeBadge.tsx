/** Work queue: table (restaurant) vs event **booking** (not event night). */
export function AdminTypeBadge({ type }: { type: 'TABLE' | 'EVENT' }) {
  const isTable = type === 'TABLE';
  return (
    <span
      className={[
        'inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        isTable
          ? 'border-sky-300/80 bg-sky-50 text-sky-900 dark:border-sky-600/50 dark:bg-sky-950/50 dark:text-sky-200'
          : 'border-violet-300/80 bg-violet-50 text-violet-900 dark:border-violet-600/50 dark:bg-violet-950/50 dark:text-violet-200',
      ].join(' ')}
    >
      {isTable ? 'TABLE' : 'EVENT'}
    </span>
  );
}
