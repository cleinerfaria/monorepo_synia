import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppUser, Company } from '@/types/database';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  appUser: AppUser | null;
  company: Company | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setAppUser: (appUser: AppUser | null) => void;
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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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

            // Fetch app user
            const { data: appUser } = await supabase
              .from('app_user')
              .select('*')
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

            // Fetch app user
            const { data: appUser } = await supabase
              .from('app_user')
              .select('*')
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
            // Create app user
            const { data: appUser, error: appUserError } = await supabase
              .from('app_user')
              .insert({
                auth_user_id: data.user.id,
                company_id: companyId,
                name,
                email,
                role: 'viewer',
              } as any)
              .select()
              .single();

            if (appUserError) throw appUserError;

            set({ appUser: appUser as AppUser });
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
    }),
    {
      name: 'aurea-auth',
      partialize: (_state) => ({
        // Don't persist session, it's managed by Supabase
      }),
    }
  )
);
