import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { PatientAttendanceShift } from '@/hooks/useMyShifts';
import toast from 'react-hot-toast';

const QUERY_KEY = 'patient_demands';

export interface PatientAttendanceDemand {
  id: string;
  company_id: string;
  patient_id: string;
  start_date: string;
  end_date: string | null;
  hours_per_day: number;
  start_time: string;
  is_split: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DemandWithPatient = PatientAttendanceDemand & {
  patient: { id: string; name: string };
};

export type ShiftWithProfessional = PatientAttendanceShift & {
  professional: { id: string; name: string } | null;
};

export interface CreateDemandData {
  patient_id: string;
  start_date: string;
  end_date?: string | null;
  hours_per_day: number;
  start_time: string;
  is_split: boolean;
  is_active?: boolean;
  notes?: string | null;
}

export interface UpdateDemandData extends Partial<CreateDemandData> {
  id: string;
}

// ========================================
// Query Hooks
// ========================================

export function usePatientDemands(patientId?: string) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, company?.id, patientId],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('patient_attendance_demand')
        .select(`
          *,
          patient:patient(id, name)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DemandWithPatient[];
    },
    enabled: !!company?.id,
  });
}

export function usePatientDemand(demandId: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, demandId],
    queryFn: async () => {
      if (!demandId || !company?.id) return null;

      const { data, error } = await supabase
        .from('patient_attendance_demand')
        .select(`
          *,
          patient:patient(id, name)
        `)
        .eq('company_id', company.id)
        .filter('id', 'eq', demandId)
        .single();

      if (error) throw error;
      return data as DemandWithPatient;
    },
    enabled: !!demandId && !!company?.id,
  });
}

export function useDemandShifts(demandId: string | undefined, from: string, to: string) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, 'shifts', demandId, from, to],
    queryFn: async () => {
      if (!demandId || !company?.id || !from || !to) return [];

      const { data, error } = await supabase
        .from('patient_attendance_shift')
        .select(`
          *,
          professional:professional(id, name)
        `)
        .eq('company_id', company.id)
        .eq('patient_attendance_demand_id', demandId)
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

  return useMutation({
    mutationFn: async (data: CreateDemandData) => {
      if (!company?.id) throw new Error('No company');

      const { data: demand, error } = await supabase
        .from('patient_attendance_demand')
        .insert({ ...data, company_id: company.id } as any)
        .select(`
          *,
          patient:patient(id, name)
        `)
        .single();

      if (error) throw error;
      return demand as DemandWithPatient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Escala criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating demand:', error);
      toast.error('Erro ao criar escala');
    },
  });
}

export function useUpdateDemand() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateDemandData) => {
      if (!company?.id) throw new Error('No company');

      const { data: demand, error } = await supabase
        .from('patient_attendance_demand')
        .update(data as any)
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .select(`
          *,
          patient:patient(id, name)
        `)
        .single();

      if (error) throw error;
      return demand as DemandWithPatient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Escala atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating demand:', error);
      toast.error('Erro ao atualizar escala');
    },
  });
}

export function useDeleteDemand() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('patient_attendance_demand')
        .delete()
        .eq('company_id', company.id)
        .filter('id', 'eq', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Escala excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting demand:', error);
      toast.error('Erro ao excluir escala');
    },
  });
}

export function useGenerateShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      padId,
      from,
      to,
    }: {
      padId: string;
      from: string;
      to: string;
    }) => {
      const { error } = await supabase.rpc('generate_patient_attendance_shifts', {
        p_pad_id: padId,
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
