import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NavigationGuardProvider } from '@/contexts/NavigationGuardContext';
import { useAuthStore } from '@/stores/authStore';
// useIsSuperadmin removido - não usado neste arquivo
import { useIsSystemUser } from '@/hooks/useSystemUsers';
// useNeedsOnboarding removido - não usado
import { useEffect, useState, Suspense, lazy } from 'react';
import { supabase } from '@/lib/supabase';
// AppUser e Company removidos - não usados
import { NEUTRAL_COLORS } from '@/lib/themeConstants';
import { toRgba } from '@/lib/themeColors';
import { loadSystemFavicon } from '@/utils/systemAssets';

// Layouts
import DashboardLayout from '@/layouts/DashboardLayout';

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

// Dashboard
import DashboardPage from '@/pages/DashboardPage';

// Lazy-loaded pages
// const ReferenceTablesPage = lazy(() => import('@/pages/settings/ReferenceTablesPage'))
const UsersSettingsPage = lazy(() => import('@/pages/settings/UsersPage'));
const LogsPage = lazy(() => import('@/pages/settings/LogsPage'));
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'));
const CompanyEditPage = lazy(() => import('@/pages/admin/CompanyEditPage'));
const WhatsappInstancesPage = lazy(() => import('@/pages/whatsapp/InstancesPage'));
const WhatsappContactsPage = lazy(() => import('@/pages/whatsapp/ContactsPage'));
const WhatsappMessagesPage = lazy(() => import('@/pages/whatsapp/MessagesPage'));
const WhatsappEvaluationsPage = lazy(() => import('@/pages/whatsapp/EvaluationsPage'));
const WhatsappAspectsPage = lazy(() => import('@/pages/whatsapp/AspectsPage'));

// Sales Dashboard
const SalesOverviewPage = lazy(() => import('@/pages/dashboard/SalesOverviewPage'));
const SalesProductsPage = lazy(() => import('@/pages/dashboard/SalesProductsPage'));
const SalesClientsPage = lazy(() => import('@/pages/dashboard/SalesClientsPage'));
const SalesMetaPage = lazy(() => import('@/pages/dashboard/SalesMetaPage'));
const DynamicPage = lazy(() => import('@/pages/dashboard/DynamicPage'));

// Loading
import { Loading } from '@/components/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, // 1 hora
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
  const { session, isLoading, company, appUser } = useAuthStore();

  console.log('[ProtectedRoute] Estado simplificado:', {
    isLoading,
    hasSession: !!session,
    hasAppUser: !!appUser,
    hasCompany: !!company,
  });

  if (isLoading) {
    console.log('[ProtectedRoute] Ainda carregando auth...');
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    );
  }

  if (!session) {
    console.log('[ProtectedRoute] Sem sessão, redirecionando para login');
    return <Navigate to="/login" replace />;
  }

  // Se tem appUser e company, permite acesso
  if (appUser && company) {
    console.log('[ProtectedRoute] Usuário válido, permitindo acesso');
    return <>{children}</>;
  }

  console.log('[ProtectedRoute] Usuário incompleto, redirecionando para login');
  return <Navigate to="/login" replace />;
}

