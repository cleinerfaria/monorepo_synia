import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Equipment, InsertTables, UpdateTables } from '@/types/database';
import toast from 'react-hot-toast';

const QUERY_KEY = 'equipment';

export function useEquipment() {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('equipment')
        .select(
          `
          *,
          assigned_patient:patient(id, name)
        `
        )
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data as (Equipment & { assigned_patient: { id: string; name: string } | null })[];
    },
    enabled: !!companyId,
  });
}

export function useEquipmentItem(id: string | undefined) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, id, companyId],
    queryFn: async () => {
      if (!id || !companyId) return null;

      const { data, error } = await supabase
        .from('equipment')
        .select(
          `
          *,
          assigned_patient:patient(id, name)
        `
        )
        .eq('company_id', companyId)
        .filter('id', 'eq', id)
        .single();

      if (error) throw error;
      return data as Equipment & { assigned_patient: { id: string; name: string } | null };
    },
    enabled: !!id && !!companyId,
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async (data: Omit<InsertTables<'equipment'>, 'company_id'>) => {
      if (!company?.id) throw new Error('No company');

      const { data: equipment, error } = await supabase
        .from('equipment')
        .insert({ ...data, company_id: company.id } as any)
        .select()
        .single();

      if (error) throw error;
      return equipment as Equipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Equipamento cadastrado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating equipment:', error);
      toast.error('Erro ao cadastrar equipamento');
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTables<'equipment'> & { id: string }) => {
      if (!company?.id) throw new Error('No company');

      const { data: equipment, error } = await supabase
        .from('equipment')
        .update(data as any)
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .select()
        .single();

      if (error) throw error;
      return equipment as Equipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Equipamento atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating equipment:', error);
      toast.error('Erro ao atualizar equipamento');
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('company_id', company.id)
        .filter('id', 'eq', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Equipamento excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting equipment:', error);
      toast.error('Erro ao excluir equipamento');
    },
  });
}

export function useAssignEquipment() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string | null }) => {
      if (!company?.id) throw new Error('No company');

      const { data: equipment, error } = await supabase
        .from('equipment')
        .update({
          assigned_patient_id: patientId,
          assigned_at: patientId ? new Date().toISOString() : null,
          status: patientId ? 'in_use' : 'available',
        } as any)
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .select()
        .single();

      if (error) throw error;
      return equipment as Equipment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(
        variables.patientId
          ? 'Equipamento alocado com sucesso!'
          : 'Equipamento devolvido com sucesso!'
      );
    },
    onError: (error) => {
      console.error('Error assigning equipment:', error);
      toast.error('Erro ao alocar equipamento');
    },
  });
}

export function useUnassignEquipment() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { data: equipment, error } = await supabase
        .from('equipment')
        .update({
          assigned_patient_id: null,
          assigned_at: null,
          status: 'available',
        } as any)
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .select()
        .single();

      if (error) throw error;
      return equipment as Equipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Equipamento devolvido com sucesso!');
    },
    onError: (error) => {
      console.error('Error unassigning equipment:', error);
      toast.error('Erro ao devolver equipamento');
    },
  });
}
