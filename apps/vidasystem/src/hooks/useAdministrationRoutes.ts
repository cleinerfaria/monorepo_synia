import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Database } from '@/types/database';

type AdministrationRoute = Database['public']['Tables']['administration_routes']['Row'];
type AdministrationRouteInsert = Database['public']['Tables']['administration_routes']['Insert'];
type AdministrationRouteUpdate = Database['public']['Tables']['administration_routes']['Update'];

const QUERY_KEY = 'administration_routes';

async function resolveCompanyId(currentCompanyId: string | null): Promise<string> {
  if (currentCompanyId) {
    return currentCompanyId;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) {
    throw new Error('Usuario nao autenticado');
  }

  const { data: appUser, error: appUserError } = await supabase
    .from('app_user')
    .select('company_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (appUserError) throw appUserError;
  if (!appUser?.company_id) {
    throw new Error('Usuario nao encontrado');
  }

  return appUser.company_id;
}

export function useAdministrationRoutes() {
  const companyId = useAuthStore((state) => state.appUser?.company_id ?? state.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, companyId],
    queryFn: async () => {
      const scopedCompanyId = await resolveCompanyId(companyId);
      const { data, error } = await supabase
        .from('administration_routes')
        .select('*, active:is_active')
        .eq('company_id', scopedCompanyId)
        .order('prescription_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as AdministrationRoute[];
    },
  });
}

export function useCreateAdministrationRoute() {
  const queryClient = useQueryClient();
  const companyId = useAuthStore((state) => state.appUser?.company_id ?? state.company?.id ?? null);

  return useMutation({
    mutationFn: async (route: Omit<AdministrationRouteInsert, 'company_id'>) => {
      const scopedCompanyId = await resolveCompanyId(companyId);

      const payload: Record<string, any> = { ...route };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      const { data, error } = await supabase
        .from('administration_routes')
        .insert({ ...payload, company_id: scopedCompanyId })
        .select('*, active:is_active')
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
  const companyId = useAuthStore((state) => state.appUser?.company_id ?? state.company?.id ?? null);

  return useMutation({
    mutationFn: async ({ id, ...updates }: AdministrationRouteUpdate & { id: string }) => {
      const scopedCompanyId = await resolveCompanyId(companyId);
      const payload: Record<string, any> = { ...updates };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }
      const { data, error } = await supabase
        .from('administration_routes')
        .update(payload)
        .eq('company_id', scopedCompanyId)
        .eq('id', id)
        .select('*, active:is_active')
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
  const companyId = useAuthStore((state) => state.appUser?.company_id ?? state.company?.id ?? null);

  return useMutation({
    mutationFn: async (id: string) => {
      const scopedCompanyId = await resolveCompanyId(companyId);
      const { error } = await supabase
        .from('administration_routes')
        .delete()
        .eq('company_id', scopedCompanyId)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
