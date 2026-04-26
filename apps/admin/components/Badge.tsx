type Props = {
  tone: 'green' | 'zinc' | 'yellow' | 'red' | 'blue';
  children: string;
};

export function Badge({ tone, children }: Props) {
  const cls = (() => {
    switch (tone) {
      case 'green':
        return 'border-green-200 bg-green-50 text-green-800 dark:border-green-800/50 dark:bg-green-950/40 dark:text-green-200';
      case 'yellow':
        return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200';
      case 'red':
        return 'border-red-200 bg-red-50 text-red-800 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-200';
      case 'blue':
        return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-200';
      case 'zinc':
      default:
        return 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600/60 dark:bg-zinc-800/50 dark:text-zinc-200';
    }
  })();

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        cls,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

