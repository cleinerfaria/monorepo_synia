import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Company, SystemUser } from '@/types/database';
import type { AppUserWithProfile } from '@/types/auth'; // New type import
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  appUser: AppUserWithProfile | null;
  company: Company | null;
  systemUser: SystemUser | null;
  hasAnySystemUser: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setAppUser: (appUser: AppUserWithProfile | null) => void;
  setCompany: (company: Company | null) => void;
  setSystemUser: (systemUser: SystemUser | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    companyId: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateCompany: (updates: Partial<Company>) => Promise<void>;
  updateAppUserTheme: (theme: 'light' | 'dark' | 'system') => Promise<void>;
}

async function fetchSystemUserData(userId: string) {
  // Busca o system_user do usuário atual
  const { data: systemUser } = await supabase
    .from('system_user')
    .select('*')
    .eq('auth_user_id', userId)
    .single();

  // Verifica se existe algum system_user cadastrado (para lógica de bootstrap/onboarding)
  const { data: countResult } = await supabase.rpc('count_system_users');
  const hasAnySystemUser = (countResult ?? 0) > 0;

  return {
    systemUser: systemUser as SystemUser | null,
    hasAnySystemUser,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      user: null,
      appUser: null,
      company: null,
      systemUser: null,
      hasAnySystemUser: false,
      isLoading: true,
      isInitialized: false,

      setSession: (session) => set({ session, user: session?.user ?? null }),
      setAppUser: (appUser) => set({ appUser }),
      setCompany: (company) => set({ company }),
      setSystemUser: (systemUser) => set({ systemUser }),
      setLoading: (isLoading) => set({ isLoading }),

      initialize: async () => {
        try {
          set({ isLoading: true });

          // Get current session
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.user) {
            set({ session, user: session.user });

            // Fetch system_user data
            const { systemUser, hasAnySystemUser } = await fetchSystemUserData(session.user.id);
            set({ systemUser, hasAnySystemUser });

            // Fetch app user
            const { data: appUser } = await supabase
              .from('app_user')
              .select('*, access_profile(id, code, name, is_admin)')
              .eq('auth_user_id', session.user.id)
              .single();

            if (appUser) {
              set({ appUser });

              // Fetch company
              const { data: company } = await supabase
                .from('company')
                .select('*')
                .eq('id', appUser.company_id)
                .single();

              if (company) {
                set({ company });
              }
            }
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      signIn: async (email: string, password: string) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;

          // Só define loading como true após confirmar que as credenciais são válidas
          set({ isLoading: true });

          if (data.session?.user) {
            set({ session: data.session, user: data.session.user });

            // Fetch system_user data
            const { systemUser, hasAnySystemUser } = await fetchSystemUserData(
              data.session.user.id
            );
            set({ systemUser, hasAnySystemUser });

            // Fetch app user
            const { data: appUser } = await supabase
              .from('app_user')
              .select('*, access_profile(id, code, name, is_admin)')
              .eq('auth_user_id', data.session.user.id)
              .single();

            if (appUser) {
              set({ appUser });

              // Fetch company
              const { data: company } = await supabase
                .from('company')
                .select('*')
                .eq('id', appUser.company_id)
                .single();

              if (company) {
                set({ company });
              }
            }
          }

          set({ isLoading: false });
          return { error: null };
        } catch (error) {
          return { error: error as Error };
        }
      },

      signUp: async (email: string, password: string, name: string, companyId: string) => {
        try {
          set({ isLoading: true });

          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });

          if (error) throw error;

          if (data.user) {
            // Buscar perfil padrão (viewer) da empresa
            const { data: defaultProfile } = await supabase
              .from('access_profile')
              .select('id')
              .eq('company_id', companyId)
              .eq('code', 'viewer')
              .single();

            // Create app user
            const { data: appUser, error: appUserError } = await supabase
              .from('app_user')
              .insert({
                auth_user_id: data.user.id,
                company_id: companyId,
                name,
                email,
                access_profile_id: defaultProfile?.id,
              } as any)
              .select('*, access_profile(id, code, name, is_admin)')
              .single();

            if (appUserError) throw appUserError;

            set({ appUser: appUser as AppUserWithProfile });
          }

          return { error: null };
        } catch (error) {
          return { error: error as Error };
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({
          session: null,
          user: null,
          appUser: null,
          company: null,
          systemUser: null,
          hasAnySystemUser: false,
        });
      },

      updateCompany: async (updates: Partial<Company>) => {
        const { company } = get();
        if (!company) return;

        const { data, error } = await supabase
          .from('company')
          .update(updates as any)
          .eq('id', company.id)
          .select()
          .single();

        if (!error && data) {
          set({ company: data as Company });
        }
      },

      updateAppUserTheme: async (theme) => {
        const { appUser } = get();
        if (!appUser) return;

        const { data, error } = await supabase
          .from('app_user')
          .update({ theme } as any)
          .eq('id', appUser.id)
          .select('*, access_profile(id, code, name, is_admin)')
          .single();

        if (!error && data) {
          set({ appUser: data as AppUserWithProfile });
        }
      },
    }),
    {
      name: 'aurea-auth',
      partialize: (_state) => ({
        // Don't persist session, it's managed by Supabase
      }),
    }
  )
);
