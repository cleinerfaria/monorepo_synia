import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolvedSupabaseUrl } from '@/lib/supabase';
import { DEFAULT_COMPANY_COLOR } from '@/lib/themeConstants';

export interface Company {
  id: string;
  name: string;
  trade_name: string | null;
  document: string | null;
  logo_url: string | null;
  logo_url_expanded_dark: string | null;
  logo_url_collapsed_dark: string | null;
  logo_url_expanded_light: string | null;
  logo_url_collapsed_light: string | null;
  primary_color: string;
  theme_preference: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyInput {
  name: string;
  trade_name?: string;
  document?: string;
  primary_color?: string;
}

export interface UpdateCompanyInput extends Partial<CreateCompanyInput> {
  id: string;
  logo_url?: string | null;
  logo_url_expanded_dark?: string | null;
  logo_url_collapsed_dark?: string | null;
  logo_url_expanded_light?: string | null;
  logo_url_collapsed_light?: string | null;
}

// Buscar todas as empresas (apenas para super admin)
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company').select('*').order('name');

      if (error) throw error;
      return data as Company[];
    },
  });
}

// Buscar empresa por ID
export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase.from('company').select('*').eq('id', id).single();

      if (error) throw error;
      return data as Company;
    },
    enabled: !!id,
  });
}

// Criar empresa via Edge Function
export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCompanyInput) => {
      // Tenta criar diretamente via RLS policies primeiro
      console.log('[useCreateCompany] Trying direct insert via RLS...');

      const { data, error } = await supabase
        .from('company')
        .insert({
          name: input.name,
          trade_name: input.trade_name || null,
          document: input.document || null,
          primary_color: input.primary_color || DEFAULT_COMPANY_COLOR,
        })
        .select()
        .single();

      if (!error && data) {
        console.log('[useCreateCompany] Direct insert success:', data);
        return data as Company;
      }

      // Se falhar com RLS, tenta Edge Function como fallback
      console.warn('[useCreateCompany] Direct insert failed, trying Edge Function...', error);

      // Força refresh da sessão para garantir token válido
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        console.error('Session error:', sessionError);
        throw new Error('Sessão inválida. Faça login novamente.');
      }

      // Log do token para debug (apenas primeiros chars por segurança)
      console.log('[useCreateCompany] Using token:', session.access_token.substring(0, 20) + '...');

      const response = await fetch(`${resolvedSupabaseUrl}/functions/v1/create-company`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          'x-client-info': 'supabase-js-web',
        },
        body: JSON.stringify({
          name: input.name,
          trade_name: input.trade_name || undefined,
          document: input.document || undefined,
          primary_color: input.primary_color || DEFAULT_COMPANY_COLOR,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[useCreateCompany] Edge Function Error:', {
          status: response.status,
          statusText: response.statusText,
          result,
        });

        if (response.status === 401) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }

        throw new Error(result.details || result.error || 'Erro ao criar empresa');
      }

      console.log('[useCreateCompany] Edge Function success:', result);
      return result.company as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

// Atualizar empresa
export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCompanyInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('company')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Company;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', data.id] });
    },
  });
}

// Deletar empresa
export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('company').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}
