'use client';

import { Button } from './Button';
import { CLIENT_PAGE_SIZES } from '../lib/useClientPagination';

type Props = {
  page: number;
  pageCount: number;
  pageSize: number;
  onPageSizeChange: (n: 20 | 50 | 100) => void;
  onPrev: () => void;
  onNext: () => void;
  total: number;
  className?: string;
};

export function AdminPaginationBar({
  page,
  pageCount,
  pageSize,
  onPageSizeChange,
  onPrev,
  onNext,
  total,
  className = '',
}: Props) {
  return (
    <div
      className={[
        'flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm dark:border-zinc-700/50 dark:bg-zinc-800/50',
        className,
      ].join(' ')}
    >
      <div className="text-zinc-600 dark:text-zinc-400">
        {total === 0
          ? '0 items'
          : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
          <span>Rows</span>
          <select
            className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            value={pageSize}
            onChange={(e) =>
              onPageSizeChange(Number(e.target.value) as 20 | 50 | 100)
            }
          >
            {CLIENT_PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <div className="inline-flex items-center gap-0.5">
          <Button
            type="button"
            variant="secondary"
            className="!px-2 !py-1 !text-xs"
            disabled={page <= 1}
            onClick={onPrev}
          >
            Previous
          </Button>
          <span className="px-1 text-xs text-zinc-500">
            {page} / {pageCount}
          </span>
          <Button
            type="button"
            variant="secondary"
            className="!px-2 !py-1 !text-xs"
            disabled={page >= pageCount}
            onClick={onNext}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
