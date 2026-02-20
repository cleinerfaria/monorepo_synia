import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useCreatePrescription } from '@/hooks/usePrescriptions';

const { mockRpc, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
  uploadFile: vi.fn(),
}));

vi.mock('@/hooks/useLogs', () => ({
  useLogAction: () => ({
    mutate: vi.fn(),
  }),
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

describe('useCreatePrescription', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it('creates prescription using create_or_upsert_prescription RPC and defaults end date', async () => {
    mockRpc.mockResolvedValue({
      data: [{ prescription_id: 'prescription-1', upserted: false }],
      error: null,
    });

    const { result } = renderHook(() => useCreatePrescription(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      patient_id: 'patient-1',
      professional_id: null,
      status: 'draft',
      type: 'medical',
      start_date: '2026-02-08',
      notes: 'Observacao',
      attachment_url: null,
    });

    expect(mockRpc).toHaveBeenCalledWith('create_or_upsert_prescription', {
      p_patient_id: 'patient-1',
      p_type: 'medical',
      p_start_date: '2026-02-08',
      p_end_date: '2026-02-08',
      p_status: 'draft',
      p_notes: 'Observacao',
      p_professional_id: null,
      p_attachment_url: null,
    });
    expect(response).toEqual({
      id: 'prescription-1',
      upserted: false,
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringMatching(/criad/i));
  });

  it('returns upserted=true and shows updated message when period already exists', async () => {
    mockRpc.mockResolvedValue({
      data: [{ prescription_id: 'prescription-existing', upserted: true }],
      error: null,
    });

    const { result } = renderHook(() => useCreatePrescription(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      patient_id: 'patient-1',
      professional_id: 'professional-1',
      status: 'active',
      type: 'medical',
      start_date: '2026-02-08',
      end_date: '2026-02-14',
      notes: null,
      attachment_url: null,
    });

    expect(response).toEqual({
      id: 'prescription-existing',
      upserted: true,
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringMatching(/atualizado/i));
  });
});
