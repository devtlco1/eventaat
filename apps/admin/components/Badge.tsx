type Props = {
  tone: 'green' | 'zinc';
  children: string;
};

export function Badge({ tone, children }: Props) {
  const cls =
    tone === 'green'
      ? 'border-green-200 bg-green-50 text-green-800'
      : 'border-zinc-200 bg-zinc-50 text-zinc-700';

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

