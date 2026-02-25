import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { PadShift } from '@/hooks/useMyShifts';
import toast from 'react-hot-toast';

const QUERY_KEY = 'pad';

export interface Pad {
  id: string;
  company_id: string;
  patient_id: string;
  patient_payer_id: string | null;
  company_unit_id: string | null;
  professional_id: string | null;
  pad_service_id: string | null;
  start_date: string;
  end_date: string | null;
  start_time: string;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PadWithPatient = Pad & {
  patient: { id: string; name: string };
};

export type ShiftWithProfessional = PadShift & {
  professional: { id: string; name: string } | null;
};

export interface CreatePadData {
  patient_id: string;
  patient_payer_id: string;
  company_unit_id: string | null;
  professional_id: string;
  pad_service_id: string;
  start_date: string;
  end_date?: string | null;
  start_time: string;
  start_at: string;
  end_at: string | null;
  is_active?: boolean;
  notes?: string | null;
}

export interface UpdatePadData extends Partial<CreatePadData> {
  id: string;
}

// ========================================
// Query Hooks
// ========================================

export function usePatientDemands(patientId?: string) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, companyId, patientId],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('pad')
        .select(
          `
          *,
          patient:patient(id, name)
        `
        )
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PadWithPatient[];
    },
    enabled: !!companyId,
  });
}

export function usePatientDemand(demandId: string | undefined) {
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useQuery({
    queryKey: [QUERY_KEY, demandId],
    queryFn: async () => {
      if (!demandId || !company?.id) return null;

      const { data, error } = await supabase
        .from('pad')
        .select(
          `
          *,
          patient:patient(id, name)
        `
        )
        .eq('company_id', company.id)
        .filter('id', 'eq', demandId)
        .single();

      if (error) throw error;
      return data as PadWithPatient;
    },
    enabled: !!demandId && !!company?.id,
  });
}

export function useDemandShifts(demandId: string | undefined, from: string, to: string) {
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useQuery({
    queryKey: [QUERY_KEY, 'shifts', demandId, from, to],
    queryFn: async () => {
      if (!demandId || !company?.id || !from || !to) return [];

      // Buscar pad_items do PAD para filtrar shifts
      const { data: padItems, error: itemsError } = await supabase
        .from('pad_items')
        .select('id')
        .eq('company_id', company.id)
        .eq('pad_id', demandId)
        .eq('type', 'shift');

      if (itemsError) throw itemsError;
      if (!padItems || padItems.length === 0) return [];

      const padItemIds = padItems.map((item) => item.id);

      const { data, error } = await supabase
        .from('pad_shift')
        .select(
          `
          *,
          professional:professional(id, name)
        `
        )
        .eq('company_id', company.id)
        .in('pad_item_id', padItemIds)
        .gte('start_at', `${from}T00:00:00`)
        .lte('start_at', `${to}T23:59:59`)
        .order('start_at');

      if (error) throw error;
      return data as ShiftWithProfessional[];
    },
    enabled: !!demandId && !!company?.id && !!from && !!to,
  });
}

// ========================================
// Mutation Hooks
// ========================================

export function useCreateDemand() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async (data: CreatePadData) => {
      if (!company?.id) throw new Error('No company');

      const { data: pad, error } = await supabase
        .from('pad')
        .insert({ ...data, company_id: company.id } as any)
        .select(
          `
          *,
          patient:patient(id, name)
        `
        )
        .single();

      if (error) throw error;
      return pad as PadWithPatient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('PAD criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating PAD:', error);
      toast.error('Erro ao criar PAD');
    },
  });
}

export function useUpdateDemand() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePadData) => {
      if (!company?.id) throw new Error('No company');

      const { data: pad, error } = await supabase
        .from('pad')
        .update(data as any)
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .select(
          `
          *,
          patient:patient(id, name)
        `
        )
        .single();

      if (error) throw error;
      return pad as PadWithPatient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('PAD atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating PAD:', error);
      toast.error('Erro ao atualizar PAD');
    },
  });
}

export function useDeleteDemand() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('pad')
        .delete()
        .eq('company_id', company.id)
        .filter('id', 'eq', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('PAD excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting PAD:', error);
      toast.error('Erro ao excluir PAD');
    },
  });
}

export function useGenerateShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      padItemId,
      from,
      to,
    }: {
      padItemId: string;
      from: string;
      to: string;
    }) => {
      const { error } = await supabase.rpc('generate_pad_shifts', {
        p_pad_item_id: padItemId,
        p_date_from: from,
        p_date_to: to,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'shifts'] });
      toast.success('Plantões gerados com sucesso!');
    },
    onError: (error) => {
      console.error('Error generating shifts:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar plantões');
    },
  });
}
