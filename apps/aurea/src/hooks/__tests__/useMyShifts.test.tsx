import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useMyShifts,
  useMyActiveShift,
  useShiftCheckIn,
  useShiftCheckOut,
  type PadShift,
} from '@/hooks/useMyShifts';
import { createWrapper, mockAuthStore, mockSupabaseRpc } from '@/test-utils';

const { mockRpc, mockUseAuthStore, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockUseAuthStore: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
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

describe('useMyShifts hooks', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockUseAuthStore.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();

    mockUseAuthStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(mockAuthStore())
    );
  });

  it('disables useMyShifts query when userId is empty', async () => {
    mockUseAuthStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(mockAuthStore({ user: null }))
    );

    renderHook(() => useMyShifts('2026-02-01', '2026-02-29'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  it('disables useMyShifts query when from/to are empty', async () => {
    renderHook(() => useMyShifts('', ''), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  it('calls list_my_shifts RPC and returns pad shifts list', async () => {
    const shifts: PadShift[] = [
      {
        id: 'shift-1',
        company_id: 'company-1',
        patient_id: 'patient-1',
        pad_item_id: 'pad-item-1',
        start_at: '2026-02-20T08:00:00Z',
        end_at: '2026-02-20T20:00:00Z',
        status: 'scheduled',
        assigned_professional_id: 'user-1',
        check_in_at: null,
        check_out_at: null,
        check_in_lat: null,
        check_in_lng: null,
        check_out_lat: null,
        check_out_lng: null,
        closed_by: null,
        closure_note: null,
        created_at: '2026-02-18T10:00:00Z',
        updated_at: '2026-02-18T10:00:00Z',
      },
    ];

    mockRpc.mockImplementation(
      mockSupabaseRpc({
        list_my_shifts: { data: shifts, error: null },
      })
    );

    const { result } = renderHook(() => useMyShifts('2026-02-01', '2026-02-29'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockRpc).toHaveBeenCalledWith('list_my_shifts', {
      p_from: '2026-02-01',
      p_to: '2026-02-29',
    });
    expect(result.current.data).toEqual(shifts);
  });

  it('calls get_my_active_shift RPC and returns active shift or null', async () => {
    const activeShift: PadShift = {
      id: 'shift-active',
      company_id: 'company-1',
      patient_id: 'patient-2',
      pad_item_id: 'pad-item-2',
      start_at: '2026-02-20T08:00:00Z',
      end_at: '2026-02-20T20:00:00Z',
      status: 'in_progress',
      assigned_professional_id: 'user-1',
      check_in_at: '2026-02-20T08:03:00Z',
      check_out_at: null,
      check_in_lat: -23.55,
      check_in_lng: -46.63,
      check_out_lat: null,
      check_out_lng: null,
      closed_by: null,
      closure_note: null,
      created_at: '2026-02-18T10:00:00Z',
      updated_at: '2026-02-20T08:03:00Z',
    };

    mockRpc.mockResolvedValueOnce({ data: activeShift, error: null });
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    const firstHook = renderHook(() => useMyActiveShift(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(firstHook.result.current.isSuccess).toBe(true);
    });
    expect(firstHook.result.current.data).toEqual(activeShift);

    const secondHook = renderHook(() => useMyActiveShift(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => {
      expect(secondHook.result.current.isSuccess).toBe(true);
    });
    expect(secondHook.result.current.data).toBeNull();

    expect(mockRpc).toHaveBeenNthCalledWith(1, 'get_my_active_shift');
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'get_my_active_shift');
  });

  it('calls shift_check_in RPC, invalidates QUERY_KEY and shows success toast', async () => {
    const invalidateSpy = vi
      .spyOn(QueryClient.prototype, 'invalidateQueries')
      .mockResolvedValue(undefined);

    const checkedInShift: PadShift = {
      id: 'shift-1',
      company_id: 'company-1',
      patient_id: 'patient-1',
      pad_item_id: 'pad-item-1',
      start_at: '2026-02-20T08:00:00Z',
      end_at: '2026-02-20T20:00:00Z',
      status: 'in_progress',
      assigned_professional_id: 'user-1',
      check_in_at: '2026-02-20T08:00:00Z',
      check_out_at: null,
      check_in_lat: -23.56,
      check_in_lng: -46.64,
      check_out_lat: null,
      check_out_lng: null,
      closed_by: null,
      closure_note: null,
      created_at: '2026-02-18T10:00:00Z',
      updated_at: '2026-02-20T08:00:00Z',
    };

    mockRpc.mockResolvedValue({ data: checkedInShift, error: null });

    const { result } = renderHook(() => useShiftCheckIn(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      shiftId: 'shift-1',
      lat: -23.56,
      lng: -46.64,
    });

    expect(mockRpc).toHaveBeenCalledWith('shift_check_in', {
      p_shift_id: 'shift-1',
      p_lat: -23.56,
      p_lng: -46.64,
    });
    expect(response).toEqual(checkedInShift);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['my_shifts'] });
    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringMatching(/check-in realizado/i));
  });

  it('shows toast error when shift_check_in RPC fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Falha no check-in');

    mockRpc.mockResolvedValue({ data: null, error });

    const { result } = renderHook(() => useShiftCheckIn(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        shiftId: 'shift-1',
      })
    ).rejects.toThrow('Falha no check-in');

    expect(mockToastError).toHaveBeenCalledWith('Falha no check-in');
    consoleErrorSpy.mockRestore();
  });

  it('calls shift_check_out RPC, invalidates QUERY_KEY and shows success toast', async () => {
    const invalidateSpy = vi
      .spyOn(QueryClient.prototype, 'invalidateQueries')
      .mockResolvedValue(undefined);

    const checkedOutShift: PadShift = {
      id: 'shift-1',
      company_id: 'company-1',
      patient_id: 'patient-1',
      pad_item_id: 'pad-item-1',
      start_at: '2026-02-20T08:00:00Z',
      end_at: '2026-02-20T20:00:00Z',
      status: 'completed',
      assigned_professional_id: 'user-1',
      check_in_at: '2026-02-20T08:00:00Z',
      check_out_at: '2026-02-20T20:01:00Z',
      check_in_lat: -23.56,
      check_in_lng: -46.64,
      check_out_lat: -23.57,
      check_out_lng: -46.65,
      closed_by: null,
      closure_note: null,
      created_at: '2026-02-18T10:00:00Z',
      updated_at: '2026-02-20T20:01:00Z',
    };

    mockRpc.mockResolvedValue({ data: checkedOutShift, error: null });

    const { result } = renderHook(() => useShiftCheckOut(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync({
      shiftId: 'shift-1',
      lat: -23.57,
      lng: -46.65,
    });

    expect(mockRpc).toHaveBeenCalledWith('shift_check_out', {
      p_shift_id: 'shift-1',
      p_lat: -23.57,
      p_lng: -46.65,
    });
    expect(response).toEqual(checkedOutShift);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['my_shifts'] });
    expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringMatching(/check-out realizado/i));
  });

  it('shows toast error when shift_check_out RPC fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Falha no check-out');

    mockRpc.mockResolvedValue({ data: null, error });

    const { result } = renderHook(() => useShiftCheckOut(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        shiftId: 'shift-1',
      })
    ).rejects.toThrow('Falha no check-out');

    expect(mockToastError).toHaveBeenCalledWith('Falha no check-out');
    consoleErrorSpy.mockRestore();
  });
});
