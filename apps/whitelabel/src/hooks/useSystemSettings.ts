import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Hook para buscar as configuracoes globais do sistema
 * Consumidas por: logo de login, favicon, cor primaria, etc
 */
export function useSystemSettings(name?: string) {
  return useQuery({
    queryKey: ['system_settings', name ?? 'latest'],
    queryFn: async () => {
      const query = supabase.from('system_settings' as any).select('*');

      const { data, error } = name
        ? await query.eq('name', name).single()
        : await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();

      if (error) {
        console.error('Erro ao buscar system_settings:', error);
        return null;
      }

      return data as any;
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    gcTime: 1000 * 60 * 60 * 24, // 24 horas
    retry: 2,
  });
}
