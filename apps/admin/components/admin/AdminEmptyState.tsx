type Props = { children: React.ReactNode };

export function AdminEmptyState({ children }: Props) {
  return (
    <p className="py-2 text-sm text-zinc-600 dark:text-zinc-400">{children}</p>
  );
}
