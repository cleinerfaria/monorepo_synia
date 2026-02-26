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
const NoAccessPage = lazy(() => import('@/pages/auth/NoAccessPage'));
const MyShiftsPage = lazy(() => import('@/pages/shift/MyShiftsPage'));
const ActiveShiftPage = lazy(() => import('@/pages/shift/ActiveShiftPage'));

// Loading
import { Loading } from '@/components/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
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
  const { session, isLoading, appUser } = useAuthStore();
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

  // Redirecionamento automático para Meu Plantão apenas para perfil técnico
  if (appUser?.access_profile?.code === 'tecnico') {
    return <Navigate to="/meu-plantao" replace />;
  }

  return <>{children}</>;
}

// Rota exclusiva para usuários shift_only
function ShiftOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading, appUser } = useAuthStore();
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

  // Qualquer role pode acessar (admins testando, etc), mas shift_only é o principal
  if (!hasShiftPageAccess && appUser?.access_profile?.code !== 'shift_only') {
    return <Navigate to="/sem-acesso" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setAppUser, setCompany, setSystemUser, setLoading } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const initRef = useRef(false);
  const QUERY_TIMEOUT_MS = 10000; // Timeout for individual Supabase queries

  const withTimeout = async <T,>(
    promiseLike: PromiseLike<T>,
    timeoutMs: number,
    context: string
  ) => {
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

  const loadUserDataOnce = async (userId: string): Promise<boolean> => {
    // Parallelize independent queries: system_user and app_user can load simultaneously
    const [systemUserResult, countResult, appUserResult] = await Promise.all([
      withTimeout(
        supabase.from('system_user').select('*').eq('auth_user_id', userId).maybeSingle(),
        QUERY_TIMEOUT_MS,
        'load system_user'
      ),
      withTimeout(supabase.rpc('count_system_users'), QUERY_TIMEOUT_MS, 'count system_user'),
      withTimeout(
        supabase
          .from('app_user')
          .select('*, access_profile:access_profile_id(id, code, name, is_admin)')
          .eq('auth_user_id', userId)
          .maybeSingle(),
        QUERY_TIMEOUT_MS,
        'load app_user'
      ),
    ]);

    const { data: systemUserData, error: systemUserError } = systemUserResult;
    const { data: countData } = countResult;
    const { data: userData, error: userError } = appUserResult;

    if (systemUserError) {
      throw systemUserError;
    }

    if (userError) {
      throw userError;
    }

    const hasAny = (countData ?? 0) > 0;
    setSystemUser(systemUserData ?? null);
    useAuthStore.setState({ hasAnySystemUser: hasAny });

    // Se nao tem app_user, permite continuar (system_user ou bootstrap)
    if (!userData) {
      setAppUser(null);
      setCompany(null);
      return true;
    }

    setAppUser(userData as AppUserWithProfile);

    // Fetch company (depends on app_user, so must be sequential)
    const { data: companyData, error: companyError } = await withTimeout(
      supabase
        .from('company')
        .select('*')
        .eq('id', (userData as AppUserWithProfile).company_id)
        .single(),
      QUERY_TIMEOUT_MS,
      'load company'
    );

    if (companyError) {
      throw companyError;
    }

    if (!companyData) {
      setCompany(null);
      return true;
    }

    setCompany(companyData as Company);
    return true;
  };

  const loadUserData = async (userId: string): Promise<boolean> => {
    const MAX_RETRIES = 1;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await loadUserDataOnce(userId);
      } catch (error) {
        console.error(
          `[AuthProvider] Failed to load user data (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`,
          error
        );
        if (attempt < MAX_RETRIES) {
          // Aguarda antes de tentar novamente (exponential backoff: 2s, 4s, etc)
          const delayMs = 2000 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        // Última tentativa falhou — limpar dados e continuar
        setSystemUser(null);
        useAuthStore.setState({ hasAnySystemUser: false });
        setAppUser(null);
        setCompany(null);
        return true;
      }
    }
    return true;
  };

  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (initRef.current) return;
    initRef.current = true;

    // getSession() para inicialização: funciona em dev (StrictMode) e prod
    const initAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await withTimeout(
          supabase.auth.getSession(),
          QUERY_TIMEOUT_MS,
          'getSession at startup'
        );

        if (error) {
          console.error('[AuthProvider] Session error:', error);
          setLoading(false);
          setInitialized(true);
          return;
        }

        setSession(session);

        if (session?.user) {
          await loadUserData(session.user.id);
        }

        setLoading(false);
        setInitialized(true);
      } catch (error) {
        console.error('[AuthProvider] Unexpected auth initialization error:', error);
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();

    // onAuthStateChange para eventos subsequentes (login, logout, refresh token)
    // CRITICAL: Supabase auth-js v2 awaits callbacks inside _notifyAllSubscribers.
    // REST calls inside the callback call getSession() which waits for _initialize(),
    // creating a DEADLOCK. Use setTimeout(0) to defer REST calls to the next tick.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthError(null);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setAppUser(null);
        setCompany(null);
        setSystemUser(null);
        useAuthStore.setState({ hasAnySystemUser: false });
        setLoading(false);
        return;
      }

      if (event === 'INITIAL_SESSION') {
        // Já tratado por initAuth — ignorar para evitar duplicação
        return;
      }

      if (event === 'SIGNED_IN') {
        setSession(session);

        if (session?.user) {
          // Se os dados do usuário já estão carregados para esta sessão, não recarregar.
          // Evita re-fetch desnecessário ao voltar de outra aba (Supabase re-dispara SIGNED_IN
          // quando o token é renovado automaticamente).
          const currentState = useAuthStore.getState();
          if (currentState.appUser?.auth_user_id === session.user.id && currentState.company) {
            return;
          }

          setLoading(true);
          // Defer REST calls to next tick to break the deadlock with _initialize()
          setTimeout(async () => {
            await loadUserData(session.user.id);
            setLoading(false);
          }, 0);
        }
        return;
      }

      if (event === 'TOKEN_REFRESHED' && session) {
        setSession(session);
      }
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
              <Route path="/admin" element={<Navigate to="/" replace />} />

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
