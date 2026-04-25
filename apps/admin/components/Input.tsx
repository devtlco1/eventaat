import { type InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, className, ...props }: Props) {
  return (
    <label className="flex flex-col gap-2 text-sm text-zinc-700">
      <span className="font-medium">{label}</span>
      <input
        {...props}
        className={[
          'h-10 rounded-md border border-zinc-200 bg-white px-3 text-zinc-900 outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:ring-4',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      />
    </label>
  );
}

