import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

type AppUser = Database['public']['Tables']['app_user']['Row'];
type Company = Database['public']['Tables']['company']['Row'];
type AccessProfile = Database['public']['Tables']['access_profile']['Row'];

type AppUserWithProfile = AppUser & {
  access_profile: Pick<AccessProfile, 'id' | 'code' | 'name' | 'is_admin'> | null;
};

async function resolveAccessProfileId(companyId: string, code: string) {
  const { data: companyProfile } = await supabase
    .from('access_profile')
    .select('id')
    .eq('company_id', companyId)
    .eq('code', code)
    .maybeSingle();

  if (companyProfile?.id) return companyProfile.id;

  const { data: systemProfile } = await supabase
    .from('access_profile')
    .select('id')
    .is('company_id', null)
    .eq('code', code)
    .maybeSingle();

  return systemProfile?.id || null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  appUser: AppUserWithProfile | null;
  company: Company | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setAppUser: (appUser: AppUserWithProfile | null) => void;
  setCompany: (company: Company | null) => void;
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
  enterCompany: (companyId: string) => Promise<void>;
  exitCompany: () => void;
}

const LAST_COMPANY_KEY = 'gestao-last-company-id';

export const useAuthStore = create<AuthState>()((set, get) => ({
  session: null,
  user: null,
  appUser: null,
  company: null,
  isLoading: true,
  isInitialized: false,

  setSession: (session) => set({ session, user: session?.user ?? null }),
  setAppUser: (appUser) => set({ appUser }),
  setCompany: (company) => set({ company }),
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

        // Tentar restaurar o contexto da última empresa acessada
        const lastCompanyId = localStorage.getItem(LAST_COMPANY_KEY);
        let appUser: AppUserWithProfile | null = null;

        if (lastCompanyId) {
          console.log('[AuthStore] Tentando restaurar contexto da empresa:', lastCompanyId);

          const { data: specificAppUser } = await supabase
            .from('app_user')
            .select('*, access_profile:access_profile_id (id, code, name, is_admin)')
            .eq('auth_user_id', session.user.id)
            .eq('company_id', lastCompanyId)
            .maybeSingle<AppUserWithProfile>();

          if (specificAppUser) {
            appUser = specificAppUser;
          }
        }

        // Se não conseguiu restaurar pelo ID salvo, tenta buscar o primeiro disponível
        if (!appUser) {
          const { data: defaultAppUser } = await supabase
            .from('app_user')
            .select('*, access_profile:access_profile_id (id, code, name, is_admin)')
            .eq('auth_user_id', session.user.id)
            .maybeSingle<AppUserWithProfile>();

          appUser = defaultAppUser;
        }

        if (appUser) {
          // Log para debug apenas se access_profile estiver ausente
          if (!appUser.access_profile) {
            console.warn('[AuthStore] Usuário sem access_profile:', {
              userId: appUser.id,
              access_profile_id: appUser.access_profile_id,
            });
          }

          set({ appUser });

          // Fetch company if user has a company_id
          if (appUser.company_id) {
            const { data: company } = await supabase
              .from('company')
              .select('*')
              .eq('id', appUser.company_id)
              .maybeSingle();

            if (company) {
              set({ company });
              // Garantir que o ID está salvo
              localStorage.setItem(LAST_COMPANY_KEY, company.id);
            }
          }
        } else {
          // If no app_user, check if user exists in system_user (for superadmin flows)
          const { data: systemUser } = await supabase
            .from('system_user')
            .select('name, email')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          if (systemUser) {
            console.log('[AuthStore] System user found:', systemUser.name);
          }

          // Limpar last company id se não encontrou usuário
          localStorage.removeItem(LAST_COMPANY_KEY);
        }
      }
    } catch (error) {
      console.error('[AuthStore] Auth initialization error:', error);
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

        // Fetch app user
        const { data: appUser } = await supabase
          .from('app_user')
          .select('*, access_profile:access_profile_id (id, code, name, is_admin)')
          .eq('auth_user_id', data.session.user.id)
          .maybeSingle<AppUserWithProfile>();

        if (appUser) {
          set({ appUser });

          // Fetch company if user has a company_id
          if (appUser.company_id) {
            const { data: company } = await supabase
              .from('company')
              .select('*')
              .eq('id', appUser.company_id)
              .maybeSingle();

            if (company) {
              set({ company });
              localStorage.setItem(LAST_COMPANY_KEY, company.id);
            }
          }
        } else {
          // If no app_user, check if user exists in system_user (for superadmin flows)
          const { data: systemUser } = await supabase
            .from('system_user')
            .select('name, email')
            .eq('auth_user_id', data.session.user.id)
            .maybeSingle();

          // Store system user info in session metadata for later use
          if (systemUser) {
            console.log('User found in system_user table:', systemUser);
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
        // Create app user
        const { data: appUser, error: appUserError } = await supabase
          .from('app_user')
          .insert({
            auth_user_id: data.user.id,
            company_id: companyId,
            name,
            email,
            access_profile_id: await resolveAccessProfileId(companyId, 'viewer'),
          } as any)
          .select('*, access_profile:access_profile_id (id, code, name, is_admin)')
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
    localStorage.removeItem(LAST_COMPANY_KEY);
    set({
      session: null,
      user: null,
      appUser: null,
      company: null,
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

  enterCompany: async (companyId: string) => {
    try {
      // Buscar dados da empresa
      const { data: companyData, error: companyError } = await supabase
        .from('company')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError || !companyData) {
        throw new Error('Empresa não encontrada');
      }

      // Buscar ou criar app_user para essa empresa
      const { session } = get();
      if (!session?.user) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar se já existe app_user para essa empresa
      let appUser: any;
      const appUserQuery = await supabase
        .from('app_user')
        .select('*, access_profile:access_profile_id (id, code, name, is_admin)')
        .eq('auth_user_id', session.user.id)
        .eq('company_id', companyId)
        .maybeSingle<AppUserWithProfile>();

      const { data, error: _appUserError } = appUserQuery;
      appUser = data;

      // Verificar erro
      if (_appUserError) {
        throw new Error('Erro ao verificar usuário');
      }

      // Se não existe, criar um app_user temporário como admin
      if (!appUser) {
        // Buscar dados do system_user se disponível
        const { data: systemUser } = await supabase
          .from('system_user')
          .select('name, email')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        const userName = systemUser?.name || session.user.email?.split('@')[0] || 'Admin';
        const userEmail = systemUser?.email || session.user.email || '';

        const { data: newAppUser, error: createError } = await supabase
          .from('app_user')
          .upsert(
            {
              auth_user_id: session.user.id,
              company_id: companyId,
              name: userName,
              email: userEmail,
              access_profile_id: await resolveAccessProfileId(companyId, 'admin'),
              active: true,
            },
            {
              onConflict: 'auth_user_id,company_id',
            }
          )
          .select('*, access_profile:access_profile_id (id, code, name, is_admin)')
          .single<AppUserWithProfile>();

        if (createError) {
          throw new Error('Erro ao acessar empresa');
        }

        appUser = newAppUser;
      } else {
        // Se já existe, garantir que está ativo
        if (!appUser.active) {
          const { data: updatedAppUser, error: updateError } = await supabase
            .from('app_user')
            .update({ active: true })
            .eq('id', appUser.id)
            .select('*, access_profile:access_profile_id (id, code, name, is_admin)')
            .single<AppUserWithProfile>();

          if (updateError) {
            throw new Error('Erro ao ativar acesso à empresa');
          }

          appUser = updatedAppUser;
        }
      }

      // Salvar contexto
      localStorage.setItem(LAST_COMPANY_KEY, companyId);

      // Atualizar o estado
      set({
        company: companyData as Company,
        appUser: appUser as AppUserWithProfile,
      });
    } catch (error) {
      console.error('Erro ao entrar na empresa:', error);
      throw error;
    }
  },

  exitCompany: () => {
    localStorage.removeItem(LAST_COMPANY_KEY);
    set({
      company: null,
      appUser: null,
    });
  },
}));
