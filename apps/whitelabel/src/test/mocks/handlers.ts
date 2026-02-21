import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';

// Mock data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
};

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  user: mockUser,
};

export const mockAppUser = {
  id: 'test-app-user-id',
  auth_user_id: mockUser.id,
  company_id: 'test-company-id',
  name: 'Test User',
  email: 'test@example.com',
  active: true,
  access_profile: {
    id: 'test-profile-id',
    code: 'admin',
    name: 'Administrador',
    is_admin: true,
  },
};

export const mockCompany = {
  id: 'test-company-id',
  name: 'Test Company',
  slug: 'test-company',
  active: true,
};

export const mockAccessProfiles = [
  {
    id: 'profile-1',
    company_id: null,
    code: 'admin',
    name: 'Administrador',
    description: 'Acesso total ao sistema',
    is_system: true,
    is_admin: true,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'profile-2',
    company_id: null,
    code: 'viewer',
    name: 'Visualizador',
    description: 'Apenas visualização',
    is_system: true,
    is_admin: false,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Handlers
export const handlers = [
  // Auth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/token`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        access_token: mockSession.access_token,
        refresh_token: mockSession.refresh_token,
        user: mockUser,
      });
    }

    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json(mockUser);
  }),

  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return HttpResponse.json({});
  }),

  // Database endpoints (PostgREST)
  http.get(`${SUPABASE_URL}/rest/v1/app_user`, ({ request }) => {
    const url = new URL(request.url);
    const authUserId = url.searchParams.get('auth_user_id');

    if (authUserId === `eq.${mockUser.id}`) {
      return HttpResponse.json([mockAppUser]);
    }

    return HttpResponse.json([]);
  }),

  http.get(`${SUPABASE_URL}/rest/v1/company`, ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id === `eq.${mockCompany.id}`) {
      return HttpResponse.json([mockCompany]);
    }

    return HttpResponse.json([]);
  }),

  http.get(`${SUPABASE_URL}/rest/v1/access_profile`, () => {
    return HttpResponse.json(mockAccessProfiles);
  }),
];
