import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper, mockAuthStore } from '@/test-utils';
import { useAdministrationRoutes, useCreateAdministrationRoute } from '@/hooks/useAdministrationRoutes';

const { mockFrom, mockGetUser, mockUseAuthStore } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
  mockUseAuthStore: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
    },
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: mockUseAuthStore,
}));

function createQueryBuilder() {
  const qb: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };

  qb.select.mockReturnThis();
  qb.eq.mockReturnThis();
  qb.order.mockReturnThis();
  qb.insert.mockReturnThis();

  return qb;
}

describe('useAdministrationRoutes', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockGetUser.mockReset();
    mockUseAuthStore.mockReset();

    mockUseAuthStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(mockAuthStore())
    );
  });

  it('filters list query by company_id from auth store', async () => {
    const queryBuilder = createQueryBuilder();
    queryBuilder.order
      .mockImplementationOnce(() => queryBuilder)
      .mockImplementationOnce(() =>
        Promise.resolve({
          data: [{ id: 'route-1', name: 'Oral', company_id: 'company-1' }],
          error: null,
        })
      );

    mockFrom.mockImplementation((table: string) => {
      if (table === 'administration_routes') return queryBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useAdministrationRoutes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(queryBuilder.eq).toHaveBeenCalledWith('company_id', 'company-1');
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('resolves company_id via auth user and app_user when store has no company', async () => {
    const appUserBuilder = createQueryBuilder();
    appUserBuilder.maybeSingle.mockResolvedValue({
      data: { company_id: 'company-42' },
      error: null,
    });

    const routeBuilder = createQueryBuilder();
    routeBuilder.single.mockResolvedValue({
      data: { id: 'route-42', name: 'Intravenosa', company_id: 'company-42', is_active: true },
      error: null,
    });

    mockUseAuthStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(mockAuthStore({ company: null, appUser: null }))
    );

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-user-1' } },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'app_user') return appUserBuilder;
      if (table === 'administration_routes') return routeBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => useCreateAdministrationRoute(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      name: 'Intravenosa',
      abbreviation: 'IV',
      description: null,
      prescription_order: 10,
      active: true,
    });

    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(appUserBuilder.eq).toHaveBeenCalledWith('auth_user_id', 'auth-user-1');
    expect(routeBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 'company-42',
      })
    );
  });
});
