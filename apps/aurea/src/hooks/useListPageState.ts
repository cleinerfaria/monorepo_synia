import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LIST_PAGE_PARAM, clampListPage, parseListPage } from '@/constants/pagination';

type PageSetter = number | ((currentPage: number) => number);
type UseListPageStateOptions = {
  pageParam?: string;
  storageKey?: string;
};

const readSessionPage = (storageKey: string) => {
  if (typeof window === 'undefined') return 1;
  return parseListPage(window.sessionStorage.getItem(storageKey));
};

export function useListPageState(options: string | UseListPageStateOptions = LIST_PAGE_PARAM) {
  const normalizedOptions =
    typeof options === 'string'
      ? { pageParam: options }
      : { pageParam: LIST_PAGE_PARAM, ...options };
  const { pageParam = LIST_PAGE_PARAM, storageKey } = normalizedOptions;

  const [searchParams, setSearchParams] = useSearchParams();
  const [sessionPage, setSessionPage] = useState(() =>
    storageKey ? readSessionPage(storageKey) : 1
  );

  const currentPage = useMemo(() => {
    if (storageKey) return sessionPage;
    return parseListPage(searchParams.get(pageParam));
  }, [pageParam, searchParams, sessionPage, storageKey]);

  const setCurrentPage = useCallback(
    (nextPage: PageSetter) => {
      const computedNextPage =
        typeof nextPage === 'function'
          ? (nextPage as (currentPage: number) => number)(currentPage)
          : nextPage;

      const page = clampListPage(computedNextPage);

      if (storageKey) {
        setSessionPage(page);
        return;
      }

      const params = new URLSearchParams(searchParams);

      if (page === 1) {
        params.delete(pageParam);
      } else {
        params.set(pageParam, String(page));
      }

      setSearchParams(params, { replace: true });
    },
    [currentPage, pageParam, searchParams, setSearchParams, storageKey]
  );

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    window.sessionStorage.setItem(storageKey, String(sessionPage));
  }, [sessionPage, storageKey]);

  return [currentPage, setCurrentPage] as const;
}
