import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NavigationGuardProvider } from '@/contexts/NavigationGuardContext';
import { useAuthStore } from '@/stores/authStore';
import { useCurrentUserPermissions } from '@/hooks/useAccessProfiles';
import { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { supabase } from '@/lib/supabase';
import type { Company } from '@/types/database';
import type { AppUserWithProfile } from '@/types/auth';

// Layouts
import DashboardLayout from '@/layouts/DashboardLayout';
import ShiftLayout from '@/layouts/ShiftLayout';

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

// Dashboard
import DashboardPage from '@/pages/DashboardPage';

// Lazy-loaded pages
const PatientsPage = lazy(() => import('@/pages/cadastros/PatientsPage'));
const PatientFormPage = lazy(() => import('@/pages/cadastros/PatientFormPage'));
const ClientsPage = lazy(() => import('@/pages/cadastros/ClientsPage'));
const ProfessionalsPage = lazy(() => import('@/pages/cadastros/ProfessionalsPage'));
const ProfessionalFormPage = lazy(() => import('@/pages/cadastros/ProfessionalFormPage'));
const ProceduresPage = lazy(() => import('@/pages/cadastros/ProceduresPage'));
const ProductsPage = lazy(() => import('@/pages/cadastros/ProductsPage'));
const ProductFormPage = lazy(() => import('@/pages/cadastros/ProductFormPage'));
const EquipmentPage = lazy(() => import('@/pages/cadastros/EquipmentPage'));
const ActiveIngredientsPage = lazy(() => import('@/pages/cadastros/ActiveIngredientsPage'));
const UnitsOfMeasurePage = lazy(() => import('@/pages/cadastros/UnitsOfMeasurePage'));
const ManufacturersPage = lazy(() => import('@/pages/cadastros/ManufacturersPage'));
const SuppliersPage = lazy(() => import('@/pages/cadastros/SuppliersPage'));
const AdministrationRoutesPage = lazy(() => import('@/pages/cadastros/AdministrationRoutesPage'));
const PresentationsPage = lazy(() => import('@/pages/cadastros/PresentationsPage'));
const ProfessionsPage = lazy(() => import('@/pages/cadastros/ProfessionsPage'));
const BusinessPartnersPage = lazy(() => import('@/pages/cadastros/BusinessPartnersPage'));
const CensoPage = lazy(() => import('@/pages/prontuario/CensoPage'));
const ProntuarioRelatoriosPage = lazy(() => import('@/pages/prontuario/RelatoriosPage'));
const PadPage = lazy(() => import('@/pages/prontuario/PadPage'));
const PadFormPage = lazy(() => import('@/pages/prontuario/PadFormPage'));
const PadPreviewPage = lazy(() => import('@/pages/prontuario/PadPreviewPage'));
const PatientMonthSchedulePage = lazy(() => import('@/pages/prontuario/PatientMonthSchedulePage'));
const SchedulesListPage = lazy(() => import('@/pages/prontuario/SchedulesListPage'));
const PrescriptionsPage = lazy(() => import('@/pages/prescriptions/PrescriptionsPage'));
const PrescriptionDetailPage = lazy(() => import('@/pages/prescriptions/PrescriptionDetailPage'));
const StockPage = lazy(() => import('@/pages/stock/StockPage'));
const NfeImportsPage = lazy(() => import('@/pages/nfe/NfeImportsPage'));
const NfeImportDetailPage = lazy(() => import('@/pages/nfe/NfeImportDetailPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const ReferenceTablesPage = lazy(() => import('@/pages/settings/ReferenceTablesPage'));
const UsersSettingsPage = lazy(() => import('@/pages/settings/UsersPage'));
const AccessProfilesPage = lazy(() => import('@/pages/settings/AccessProfilesPage'));
const LogsPage = lazy(() => import('@/pages/settings/LogsPage'));
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'));
const NoAccessPage = lazy(() => import('@/pages/auth/NoAccessPage'));
const MyShiftsPage = lazy(() => import('@/pages/shift/MyShiftsPage'));
const ActiveShiftPage = lazy(() => import('@/pages/shift/ActiveShiftPage'));

// Loading
import { Loading } from '@/components/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Suspense fallback component
function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Loading size="lg" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading, company, appUser, systemUser, hasAnySystemUser } = useAuthStore();
  const { isLoading: isLoadingPermissions } = useCurrentUserPermissions();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (isLoadingPermissions) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    );
  }

  // Usuário sem empresa
  if (!company) {
    // Se é system_user, vai para admin
    if (systemUser) {
      return <Navigate to="/admin" replace />;
    }
    // Se não há system_users cadastrados (bootstrap), vai para admin (onboarding)
    if (!hasAnySystemUser) {
      return <Navigate to="/admin" replace />;
    }
    // Caso contrário, sem acesso
    return <Navigate to="/sem-acesso" replace />;
  }

  // Redirecionamento automático para Meu Plantão apenas para perfil técnico
  if (appUser?.access_profile?.code === 'tecnico') {
    return <Navigate to="/meu-plantao" replace />;
  }

  return <>{children}</>;
}

