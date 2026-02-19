import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const searchParamsRef = useRef(searchParams);
  const setSearchParamsRef = useRef(setSearchParams);
  searchParamsRef.current = searchParams;
  setSearchParamsRef.current = setSearchParams;

  const currentPage = useMemo(() => {
    if (storageKey) return sessionPage;
    return parseListPage(searchParams.get(pageParam));
  }, [pageParam, searchParams, sessionPage, storageKey]);

  const setCurrentPage = useCallback(
    (nextPage: PageSetter) => {
      if (storageKey) {
        setSessionPage((previousPage) => {
          const resolvedPage =
            typeof nextPage === 'function'
              ? (nextPage as (currentPage: number) => number)(previousPage)
              : nextPage;
          return clampListPage(resolvedPage);
        });
        return;
      }

      const currentUrlPage = parseListPage(searchParamsRef.current.get(pageParam));
      const resolvedPage =
        typeof nextPage === 'function'
          ? (nextPage as (currentPage: number) => number)(currentUrlPage)
          : nextPage;
      const page = clampListPage(resolvedPage);

      const params = new URLSearchParams(searchParamsRef.current);

      if (page === 1) {
        params.delete(pageParam);
      } else {
        params.set(pageParam, String(page));
      }

      setSearchParamsRef.current(params, { replace: true });
    },
    [pageParam, storageKey]
  );

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    window.sessionStorage.setItem(storageKey, String(sessionPage));
  }, [sessionPage, storageKey]);

  return [currentPage, setCurrentPage] as const;
}
