import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export interface PadShift {
  id: string;
  company_id: string;
  patient_id: string;
  pad_item_id: string;
  start_at: string;
  end_at: string;
  status: string;
  assigned_professional_id: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  closed_by: string | null;
  closure_note: string | null;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = 'my_shifts';

/**
 * Lista os plantões do profissional logado em um período
 */
export function useMyShifts(from: string, to: string) {
  return useQuery({
    queryKey: [QUERY_KEY, from, to],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_my_shifts', {
        p_from: from,
        p_to: to,
      });

      if (error) throw error;
      return (data || []) as PadShift[];
    },
    enabled: !!from && !!to,
  });
}

/**
 * Busca o plantão ativo do profissional logado
 */
export function useMyActiveShift() {
  return useQuery({
    queryKey: [QUERY_KEY, 'active'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_active_shift');

      if (error) throw error;
      return data as PadShift | null;
    },
    refetchInterval: 30000,
  });
}

/**
 * Fazer check-in em um plantão
 */
export function useShiftCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shiftId, lat, lng }: { shiftId: string; lat?: number; lng?: number }) => {
      const { data, error } = await supabase.rpc('shift_check_in', {
        p_shift_id: shiftId,
        p_lat: lat ?? null,
        p_lng: lng ?? null,
      });

      if (error) throw error;
      return data as PadShift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Check-in realizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error checking in:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao realizar check-in');
    },
  });
}

/**
 * Fazer check-out de um plantão
 */
export function useShiftCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shiftId, lat, lng }: { shiftId: string; lat?: number; lng?: number }) => {
      const { data, error } = await supabase.rpc('shift_check_out', {
        p_shift_id: shiftId,
        p_lat: lat ?? null,
        p_lng: lng ?? null,
      });

      if (error) throw error;
      return data as PadShift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Check-out realizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error checking out:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao realizar check-out');
    },
  });
}
