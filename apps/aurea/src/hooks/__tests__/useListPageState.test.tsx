import { MemoryRouter } from 'react-router-dom';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useListPageState } from '@/hooks/useListPageState';

function createWrapper(initialEntry = '/cadastros/unidades-medida?page=1') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        initialEntries={[initialEntry]}
      >
        {children}
      </MemoryRouter>
    );
  };
}

function usePaginatedSearchHarness() {
  const [currentPage, setCurrentPage] = useListPageState();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setCurrentPage(1);
    setSearchTerm(searchInput);
  }, [searchInput, setCurrentPage]);

  return {
    currentPage,
    searchInput,
    searchTerm,
    setCurrentPage,
    setSearchInput,
  };
}

describe('useListPageState', () => {
  it('keeps page 2 when only pagination changes and search input does not change', async () => {
    const { result } = renderHook(() => usePaginatedSearchHarness(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.currentPage).toBe(1);
    });

    act(() => {
      result.current.setCurrentPage(2);
    });

    await waitFor(() => {
      expect(result.current.currentPage).toBe(2);
    });

    expect(result.current.currentPage).toBe(2);

    act(() => {
      result.current.setSearchInput('caixa');
    });

    await waitFor(() => {
      expect(result.current.currentPage).toBe(1);
      expect(result.current.searchTerm).toBe('caixa');
    });
  });
});
