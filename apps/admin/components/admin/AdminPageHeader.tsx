import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  /** Extra line(s) under the description, e.g. a related link. */
  extra?: ReactNode;
};

export function AdminPageHeader({ title, description, extra }: Props) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      {description ? (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      ) : null}
      {extra}
    </div>
  );
}
