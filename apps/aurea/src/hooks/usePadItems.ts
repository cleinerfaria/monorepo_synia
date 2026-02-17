import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

const QUERY_KEY = 'pad_items';

export type PadItemType = 'shift' | 'visit' | 'session';
export type PadItemFrequency = 'weekly' | 'biweekly' | 'monthly' | 'bimonthly' | 'quarterly';

export interface PadItem {
  id: string;
  pad_id: string;
  company_id: string;
  type: PadItemType;
  profession_id: string;
  hours_per_day: number | null;
  shift_duration_hours: number | null;
  frequency: PadItemFrequency | null;
  quantity: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type PadItemWithProfession = PadItem & {
  profession: { id: string; name: string } | null;
};

export interface CreatePadItemData {
  pad_id: string;
  type: PadItemType;
  profession_id: string;
  hours_per_day?: number | null;
  shift_duration_hours?: number | null;
  frequency?: PadItemFrequency | null;
  quantity?: number | null;
  is_active?: boolean;
  notes?: string | null;
}

export interface UpdatePadItemData extends Partial<Omit<CreatePadItemData, 'pad_id'>> {
  id: string;
}

export function usePadItems(padId: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, company?.id, padId],
    queryFn: async () => {
      if (!company?.id || !padId) return [];

      const { data, error } = await supabase
        .from('pad_items')
        .select(
          `
          *,
          profession:profession(id, name)
        `
        )
        .eq('company_id', company.id)
        .eq('pad_id', padId)
        .order('type')
        .order('created_at');

      if (error) throw error;
      return data as PadItemWithProfession[];
    },
    enabled: !!company?.id && !!padId,
  });
}

export function useCreatePadItem() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (data: CreatePadItemData) => {
      if (!company?.id) throw new Error('No company');

      const { data: item, error } = await supabase
        .from('pad_items')
        .insert({ ...data, company_id: company.id } as any)
        .select(
          `
          *,
          profession:profession(id, name)
        `
        )
        .single();

      if (error) throw error;
      return item as PadItemWithProfession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Item do PAD criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating PAD item:', error);
      toast.error('Erro ao criar item do PAD');
    },
  });
}

export function useUpdatePadItem() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdatePadItemData) => {
      if (!company?.id) throw new Error('No company');

      const { data: item, error } = await supabase
        .from('pad_items')
        .update(data as any)
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .select(
          `
          *,
          profession:profession(id, name)
        `
        )
        .single();

      if (error) throw error;
      return item as PadItemWithProfession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Item do PAD atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating PAD item:', error);
      toast.error('Erro ao atualizar item do PAD');
    },
  });
}

export function useDeletePadItem() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('pad_items')
        .delete()
        .eq('company_id', company.id)
        .filter('id', 'eq', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Item do PAD excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting PAD item:', error);
      toast.error('Erro ao excluir item do PAD');
    },
  });
}
