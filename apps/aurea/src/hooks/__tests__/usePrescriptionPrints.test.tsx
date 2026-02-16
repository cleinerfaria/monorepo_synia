import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  useCreatePrescriptionPrint,
  useFetchPrescriptionPrintSnapshot,
  usePrescriptionPrintHistory,
} from '@/hooks/usePrescriptionPrints';

const { mockRpc, mockFrom, mockUseAuthStore, mockToastSuccess, mockToastError } = vi.hoisted(
  () => ({
    mockRpc: vi.fn(),
    mockFrom: vi.fn(),
    mockUseAuthStore: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
  })
);

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: mockUseAuthStore,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

function createWrapper() {
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

describe('usePrescriptionPrints hooks', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockFrom.mockReset();
    mockUseAuthStore.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();

    mockUseAuthStore.mockReturnValue({
      company: { id: 'company-1' },
    });
  });

  it('loads print history via direct table query (without calling RPC)', async () => {
    const history = [
      {
        id: 'print-1',
        print_number: '1/2026',
        period_start: '2026-02-08',
        period_end: '2026-02-14',
        week_start_day: 0,
        created_at: '2026-02-09T10:00:00Z',
        created_by: 'user-1',
        created_by_name: 'Usuario Teste',
      },
    ];

    const printQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: history.map(({ created_by_name: _ignored, ...rest }) => rest),
        error: null,
      }),
    };

    const userQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ auth_user_id: 'user-1', name: 'Usuario Teste' }],
        error: null,
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'prescription_print') return printQueryBuilder;
      if (table === 'app_user') return userQueryBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    const { result } = renderHook(() => usePrescriptionPrintHistory('prescription-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockRpc).not.toHaveBeenCalled();
    expect(result.current.data).toEqual(history);
  });

  it('falls back to list_prescription_prints RPC when direct query has structural error', async () => {
    const history = [
      {
        id: 'print-1',
        print_number: '1/2026',
        period_start: '2026-02-08',
        period_end: '2026-02-14',
        week_start_day: 0,
        created_at: '2026-02-09T10:00:00Z',
        created_by: 'user-1',
      },
    ];

    const printQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: '42P01',
          message: 'relation "prescription_print" does not exist',
        },
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'prescription_print') return printQueryBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    mockRpc.mockResolvedValue({
      data: [
        {
          ...history[0],
          created_by_name: 'Usuario Teste',
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => usePrescriptionPrintHistory('prescription-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFrom).toHaveBeenCalledWith('prescription_print');
    expect(mockRpc).toHaveBeenCalledWith('list_prescription_prints', {
      p_prescription_id: 'prescription-1',
    });
    expect(result.current.data).toEqual([
      {
        ...history[0],
        created_by_name: 'Usuario Teste',
      },
    ]);
  });

  it('fetches snapshot for reprint via get_prescription_print_snapshot RPC', async () => {
    const snapshot = {
      id: 'print-1',
      prescription_id: 'prescription-1',
      print_number: '1/2026',
      period_start: '2026-02-08',
      period_end: '2026-02-14',
      week_start_day: 0,
      patient_snapshot: {
        name: 'Paciente',
        operadora: 'Operadora',
        birth_date: null,
        age_label: '',
        cpf: null,
      },
      notes_snapshot: null,
      metadata_snapshot: null,
      created_at: '2026-02-09T10:00:00Z',
      created_by: 'user-1',
      created_by_name: 'Usuario Teste',
      items: [],
    };

    mockRpc.mockResolvedValue({
      data: snapshot,
      error: null,
    });

    const { result } = renderHook(() => useFetchPrescriptionPrintSnapshot(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync('print-1');

    expect(mockRpc).toHaveBeenCalledWith('get_prescription_print_snapshot', {
      p_prescription_print_id: 'print-1',
    });
    expect(response).toEqual(snapshot);
  });

  it('creates snapshot and then loads full snapshot via RPC', async () => {
    const fullSnapshot = {
      id: 'print-1',
      prescription_id: 'prescription-1',
      print_number: '1/2026',
      period_start: '2026-02-08',
      period_end: '2026-02-14',
      week_start_day: 0,
      patient_snapshot: {
        name: 'Paciente',
        operadora: 'Operadora',
        birth_date: null,
        age_label: '',
        cpf: null,
      },
      notes_snapshot: 'Observacao',
      metadata_snapshot: {
        professional_name: 'Dr. Teste',
      },
      created_at: '2026-02-09T10:00:00Z',
      created_by: 'user-1',
      created_by_name: 'Usuario Teste',
      items: [],
    };

    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'create_prescription_print_snapshot') {
        return {
          data: [{ prescription_print_id: 'print-1', print_number: '1/2026' }],
          error: null,
        };
      }

      if (fn === 'get_prescription_print_snapshot') {
        return {
          data: fullSnapshot,
          error: null,
        };
      }

      return { data: null, error: null };
    });

    const { result } = renderHook(() => useCreatePrescriptionPrint(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      prescription: {
        id: 'prescription-1',
        notes: 'Observacao',
        patient: {
          name: 'Paciente',
        },
        professional: {
          name: 'Dr. Teste',
          role: 'Medico',
          council_type: 'CRM',
          council_number: '123',
          council_uf: 'SP',
        },
      },
      items: [],
      routes: [],
      periodStart: '2026-02-08',
      periodEnd: '2026-02-14',
      weekStartDay: 0,
      orientation: 'landscape',
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'create_prescription_print_snapshot',
      expect.objectContaining({
        p_prescription_id: 'prescription-1',
        p_period_start: '2026-02-08',
        p_period_end: '2026-02-14',
        p_week_start_day: 0,
        p_items: [],
      })
    );
    expect(mockRpc).toHaveBeenCalledWith('get_prescription_print_snapshot', {
      p_prescription_print_id: 'print-1',
    });

    expect(response).toEqual({
      prescriptionPrintId: 'print-1',
      printNumber: '1/2026',
      snapshot: fullSnapshot,
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('Prescricao impressa com sucesso');
  });
});
