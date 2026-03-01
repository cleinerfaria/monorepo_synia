import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PRIMARY_COLOR } from '@/design-system/theme/constants';

export interface Company {
  id: string;
  name: string;
  trade_name: string | null;
  document: string | null;
  logo_url_expanded_dark: string | null;
  logo_url_collapsed_dark: string | null;
  logo_url_expanded_light: string | null;
  logo_url_collapsed_light: string | null;
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
        primary_color: input.primary_color || DEFAULT_PRIMARY_COLOR,
      };

      const optionalFields: Array<keyof Omit<CreateCompanyInput, 'name' | 'primary_color'>> = [
        'trade_name',
        'document',
        'theme_preference',
        'company_unit_id',
        'care_modality',
        'tax_regime',
        'special_tax_regime',
        'taxation_nature',
        'cnae',
        'cnes',
        'state_registration',
        'email',
        'website',
        'is_active',
      ];

      optionalFields.forEach((field) => {
        if (input[field] !== undefined) {
          insertData[field] = input[field];
        }
      });

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
