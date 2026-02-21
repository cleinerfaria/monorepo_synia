import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface CompanyPlanSettings {
  company_id: string;
  whatsapp_instance_limit: number;
  created_at: string;
  updated_at: string;
}

export interface UpsertCompanyPlanSettingsInput {
  company_id: string;
  whatsapp_instance_limit: number;
}

export function useCompanyPlanSettings(companyId?: string) {
  return useQuery({
    queryKey: ['company_plan_settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('company_plan_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data as CompanyPlanSettings | null;
    },
    enabled: !!companyId,
  });
}

export function useUpsertCompanyPlanSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpsertCompanyPlanSettingsInput) => {
      const { data, error } = await supabase
        .from('company_plan_settings')
        .upsert(
          {
            company_id: input.company_id,
            whatsapp_instance_limit: input.whatsapp_instance_limit,
          },
          { onConflict: 'company_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as CompanyPlanSettings;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company_plan_settings', data.company_id] });
    },
  });
}
