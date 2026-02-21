import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Company } from '@/types/database';

export interface UserCompany extends Company {
  app_user_id: string;
}

/**
 * Hook para buscar todas as empresas de um usuário (via app_user)
 * Útil para usuários comuns que podem ter acesso a múltiplas empresas
 */
export function useUserCompanies() {
  const { session } = useAuthStore();

  return useQuery({
    queryKey: ['user_companies', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        return [];
      }

      // Buscar todos os app_user vinculados a este auth_user_id com active = true
      const { data: appUsers, error: appUsersError } = await supabase
        .from('app_user')
        .select('company_id, id')
        .eq('auth_user_id', session.user.id)
        .eq('active', true);

      if (appUsersError) {
        console.error('Erro ao buscar app_users do usuário:', appUsersError);
        throw appUsersError;
      }

      if (!appUsers || appUsers.length === 0) {
        return [];
      }

      // Extrair IDs de empresas únicas
      const companyIds = [...new Set(appUsers.map((au) => au.company_id))];

      // Buscar dados completos das empresas
      const { data: companies, error: companiesError } = await supabase
        .from('company')
        .select('*')
        .in('id', companyIds);

      if (companiesError) {
        console.error('Erro ao buscar dados das empresas:', companiesError);
        throw companiesError;
      }

      if (!companies) {
        return [];
      }

      // Mapear para formato UserCompany, incluindo app_user_id para referência
      return companies.map((company) => {
        const appUser = appUsers.find((au) => au.company_id === company.id);
        return {
          ...(company as Company),
          app_user_id: appUser?.id || '',
        };
      });
    },
    enabled: !!session?.user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
