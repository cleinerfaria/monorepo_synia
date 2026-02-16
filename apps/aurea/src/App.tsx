import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NavigationGuardProvider } from '@/contexts/NavigationGuardContext';
import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppUser, Company } from '@/types/database';

// Layouts
import DashboardLayout from '@/layouts/DashboardLayout';

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
const CensoPage = lazy(() => import('@/pages/prontuario/CensoPage'));
const ProntuarioRelatoriosPage = lazy(() => import('@/pages/prontuario/RelatoriosPage'));
const PadPage = lazy(() => import('@/pages/prontuario/PadPage'));
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
  const { session, isLoading, company } = useAuthStore();

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

  // Usuário sem empresa só pode acessar /admin
  if (!company) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

// Rota especial para admin - permite acesso sem empresa
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuthStore();

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

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading, appUser } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loading size="lg" />
      </div>
    );
  }

  if (session) {
    // Se tem sessão mas não tem empresa, vai para admin
    if (!appUser) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setAppUser, setCompany, setLoading } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const initRef = useRef(false);

  const handleClearSession = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    window.location.reload();
  };

  const loadUserData = async (userId: string): Promise<boolean> => {
    try {
      // Fetch app_user
      const { data: userData, error: userError } = await supabase
        .from('app_user')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      // Se não tem app_user, permite continuar (usuário admin sem empresa)
      if (userError || !userData) {
        setAppUser(null);
        setCompany(null);
        return true; // Permite continuar para página admin
      }

      setAppUser(userData as AppUser);

      // Fetch company
      const { data: companyData, error: companyError } = await supabase
        .from('company')
        .select('*')
        .eq('id', (userData as AppUser).company_id)
        .single();

      // Se não tem empresa, permite continuar (usuário admin sem empresa)
      if (companyError || !companyData) {
        setCompany(null);
        return true; // Permite continuar para página admin
      }

      setCompany(companyData as Company);
      return true;
    } catch {
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
        } = await supabase.auth.getSession();

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
      } catch {
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
        setLoading(false);
        return;
      }

      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
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
        <BrowserRouter>
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
                  path="produto-apresentacao"
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <PresentationsPage />
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