// Rota exclusiva para usuários shift_only
function ShiftOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading, company, appUser, systemUser, hasAnySystemUser } = useAuthStore();
  const { data: userPermissions = [], isLoading: isLoadingPermissions } =
    useCurrentUserPermissions();
  const hasShiftPageAccess = userPermissions.some(
    (permission) => permission.module_code === 'my_shifts' && permission.permission_code === 'view'
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (isLoadingPermissions) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    );
  }

  if (!company) {
    if (systemUser) return <Navigate to="/admin" replace />;
    if (!hasAnySystemUser) return <Navigate to="/admin" replace />;
    return <Navigate to="/sem-acesso" replace />;
  }

  // Qualquer role pode acessar (admins testando, etc), mas shift_only é o principal
  if (!hasShiftPageAccess && appUser?.access_profile?.code !== 'shift_only') {
    return <Navigate to="/sem-acesso" replace />;
  }

  return <>{children}</>;
}

// Rota especial para admin - requer system_user ou bootstrap (sem system_users)
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading, systemUser, hasAnySystemUser } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Permitir acesso se:
  // 1. É um system_user (superadmin ou não)
  // 2. Não há system_users cadastrados (bootstrap/onboarding)
  if (!systemUser && hasAnySystemUser) {
    return <Navigate to="/sem-acesso" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading, appUser, company, systemUser, hasAnySystemUser } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    );
  }

  if (session) {
    // Se é system_user ou não há system_users (bootstrap), vai para admin
    if (!company && (systemUser || !hasAnySystemUser)) {
      return <Navigate to="/admin" replace />;
    }
    // Se não tem empresa e não é system_user, sem acesso
    if (!company && !appUser) {
      return <Navigate to="/sem-acesso" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setAppUser, setCompany, setSystemUser, setLoading } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const initRef = useRef(false);
  const AUTH_INIT_TIMEOUT_MS = 15000;

  const withTimeout = async <T,>(promiseLike: PromiseLike<T>, timeoutMs: number, context: string) => {
    const promise = Promise.resolve(promiseLike);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${context} timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  const handleClearSession = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.reload();
  };

  const loadUserData = async (userId: string): Promise<boolean> => {
    try {
      // Fetch system_user data
      const { data: systemUserData, error: systemUserError } = await withTimeout(
        supabase.from('system_user').select('*').eq('auth_user_id', userId).maybeSingle(),
        AUTH_INIT_TIMEOUT_MS,
        'load system_user'
      );

      if (systemUserError) {
        throw systemUserError;
      }

      const { data: countResult } = await withTimeout(
        supabase.rpc('count_system_users'),
        AUTH_INIT_TIMEOUT_MS,
        'count system_user'
      );
      const hasAny = (countResult ?? 0) > 0;

      setSystemUser(systemUserData ?? null);
      useAuthStore.setState({ hasAnySystemUser: hasAny });

      // Fetch app_user
      const { data: userData, error: userError } = await withTimeout(
        supabase
          .from('app_user')
          .select('*, access_profile:access_profile_id(id, code, name, is_admin)')
          .eq('auth_user_id', userId)
          .maybeSingle(),
        AUTH_INIT_TIMEOUT_MS,
        'load app_user'
      );

      // Se não tem app_user, permite continuar (system_user ou bootstrap)
      if (userError || !userData) {
        if (userError) {
          console.error('[AuthProvider] app_user query failed:', userError);
        }
        setAppUser(null);
        setCompany(null);
        return true;
      }

      setAppUser(userData as AppUserWithProfile);

      // Fetch company
      const { data: companyData, error: companyError } = await withTimeout(
        supabase
          .from('company')
          .select('*')
          .eq('id', (userData as AppUserWithProfile).company_id)
          .single(),
        AUTH_INIT_TIMEOUT_MS,
        'load company'
      );

      if (companyError || !companyData) {
        setCompany(null);
        return true;
      }

      setCompany(companyData as Company);
      return true;
    } catch (error) {
      console.error('[AuthProvider] Failed to load user bootstrap data:', error);
      setAuthError('Erro ao carregar dados do usuário');
      return false;
    }
  };

  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (initRef.current) return;
    initRef.current = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_INIT_TIMEOUT_MS,
          'getSession at startup'
        );

        if (error) {
          setAuthError('Erro ao verificar sessão');
          setLoading(false);
          setInitialized(true);
          return;
        }

        setSession(session);

        if (session?.user) {
          const success = await loadUserData(session.user.id);

          if (!success) {
            setLoading(false);
            setInitialized(true);
            return;
          }
        }

        setLoading(false);
        setInitialized(true);
      } catch (error) {
        console.error('[AuthProvider] Unexpected auth initialization error:', error);
        setAuthError('Erro inesperado na autenticação');
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setAuthError(null);

      if (event === 'SIGNED_OUT') {
        setAppUser(null);
        setCompany(null);
        setSystemUser(null);
        useAuthStore.setState({ hasAnySystemUser: false });
        setLoading(false);
        return;
      }

      if (session?.user && event === 'SIGNED_IN') {
        setLoading(true);
        const success = await loadUserData(session.user.id);

        if (!success) {
          setLoading(false);
          return;
        }
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800">
          <div className="mb-4 text-5xl text-red-500">⚠️</div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Erro de Autenticação
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">{authError}</p>
          <button
            onClick={handleClearSession}
            className="bg-gold-500 hover:bg-gold-600 rounded-lg px-6 py-2 text-white transition-colors"
          >
            Limpar Sessão e Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />

              <Route
                path="/reset-password"
                element={
                  <PublicRoute>
                    <ResetPasswordPage />
                  </PublicRoute>
                }
              />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <NavigationGuardProvider>
                      <DashboardLayout />
                    </NavigationGuardProvider>
                  </ProtectedRoute>
                }
              >
                {/* Dashboard */}
                <Route index element={<DashboardPage />} />

                {/* Cadastros */}
                <Route
                  path="pacientes"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <PatientsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="pacientes/:id"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <PatientFormPage />
                    </Suspense>
                  }
                />
                <Route
                  path="clientes"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <ClientsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="profissionais"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <ProfessionalsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="profissionais/:id"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <ProfessionalFormPage />
                    </Suspense>
                  }
                />
                <Route
                  path="procedimentos"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <ProceduresPage />
                    </Suspense>
                  }
                />
                <Route
                  path="produtos"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <ProductsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="produtos/:id"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <ProductFormPage />
                    </Suspense>
                  }
                />
                <Route
                  path="equipamentos"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <EquipmentPage />
                    </Suspense>
                  }
                />
                <Route
                  path="principios-ativos"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <ActiveIngredientsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="unidades-medida"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <UnitsOfMeasurePage />
                    </Suspense>
                  }
                />
                <Route
                  path="fabricantes"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <ManufacturersPage />
                    </Suspense>
                  }
                />
                <Route
                  path="fornecedores"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <SuppliersPage />
                    </Suspense>
                  }
                />
                <Route
                  path="vias-administracao"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <AdministrationRoutesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="profissoes"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <ProfessionsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="produto-apresentacao"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <PresentationsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="parceiros-negocio"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <BusinessPartnersPage />
                    </Suspense>
                  }
                />

                {/* Prescrições */}
                <Route
                  path="prescricoes"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <PrescriptionsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="prescricoes/:id"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <PrescriptionDetailPage />
                    </Suspense>
                  }
                />

                {/* Prontuário */}
                <Route
                  path="prontuario/censo"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <CensoPage />
                    </Suspense>
                  }
                />
                <Route
                  path="prontuario/relatorios"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <ProntuarioRelatoriosPage />
                    </Suspense>
                  }
                />
                <Route
                  path="prontuario/pad"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <PadPage />
                    </Suspense>
                  }
                />
                <Route
                  path="prontuario/pad/novo"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <PadFormPage />
                    </Suspense>
                  }
                />
                <Route
                  path="prontuario/pad/:demandId"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <PadFormPage />
                    </Suspense>
                  }
                />
                <Route
                  path="prontuario/pad/:demandId/plantoes"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <PadPreviewPage />
                    </Suspense>
                  }
                />
                <Route
                  path="prontuario/escala/:patientId"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <PatientMonthSchedulePage />
                    </Suspense>
                  }
                />
                <Route
                  path="prontuario/escalas"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <SchedulesListPage />
                    </Suspense>
                  }
                />

                {/* Estoque */}
                <Route
                  path="estoque"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <StockPage />
                    </Suspense>
                  }
                />

                {/* NFe */}
                <Route
                  path="nfe"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <NfeImportsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="nfe/:id"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <NfeImportDetailPage />
                    </Suspense>
                  }
                />

                {/* Configurações */}
                <Route
                  path="configuracoes"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <SettingsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="configuracoes/usuarios"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <UsersSettingsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="configuracoes/perfis-acesso"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <AccessProfilesPage />
                    </Suspense>
                  }
                />
                <Route
                  path="configuracoes/logs"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <LogsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="configuracoes/tabelas-referencia"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <ReferenceTablesPage />
                    </Suspense>
                  }
                />
              </Route>

              {/* Sem Acesso */}
              <Route
                path="/sem-acesso"
                element={
                  <Suspense fallback={<RouteLoader />}>
                    <NoAccessPage />
                  </Suspense>
                }
              />

              {/* Administração - Rota separada que permite acesso sem empresa */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Suspense fallback={<RouteLoader />}>
                      <AdminPage />
                    </Suspense>
                  </AdminRoute>
                }
              />

              {/* Meu Plantão - Layout dedicado para shift_only */}
              <Route
                path="/meu-plantao"
                element={
                  <ShiftOnlyRoute>
                    <NavigationGuardProvider>
                      <ShiftLayout />
                    </NavigationGuardProvider>
                  </ShiftOnlyRoute>
                }
              >
                <Route
                  index
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <MyShiftsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="ativo"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <ActiveShiftPage />
                    </Suspense>
                  }
                />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--toast-bg)',
                  color: 'var(--toast-color)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  boxShadow: '0 10px 40px -15px rgba(0, 0, 0, 0.2)',
                },
                success: {
                  iconTheme: {
                    primary: 'var(--toast-success-icon-primary)',
                    secondary: 'var(--toast-success-icon-secondary)',
                  },
                },
              }}
            />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
