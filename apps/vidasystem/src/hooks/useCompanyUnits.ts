import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type CompanyUnitType = 'matriz' | 'filial';

export interface CompanyUnit {
  id: string;
  name: string;
  trade_name: string | null;
  document: string | null;
  zip: string | null;
  street: string | null;
  district: string | null;
  number: string | null;
  city: string | null;
  state: string | null;
  complement: string | null;
  unit_type: CompanyUnitType;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateCompanyUnitInput {
  company_id: string;
  name: string;
  trade_name?: string | null;
  document?: string | null;
  zip?: string | null;
  street?: string | null;
  district?: string | null;
  number?: string | null;
  city?: string | null;
  state?: string | null;
  complement?: string | null;
  unit_type: CompanyUnitType;
  is_active?: boolean | null;
}

export interface UpdateCompanyUnitInput extends Partial<CreateCompanyUnitInput> {
  id: string;
}

export function useCompanyUnits() {
  return useQuery({
    queryKey: ['company-units'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_unit').select('*').order('name');

      if (error) throw error;
      return data as CompanyUnit[];
    },
  });
}

export function useCompanyUnit(id: string | undefined) {
  return useQuery({
    queryKey: ['company-unit', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase.from('company_unit').select('*').eq('id', id).single();

      if (error) throw error;
      return data as CompanyUnit;
    },
    enabled: !!id,
  });
}

export function useCreateCompanyUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCompanyUnitInput) => {
      const { data, error } = await supabase
        .from('company_unit')
        .insert({
          company_id: input.company_id,
          name: input.name,
          trade_name: input.trade_name || null,
          document: input.document || null,
          zip: input.zip || null,
          street: input.street || null,
          district: input.district || null,
          number: input.number || null,
          city: input.city || null,
          state: input.state || null,
          complement: input.complement || null,
          unit_type: input.unit_type,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CompanyUnit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-units'] });
    },
  });
}

export function useUpdateCompanyUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCompanyUnitInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('company_unit')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CompanyUnit;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company-units'] });
      queryClient.invalidateQueries({ queryKey: ['company-unit', data.id] });
    },
  });
}
