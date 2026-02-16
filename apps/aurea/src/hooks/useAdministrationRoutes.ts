import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type AdministrationRoute = Database['public']['Tables']['administration_routes']['Row'];
type AdministrationRouteInsert = Database['public']['Tables']['administration_routes']['Insert'];
type AdministrationRouteUpdate = Database['public']['Tables']['administration_routes']['Update'];

const QUERY_KEY = 'administration_routes';

export function useAdministrationRoutes() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('administration_routes')
        .select('*')
        .order('prescription_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as AdministrationRoute[];
    },
  });
}

export function useCreateAdministrationRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (route: Omit<AdministrationRouteInsert, 'company_id'>) => {
      // Get current user's company_id
      const { data: userData } = await supabase.from('app_users').select('company_id').single();

      if (!userData?.company_id) {
        throw new Error('Usuário não encontrado');
      }

      const { data, error } = await supabase
        .from('administration_routes')
        .insert({ ...route, company_id: userData.company_id })
        .select()
        .single();

      if (error) throw error;
      return data as AdministrationRoute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateAdministrationRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AdministrationRouteUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('administration_routes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as AdministrationRoute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteAdministrationRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('administration_routes').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