// Rota especial para admin - permite acesso apenas para superadmins ou durante onboarding
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading, appUser, company } = useAuthStore();

  console.log('[AdminRoute] Estado simplificado:', {
    isLoading,
    hasSession: !!session,
    hasAppUser: !!appUser,
    hasCompany: !!company,
  });

  if (isLoading) {
    console.log('[AdminRoute] Ainda carregando...');
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    );
  }

  if (!session) {
    console.log('[AdminRoute] Sem sessão, redirecionando para login');
    return <Navigate to="/login" replace />;
  }

  console.log('[AdminRoute] Permitindo acesso ao admin');
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading, appUser, company } = useAuthStore();
  const { data: isSystemUser, isLoading: isCheckingSystemUser } = useIsSystemUser();

  // Debug logs
  console.log('[PublicRoute] Estado simplificado:', {
    hasSession: !!session,
    isLoading,
    hasAppUser: !!appUser,
    hasCompany: !!company,
    isSystemUser,
    isCheckingSystemUser,
  });

  // Se está carregando auth ou verificando se é usuário do sistema, mostra loading
  if (isLoading || isCheckingSystemUser) {
    console.log('[PublicRoute] Loading auth or checking system user...');
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    );
  }

  // Se tem sessão
  if (session) {
    // Se é usuário do sistema (superadmin/multitenant admin), vai para admin
    if (isSystemUser) {
      console.log('[PublicRoute] System user, redirecting to admin');
      return <Navigate to="/admin" replace />;
    }

    // Se tem appUser e company, vai para dashboard
    if (appUser && company) {
      console.log('[PublicRoute] Regular user with company, redirecting to dashboard');
      return <Navigate to="/" replace />;
    }

    console.log('[PublicRoute] User has session but no valid data, staying on login');
    // Usuário com sessão mas sem dados completos - vai para login e deixa deslogar
    // Isso evita loops - usuário inválido fica na tela de login
  }

  return <>{children}</>;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, isInitialized } = useAuthStore();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (isInitializing) {
        return;
      }

      setIsInitializing(true);

      try {
        await initialize();

        // Carregar favicon e configurações do sistema
        await loadSystemFavicon();
      } catch (error) {
        console.error('[AuthProvider] Erro na inicialização:', error);
        if (isMounted) {
          setAuthError('Erro na autenticação. Tente novamente.');
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initAuth();

    // Listener para mudanças de sessão
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, _session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        // Limpar estado quando faz logout
        useAuthStore.getState().setSession(null);
        useAuthStore.getState().setAppUser(null);
        useAuthStore.getState().setCompany(null);
        useAuthStore.setState({ isInitialized: false });
        setIsInitializing(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [initialize, isInitializing]);

  if (!isInitialized) {
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
          <div className="mb-4 text-5xl text-red-500">❌</div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Erro de Autenticação
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary-500 hover:bg-primary-600 rounded-lg px-6 py-2 text-white transition-colors"
          >
            Recarregar Página
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
          <NavigationGuardProvider>
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
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Dashboard */}
                  <Route index element={<DashboardPage />} />

                  {/* Sales Dashboard */}
                  <Route
                    path="dashboard/visao-geral"
                    element={
                      <Suspense fallback={<RouteLoader />}>
                        <SalesOverviewPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="dashboard/produtos"
                    element={
                      <Suspense fallback={<RouteLoader />}>
                        <SalesProductsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="dashboard/clientes"
                    element={
                      <Suspense fallback={<RouteLoader />}>
                        <SalesClientsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="dashboard/meta"
                    element={
                      <Suspense fallback={<RouteLoader />}>
                        <SalesMetaPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="dashboard/page/:pageId"
                    element={
                      <Suspense fallback={<RouteLoader />}>
                        <DynamicPage />
                      </Suspense>
                    }
                  />

                  {/* Configurações */}

                  <Route
                    path="configuracoes/usuarios"
                    element={
                      <Suspense fallback={<RouteLoader />}>
                        <UsersSettingsPage />
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
                    path="whatsapp/instances"
                    element={
                      <Suspense fallback={<RouteLoader />}>
                        <WhatsappInstancesPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="whatsapp/contacts"
                    element={
                      <Suspense fallback={<RouteLoader />}>
                        <WhatsappContactsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="whatsapp/messages"
                    element={
                      <Suspense fallback={<RouteLoader />}>
                        <WhatsappMessagesPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="whatsapp/evaluations"
                    element={
                      <Suspense fallback={<RouteLoader />}>
                        <WhatsappEvaluationsPage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="whatsapp/aspects"
                    element={
                      <Suspense fallback={<RouteLoader />}>
                        <WhatsappAspectsPage />
                      </Suspense>
                    }
                  />
                  {/* Comentado: ReferenceTablesPage depende de módulos que foram removidos 
                  <Route
                    path="configuracoes/tabelas-referencia"
                    element={
                      <Suspense fallback={<RouteLoader />}>
                        <ReferenceTablesPage />
                      </Suspense>
                    }
                  />
                  */}
                </Route>

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

                {/* Edição de Empresa - Rota para edição completa */}
                <Route
                  path="/admin/empresa/:companyId"
                  element={
                    <AdminRoute>
                      <Suspense fallback={<RouteLoader />}>
                        <CompanyEditPage />
                      </Suspense>
                    </AdminRoute>
                  }
                />

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
                    boxShadow: `0 10px 40px -15px ${toRgba(NEUTRAL_COLORS.black, 0.2)}`,
                  },
                  success: {
                    iconTheme: {
                      primary: 'rgb(var(--color-primary-500))',
                      secondary: 'rgb(var(--color-primary-50))',
                    },
                  },
                }}
              />
            </AuthProvider>
          </NavigationGuardProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
