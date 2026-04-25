type Props = {
  tone: 'green' | 'zinc' | 'yellow' | 'red' | 'blue';
  children: string;
};

export function Badge({ tone, children }: Props) {
  const cls = (() => {
    switch (tone) {
      case 'green':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'yellow':
        return 'border-amber-200 bg-amber-50 text-amber-800';
      case 'red':
        return 'border-red-200 bg-red-50 text-red-800';
      case 'blue':
        return 'border-blue-200 bg-blue-50 text-blue-800';
      case 'zinc':
      default:
        return 'border-zinc-200 bg-zinc-50 text-zinc-700';
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

