import { type ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export function Button({ variant = 'primary', className, ...props }: Props) {
  const base =
    'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? 'bg-zinc-900 text-white hover:bg-zinc-800'
      : 'border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50';

  return (
    <button
      {...props}
      className={[base, styles, className].filter(Boolean).join(' ')}
    />
  );
}

