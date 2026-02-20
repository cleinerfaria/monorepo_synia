import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

type SupabaseResponse<T = unknown> = {
  data: T;
  error: unknown;
};

type QueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  like: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

type QueryBuilderOverride = Partial<QueryBuilder>;
type QueryBuilderFactory = QueryBuilderOverride | (() => QueryBuilderOverride);
type QueryBuilderTableMap = Record<string, QueryBuilderFactory>;

type RpcHandlerArgs = Record<string, unknown> | undefined;
type RpcHandler = (args: RpcHandlerArgs) => SupabaseResponse | Promise<SupabaseResponse>;
type RpcMapValue = SupabaseResponse | RpcHandler;
type RpcMap = Record<string, RpcMapValue>;

function createDefaultQueryBuilder(): QueryBuilder {
  const qb = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    gt: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    lte: vi.fn(),
    like: vi.fn(),
    ilike: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  } as QueryBuilder;

  qb.select.mockReturnThis();
  qb.eq.mockReturnThis();
  qb.neq.mockReturnThis();
  qb.gt.mockReturnThis();
  qb.gte.mockReturnThis();
  qb.lt.mockReturnThis();
  qb.lte.mockReturnThis();
  qb.like.mockReturnThis();
  qb.ilike.mockReturnThis();
  qb.in.mockReturnThis();
  qb.order.mockReturnThis();
  qb.limit.mockReturnThis();
  qb.range.mockReturnThis();
  qb.insert.mockReturnThis();
  qb.update.mockReturnThis();
  qb.upsert.mockReturnThis();
  qb.delete.mockReturnThis();
  qb.single.mockResolvedValue({ data: null, error: null });
  qb.maybeSingle.mockResolvedValue({ data: null, error: null });

  return qb;
}

export function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

export function mockAuthStore(overrides?: Record<string, unknown>) {
  return {
    company: { id: 'company-1' },
    user: { id: 'user-1' },
    ...overrides,
  };
}

export function mockSupabaseFrom(tableMap: QueryBuilderTableMap = {}) {
  return vi.fn((table: string) => {
    const factoryOrConfig = tableMap[table];
    const overrides =
      typeof factoryOrConfig === 'function' ? factoryOrConfig() : (factoryOrConfig ?? {});

    return {
      ...createDefaultQueryBuilder(),
      ...overrides,
    };
  });
}

export function mockSupabaseRpc(fnMap: RpcMap = {}) {
  return vi.fn(async (fnName: string, args?: RpcHandlerArgs) => {
    const handler = fnMap[fnName];

    if (!handler) {
      return { data: null, error: null };
    }

    if (typeof handler === 'function') {
      return handler(args);
    }

    return handler;
  });
}
