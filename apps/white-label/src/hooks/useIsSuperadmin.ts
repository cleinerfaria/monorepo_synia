import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useIsSuperadmin() {
  const { session } = useAuthStore();

  const query = useQuery({
    queryKey: ['is_superadmin', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        console.log('[useIsSuperadmin] No session, returning false');
        return false;
      }

      console.log('[useIsSuperadmin] Checking superadmin status for:', session.user.id);

      // First try: query com RLS normal
      const { data, error } = await supabase
        .from('system_user')
        .select('is_superadmin')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.warn('[useIsSuperadmin] RLS Query failed:', error.message);

        // Se falhar, tenta usar a função do Supabase que é SECURITY DEFINER
        // A função is_superadmin() é executada com privilégios do banco, não do usuário
        const { data: funcData, error: funcError } = await supabase.rpc('is_superadmin');

        if (funcError) {
          console.error('[useIsSuperadmin] RPC function error:', funcError);
          return false;
        }

        console.log('[useIsSuperadmin] RPC Result:', funcData);
        return funcData === true;
      }

      const isSuperadmin = (data as any)?.is_superadmin || false;
      console.log('[useIsSuperadmin] RLS Query result:', { is_superadmin: isSuperadmin });
      return isSuperadmin;
    },
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 60, // 1 hora
    retry: 1,
  });

  return {
    ...query,
    // Se tem sessão mas a query ainda não rodou, considera como loading
    isLoading: !!session?.user?.id && (query.isLoading || query.isFetching),
  };
}
