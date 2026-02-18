import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

const QUERY_KEY = 'pad_services';

export interface PadService {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePadServiceInput {
  code: string;
  name: string;
  description?: string | null;
  sort_order?: number;
  active?: boolean;
}

export interface UpdatePadServiceInput extends Partial<CreatePadServiceInput> {
  id: string;
}

const toNullable = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export function usePadServices(includeInactive = false) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, company?.id, includeInactive],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('pad_service')
        .select('*')
        .eq('company_id', company.id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (!includeInactive) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as PadService[];
    },
    enabled: !!company?.id,
  });
}

export function useCreatePadService() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (input: CreatePadServiceInput) => {
      if (!company?.id) throw new Error('No company');

      const { data, error } = await supabase
        .from('pad_service')
        .insert({
          company_id: company.id,
          code: input.code.trim(),
          name: input.name.trim(),
          description: toNullable(input.description),
          sort_order: Number.isFinite(input.sort_order) ? input.sort_order : 0,
          active: input.active ?? true,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as PadService;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Serviço PAD cadastrado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating PAD service:', error);
      if (error?.code === '23505') {
        toast.error('Já existe um serviço com este código ou nome');
      } else {
        toast.error('Erro ao cadastrar serviço PAD');
      }
    },
  });
}

export function useUpdatePadService() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePadServiceInput) => {
      if (!company?.id) throw new Error('No company');

      const payload: Record<string, any> = {};

      if (updates.code !== undefined) payload.code = updates.code.trim();
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.description !== undefined) payload.description = toNullable(updates.description);
      if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;
      if (updates.active !== undefined) payload.active = updates.active;

      const { data, error } = await supabase
        .from('pad_service')
        .update(payload)
        .eq('id', id)
        .eq('company_id', company.id)
        .select('*')
        .single();

      if (error) throw error;
      return data as PadService;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Serviço PAD atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error updating PAD service:', error);
      if (error?.code === '23505') {
        toast.error('Já existe um serviço com este código ou nome');
      } else {
        toast.error('Erro ao atualizar serviço PAD');
      }
    },
  });
}

export function useTogglePadServiceStatus() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (!company?.id) throw new Error('No company');

      const { data, error } = await supabase
        .from('pad_service')
        .update({ active })
        .eq('id', id)
        .eq('company_id', company.id)
        .select('*')
        .single();

      if (error) throw error;
      return data as PadService;
    },
    onSuccess: (service) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(
        service.active ? 'Serviço PAD ativado com sucesso!' : 'Serviço PAD inativado com sucesso!'
      );
    },
    onError: (error) => {
      console.error('Error toggling PAD service status:', error);
      toast.error('Erro ao alterar status do serviço PAD');
    },
  });
}
