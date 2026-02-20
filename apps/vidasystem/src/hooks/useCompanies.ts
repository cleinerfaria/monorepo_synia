import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PRIMARY_COLOR } from '@/design-system/theme/constants';

export interface Company {
  id: string;
  name: string;
  trade_name: string | null;
  document: string | null;
  logo_url: string | null;
  logo_url_expanded?: string | null;
  logo_url_collapsed?: string | null;
  primary_color: string;
  theme_preference: string;
  company_unit_id: string | null;
  care_modality: string | null;
  tax_regime: string | null;
  special_tax_regime: string | null;
  taxation_nature: string | null;
  cnae: string | null;
  cnes: string | null;
  state_registration: string | null;
  email: string | null;
  website: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyInput {
  name: string;
  trade_name?: string;
  document?: string;
  primary_color?: string;
  theme_preference?: string;
  company_unit_id?: string | null;
  care_modality?: string | null;
  tax_regime?: string | null;
  special_tax_regime?: string | null;
  taxation_nature?: string | null;
  cnae?: string | null;
  cnes?: string | null;
  state_registration?: string | null;
  email?: string | null;
  website?: string | null;
  is_active?: boolean | null;
}

export interface UpdateCompanyInput extends Partial<CreateCompanyInput> {
  id: string;
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

// Criar empresa
export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCompanyInput) => {
      const insertData: Record<string, any> = {
        name: input.name,
        trade_name: input.trade_name || null,
        document: input.document || null,
        primary_color: input.primary_color || DEFAULT_PRIMARY_COLOR,
        company_unit_id: input.company_unit_id || null,
        care_modality: input.care_modality || null,
        tax_regime: input.tax_regime || null,
        special_tax_regime: input.special_tax_regime || null,
        taxation_nature: input.taxation_nature || null,
        cnae: input.cnae || null,
        cnes: input.cnes || null,
        state_registration: input.state_registration || null,
        email: input.email || null,
        website: input.website || null,
        is_active: input.is_active ?? true,
      };

      if (input.theme_preference) {
        insertData.theme_preference = input.theme_preference;
      }

      const { data, error } = await supabase.from('company').insert(insertData).select().single();

      if (error) throw error;
      return data as Company;
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
