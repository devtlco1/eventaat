type Props = { children: React.ReactNode; className?: string };

export function AdminErrorState({ children, className = '' }: Props) {
  return (
    <div
      className={[
        'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200/95',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
