import { type InputHTMLAttributes } from 'react';
import { adminInputClass } from './admin/adminShellClasses';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, className, ...props }: Props) {
  return (
    <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
      <span className="font-medium leading-none">{label}</span>
      <input
        {...props}
        className={[adminInputClass, 'w-full', className]
          .filter(Boolean)
          .join(' ')}
      />
    </label>
  );
}

