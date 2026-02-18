import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

const QUERY_KEY = 'pad_services';

export interface PadService {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

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
