import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export function useNeedsOnboarding() {
  const { session, appUser, company } = useAuthStore();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        if (!session?.user) {
          setNeedsOnboarding(false);
          setIsChecking(false);
          return;
        }

        // Se tem appUser e company, não precisa onboarding
        if (appUser && company) {
          setNeedsOnboarding(false);
          setIsChecking(false);
          return;
        }

        // Verificar se é um system_user (superadmin)
        const { data: systemUser, error: _systemUserError } = await supabase
          .from('system_user')
          .select('is_superadmin')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (systemUser?.is_superadmin) {
          // Superadmin não precisa de onboarding
          setNeedsOnboarding(false);
          setIsChecking(false);
          return;
        }

        // Verificar se tem empresas na tabela
        const { count: companyCount, error: companiesError } = await supabase
          .from('company')
          .select('id', { count: 'exact', head: true });

        if (companiesError) {
          console.error('Erro ao verificar empresas:', companiesError);
          // Em caso de erro de permissão, assume que não precisa onboarding
          setNeedsOnboarding(false);
          setIsChecking(false);
          return;
        }

        // Se não tem empresas, precisa de onboarding
        setNeedsOnboarding(companyCount === 0);
      } catch (error) {
        console.error('Erro ao verificar onboarding:', error);
        setNeedsOnboarding(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboarding();
  }, [session, appUser, company]);

  return { needsOnboarding, isChecking };
}
