import { useEffect, useMemo, useState } from 'react';

export const CLIENT_PAGE_SIZES = [20, 50, 100] as const;

/**
 * Client-side only until the API supports cursor/server pagination;
 * use for every admin list with the same default page size (20).
 */
export function useClientPagination<T>(items: T[], initialPageSize: 20 | 50 | 100 = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize) || 1);
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);
  useEffect(() => {
    if (page > pageCount) setPage(Math.max(1, pageCount));
  }, [page, pageCount]);
  useEffect(() => {
    setPage(1);
  }, [items, pageSize]);
  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    paged,
    total: items.length,
  };
}
