import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './authStore';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Reset store before each test
beforeEach(() => {
  useAuthStore.setState({
    session: null,
    user: null,
    appUser: null,
    company: null,
    isLoading: true,
    isInitialized: false,
  });
});

describe('authStore', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.appUser).toBeNull();
      expect(state.company).toBeNull();
      expect(state.isLoading).toBe(true);
      expect(state.isInitialized).toBe(false);
    });
  });

  describe('setSession', () => {
    it('should set session and user', () => {
      const mockSession = {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          created_at: new Date().toISOString(),
        },
      } as any;

      useAuthStore.getState().setSession(mockSession);

      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
      expect(state.user).toEqual(mockSession.user);
    });

    it('should clear user when session is null', () => {
      // First set a session
      useAuthStore.setState({
        session: { user: { id: '123' } } as any,
        user: { id: '123' } as any,
      });

      // Then clear it
      useAuthStore.getState().setSession(null);

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
    });
  });

  describe('setAppUser', () => {
    it('should set app user', () => {
      const mockAppUser = {
        id: 'app-user-123',
        auth_user_id: 'user-123',
        company_id: 'test-company-id',
        name: 'Test User',
        email: 'test@example.com',
        active: true,
        access_profile_id: 'profile-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        theme: null,
        access_profile: {
          id: 'profile-123',
          code: 'admin',
          name: 'Administrador',
          is_admin: true,
        },
      };

      useAuthStore.getState().setAppUser(mockAppUser);

      expect(useAuthStore.getState().appUser).toEqual(mockAppUser);
    });
  });

  describe('setCompany', () => {
    it('should set company', () => {
      const mockCompany = {
        id: 'company-123',
        name: 'Test Company',
        slug: 'test-company',
        active: true,
      };

      useAuthStore.getState().setCompany(mockCompany as any);

      expect(useAuthStore.getState().company).toEqual(mockCompany);
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);

      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
    });
  });

  describe('signOut', () => {
    it('should clear all auth state', async () => {
      // Set up initial state
      useAuthStore.setState({
        session: { access_token: 'token' } as any,
        user: { id: '123' } as any,
        appUser: { id: 'app-123' } as any,
        company: { id: 'company-123' } as any,
      });

      // Sign out
      await useAuthStore.getState().signOut();

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.appUser).toBeNull();
      expect(state.company).toBeNull();
    });
  });

  describe('exitCompany', () => {
    it('should clear company and appUser', () => {
      useAuthStore.setState({
        company: { id: 'company-123' } as any,
        appUser: { id: 'app-123' } as any,
      });

      useAuthStore.getState().exitCompany();

      const state = useAuthStore.getState();
      expect(state.company).toBeNull();
      expect(state.appUser).toBeNull();
    });
  });
});
