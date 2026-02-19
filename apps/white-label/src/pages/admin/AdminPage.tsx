import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  Building2,
  Users,
  Plus,
  Edit,
  Trash2,
  XCircle,
  Search,
  LogOut,
  Home,
  Shield,
  ShieldCheck,
  Crown,
  UserCog,
  Sun,
  Moon,
  Monitor,
  Palette,
  Plug,
  MessageCircle,
  BarChart3,
  CheckCircle,
  Package,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, Button, Input, Loading, EmptyState, Badge } from '@synia/ui';
import { useCompanies, Company, useUpdateCompany } from '@/hooks/useCompanies';
import { PRESET_COLORS } from '@/lib/themeConstants';
import { useAppUsers, AppUser } from '@/hooks/useAppUsers';
import {
  useAccessProfiles,
  useAccessProfile,
  useDeleteAccessProfile,
  useSystemModules,
  useUpdateSystemModuleStatus,
  AccessProfile,
} from '@/hooks/useAccessProfiles';
import { useAuthStore } from '@/stores/authStore';
import { useNeedsOnboarding } from '@/hooks/useNeedsOnboarding';
import { useIsSuperadmin } from '@/hooks/useIsSuperadmin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import CompanyModal from './CompanyModal';
import UserModal from './UserModal';
import LinkUserModal from './LinkUserModal';
import AccessProfileModal from './AccessProfileModal';
import OnboardingModal from '@/components/OnboardingModal';
import SystemUserModal from './SystemUserModal';
import { useSystemUsers, SystemUser, useIsMultitenantAdmin } from '@/hooks/useSystemUsers';

const profileBadgeColors: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  manager: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
  },
  clinician: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  stock: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  finance: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-300',
  },
  viewer: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
  user: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
};

const fallbackProfileBadge = {
  bg: 'bg-gray-100 dark:bg-gray-700',
  text: 'text-gray-700 dark:text-gray-300',
};

// Theme Selector Component
function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Escuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
      {themeOptions.map((option) => {
        const IconComponent = option.icon;
        return (
          <button
            key={option.value}
            onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
            className={clsx(
              'rounded-md p-2 transition-colors',
              theme === option.value
                ? 'bg-white shadow-sm dark:bg-gray-600'
                : 'hover:bg-gray-200 dark:hover:bg-gray-600'
            )}
            title={option.label}
          >
            <IconComponent className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          </button>
        );
      })}
    </div>
  );
}

// Color Theme Component - Usa PRESET_COLORS para sincronizar com seletor
const colorThemes = PRESET_COLORS.map((preset) => ({
  name: preset.label,
  value: preset.label.toLowerCase(),
  primary: preset.value,
  colors: {
    light: 'bg-primary-100 dark:bg-primary-900/30',
    text: 'text-primary-700 dark:text-primary-300',
    badge: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
    button:
      'bg-primary-50 border-2 border-primary-500 text-primary-700 hover:bg-primary-100 dark:bg-primary-950/30 dark:border-primary-500 dark:text-primary-400 dark:hover:bg-primary-900/50',
  },
}));

function ColorTab() {
  const { primaryColor, setPrimaryColor } = useTheme();
  const { company } = useAuthStore();
  const [selectedColor, setSelectedColor] = React.useState('blue');
  const updateCompanyMutation = useUpdateCompany();

  // Find current color theme based on primary color
  React.useEffect(() => {
    const currentColor = company?.primary_color || primaryColor;
    const matchedTheme = colorThemes.find(
      (theme) => theme.primary.toLowerCase() === currentColor.toLowerCase()
    );
    if (matchedTheme) {
      setSelectedColor(matchedTheme.value);
    }
  }, [company, primaryColor]);

  const handleColorSelect = async (theme: (typeof colorThemes)[0]) => {
    setSelectedColor(theme.value);

    // Apply color immediately to UI
    setPrimaryColor(theme.primary);

    // Save to company in database
    if (company?.id) {
      try {
        await updateCompanyMutation.mutateAsync({
          id: company.id,
          primary_color: theme.primary,
        });
        toast.success('Cor atualizada com sucesso!');
      } catch (error) {
        console.error('Erro ao salvar cor:', error);
        toast.error('Erro ao salvar cor');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Cores do Sistema</h3>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Escolha a cor principal que será aplicada em toda a interface do sistema.
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {colorThemes.map((theme) => (
            <div
              key={theme.value}
              onClick={() => handleColorSelect(theme)}
              className={clsx(
                'cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-lg',
                selectedColor === theme.value
                  ? 'border-blue-500 bg-blue-50 shadow-md dark:border-blue-400 dark:bg-blue-900/20'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              )}
            >
              {/* Color Preview Circle */}
              <div className="mb-4 flex justify-center">
                <div
                  className="h-16 w-16 rounded-full shadow-md"
                  style={{ backgroundColor: theme.primary }}
                />
              </div>

              {/* Color Name */}
              <h4 className="text-center font-semibold text-gray-900 dark:text-white">
                {theme.name}
              </h4>

              {/* Preview Elements */}
              <div className="mt-4 space-y-2">
                {/* Badge Preview */}
                <div
                  className={clsx(
                    'rounded px-3 py-1 text-center text-xs font-medium',
                    theme.colors.badge
                  )}
                >
                  Badge
                </div>

                {/* Button Preview */}
                <button
                  className={clsx(
                    'w-full rounded px-3 py-2 text-center text-xs font-medium transition-all',
                    theme.colors.button
                  )}
                  disabled
                >
                  Botão
                </button>

                {/* Text Preview */}
                <div
                  className={clsx(
                    'rounded px-3 py-1 text-center text-xs font-medium',
                    theme.colors.light,
                    theme.colors.text
                  )}
                >
                  Texto
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedColor === theme.value && (
                <div className="mt-4 flex justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Message */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            💡 A cor selecionada será aplicada aos botões (com borda, texto e fundo escuro), badges
            e elementos destacados em toda a interface. A alteração será salva automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
}

// Modules Tab Component
function ModulesTab() {
  const { data: systemModules = [], isLoading: isLoadingModules } = useSystemModules();
  const updateSystemModuleStatus = useUpdateSystemModuleStatus();
  const [updatingModules, setUpdatingModules] = React.useState<Record<string, boolean>>({});

  // Map system modules to display format
  const modules = systemModules.map((module) => ({
    id: module.code,
    name: module.name,
    description: module.description || `Módulo ${module.name}`,
    icon:
      module.code === 'whatsapp'
        ? MessageCircle
        : module.code === 'dashboard'
          ? BarChart3
          : Package, // Default icon
    enabled: module.active,
    systemModule: module,
  }));

  const toggleModule = async (moduleId: string) => {
    const targetModule = systemModules.find((module) => module.code === moduleId);
    if (!targetModule) return;

    const newEnabled = !targetModule.active;

    try {
      setUpdatingModules((prev) => ({ ...prev, [moduleId]: true }));
      await updateSystemModuleStatus.mutateAsync({
        id: targetModule.id,
        active: newEnabled,
      });
      toast.success(`Módulo ${newEnabled ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar módulo');
    } finally {
      setUpdatingModules((prev) => ({ ...prev, [moduleId]: false }));
    }
  };

  if (isLoadingModules) {
    return (
      <div className="space-y-8 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Módulos do Sistema
        </h3>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Ative ou desative os módulos disponíveis no sistema. Alterações serão aplicadas
          imediatamente.
        </p>

        {/* Modules List */}
        <div className="space-y-4">
          {modules.map((module) => (
            <div
              key={module.id}
              className={clsx(
                'flex items-center justify-between rounded-xl border-2 p-6 transition-all',
                module.enabled
                  ? 'border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10'
                  : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
              )}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  {React.createElement(module.icon, {
                    className: 'h-6 w-6 text-gray-700 dark:text-gray-300',
                  })}
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{module.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{module.description}</p>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="ml-4">
                {module.enabled ? (
                  <Badge variant="success">Ativo</Badge>
                ) : (
                  <Badge variant="neutral">Inativo</Badge>
                )}
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => toggleModule(module.id)}
                disabled={!!updatingModules[module.id]}
                className={clsx(
                  'relative ml-4 inline-flex h-10 w-16 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                  module.enabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-8 w-8 transform rounded-full bg-white transition-transform',
                    module.enabled ? 'translate-x-7' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Info Message */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-900/20">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            💡 Ao desativar um módulo, seus elementos de menu e funcionalidades serão ocultos dos
            usuários. Os dados armazenados não serão deletados.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    'companies' | 'users' | 'system-users' | 'profiles' | 'colors' | 'modules'
  >('companies');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('');
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  // Check if user needs onboarding
  const { needsOnboarding, isChecking } = useNeedsOnboarding();

  // Show onboarding modal if needed
  const shouldShowOnboarding = needsOnboarding && !isChecking;

  useEffect(() => {
    if (shouldShowOnboarding) {
      setIsOnboardingModalOpen(true);
    }
  }, [shouldShowOnboarding]);

  // Modals
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isLinkUserModalOpen, setIsLinkUserModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<AccessProfile | null>(null);
  const [isSystemUserModalOpen, setIsSystemUserModalOpen] = useState(false);
  const [selectedSystemUser, setSelectedSystemUser] = useState<SystemUser | null>(null);

  // Data
  const { data: companies = [], isLoading: isLoadingCompanies } = useCompanies();
  const { data: users = [], isLoading: isLoadingUsers } = useAppUsers(
    selectedCompanyFilter || undefined
  );
  const { data: accessProfiles = [], isLoading: isLoadingProfiles } = useAccessProfiles(
    selectedCompanyFilter || undefined
  );
  const { data: systemUsers = [], isLoading: isLoadingSystemUsers } = useSystemUsers();

  // Get permissions for selected profile
  const { data: selectedProfileWithPermissions } = useAccessProfile(selectedProfile?.id);

  // Filtered data
  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.document?.includes(searchTerm)
  );

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group users by company
  const groupedUsers = React.useMemo(() => {
    const filtered = filteredUsers;
    const grouped = new Map<string, { company: Company | null; users: AppUser[] }>();

    filtered.forEach((user) => {
      const companyId = user.company_id;
      const company = companies.find((c) => c.id === companyId) || null;
      const companyName = company?.name || 'Sem empresa';

      if (!grouped.has(companyName)) {
        grouped.set(companyName, { company, users: [] });
      }
      grouped.get(companyName)!.users.push(user);
    });

    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredUsers, companies]);

  const filteredProfiles = accessProfiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSystemUsers = systemUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditCompany = (company: Company) => {
    // Navega para a página de edição completa da empresa
    navigate(`/admin/empresa/${company.id}`);
  };

  const handleNewCompany = () => {
    setSelectedCompany(null);
    setIsCompanyModalOpen(true);
  };

  const handleEditUser = (user: AppUser) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleNewUser = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditProfile = (profile: AccessProfile) => {
    setSelectedProfile(profile);
    setIsProfileModalOpen(true);
  };

  const handleNewProfile = () => {
    setSelectedProfile(null);
    setIsProfileModalOpen(true);
  };

  const handleEditSystemUser = (user: SystemUser) => {
    setSelectedSystemUser(user);
    setIsSystemUserModalOpen(true);
  };

  const handleNewSystemUser = () => {
    setSelectedSystemUser(null);
    setIsSystemUserModalOpen(true);
  };

  const navigate = useNavigate();
  const { company, signOut, enterCompany } = useAuthStore();
  const { data: isSuperadmin = false } = useIsSuperadmin();
  const { data: isMultitenantAdmin = false } = useIsMultitenantAdmin();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleGoToDashboard = () => {
    navigate('/');
  };

  const handleEnterCompany = async (companyToEnter: Company) => {
    try {
      await enterCompany(companyToEnter.id);
      toast.success((t) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {`Acesso à empresa ${companyToEnter.name} realizado com sucesso!`}
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{
              marginLeft: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 16,
            }}
            aria-label="Fechar aviso"
          >
            ×
          </button>
        </span>
      ));
      navigate('/');
    } catch (error: any) {
      console.error('Erro ao entrar na empresa:', error);
      toast.error(error.message || 'Erro ao acessar a empresa');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <div className="border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-gray-900 dark:text-white">Gestão</span>
              <Badge variant="warning">Admin</Badge>
            </div>
            <div className="flex items-center gap-4">
              {/* Theme Selector */}
              <ThemeSelector />
              <div className="flex items-center gap-2">
                {company && (
                  <Button variant="neutral" size="sm" onClick={handleGoToDashboard}>
                    <Home className="mr-1 h-4 w-4" />
                    Dashboard
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="mr-1 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Alerta se usuário não tem empresa (exceto superadmin) */}
          {!company && companies.length > 0 && !isSuperadmin && isMultitenantAdmin && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                    Você não está vinculado a nenhuma empresa
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    Para acessar o sistema, você precisa se vincular a uma empresa existente.
                  </p>
                  <Button size="sm" className="mt-3" onClick={() => setIsLinkUserModalOpen(true)}>
                    Vincular Minha Conta a uma Empresa
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Administração do Sistema
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Gerencie empresas e usuários do sistema
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => {
                  setActiveTab('companies');
                  setSearchTerm('');
                }}
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'companies'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Building2 className="h-5 w-5" />
                Empresas
                <Badge variant="neutral">{companies.length}</Badge>
              </button>
              <button
                onClick={() => {
                  setActiveTab('users');
                  setSearchTerm('');
                }}
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Users className="h-5 w-5" />
                Usuários
                <Badge variant="neutral">{users.length}</Badge>
              </button>
              <button
                onClick={() => {
                  setActiveTab('profiles');
                  setSearchTerm('');
                }}
                className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'profiles'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Shield className="h-5 w-5" />
                Perfis de Acesso
                <Badge variant="neutral">{accessProfiles.length}</Badge>
              </button>
              {isSuperadmin && (
                <button
                  onClick={() => {
                    setActiveTab('system-users');
                    setSearchTerm('');
                  }}
                  className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'system-users'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Crown className="h-5 w-5" />
                  Usuários do Sistema
                  <Badge variant="warning">{systemUsers.length}</Badge>
                </button>
              )}
              {isSuperadmin && (
                <button
                  onClick={() => {
                    setActiveTab('colors');
                    setSearchTerm('');
                  }}
                  className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'colors'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Palette className="h-5 w-5" />
                  Cores
                </button>
              )}
              {isSuperadmin && (
                <button
                  onClick={() => {
                    setActiveTab('modules');
                    setSearchTerm('');
                  }}
                  className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                    activeTab === 'modules'
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Plug className="h-5 w-5" />
                  Módulos
                </button>
              )}
            </nav>
          </div>

          {/* Content */}
          {activeTab === 'companies' ? (
            <CompaniesTab
              companies={filteredCompanies}
              isLoading={isLoadingCompanies}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onNew={handleNewCompany}
              onEdit={handleEditCompany}
              onEnter={handleEnterCompany}
            />
          ) : activeTab === 'users' ? (
            <UsersTab
              groupedUsers={groupedUsers}
              companies={companies}
              isLoading={isLoadingUsers}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedCompanyFilter={selectedCompanyFilter}
              onCompanyFilterChange={setSelectedCompanyFilter}
              onNew={handleNewUser}
              onEdit={handleEditUser}
            />
          ) : activeTab === 'system-users' ? (
            <SystemUsersTab
              systemUsers={filteredSystemUsers}
              isLoading={isLoadingSystemUsers}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onNew={handleNewSystemUser}
              onEdit={handleEditSystemUser}
            />
          ) : activeTab === 'colors' ? (
            <ColorTab />
          ) : activeTab === 'modules' ? (
            <ModulesTab />
          ) : (
            <ProfilesTab
              profiles={filteredProfiles}
              companies={companies}
              isLoading={isLoadingProfiles}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedCompanyFilter={selectedCompanyFilter}
              onCompanyFilterChange={setSelectedCompanyFilter}
              onNew={handleNewProfile}
              onEdit={handleEditProfile}
            />
          )}

          {/* Modals */}
          <CompanyModal
            isOpen={isCompanyModalOpen}
            onClose={() => setIsCompanyModalOpen(false)}
            company={selectedCompany}
          />

          <UserModal
            isOpen={isUserModalOpen}
            onClose={() => setIsUserModalOpen(false)}
            user={selectedUser}
            companies={companies}
          />

          <LinkUserModal
            isOpen={isLinkUserModalOpen}
            onClose={() => setIsLinkUserModalOpen(false)}
            companies={companies}
          />

          <AccessProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            profile={selectedProfile}
            companyId={selectedCompanyFilter || companies[0]?.id || ''}
            existingPermissionIds={
              selectedProfileWithPermissions?.permissions?.map((p) => p.id) || []
            }
          />

          <SystemUserModal
            isOpen={isSystemUserModalOpen}
            onClose={() => setIsSystemUserModalOpen(false)}
            user={selectedSystemUser}
          />

          <OnboardingModal
            isOpen={isOnboardingModalOpen}
            onComplete={() => {
              setIsOnboardingModalOpen(false);
              // Reload the page to fetch the new user and company data
              window.location.reload();
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Companies Tab
// ============================================

interface CompaniesTabProps {
  companies: Company[];
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onNew: () => void;
  onEdit: (company: Company) => void;
  onEnter: (company: Company) => void;
}

function CompaniesTab({
  companies,
  isLoading,
  searchTerm,
  onSearchChange,
  onNew,
  onEdit,
  onEnter,
}: CompaniesTabProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" />
        <p className="mt-4 text-sm text-gray-500">Carregando empresas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar empresa..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11"
          />
        </div>
        <Button onClick={onNew}>
          <Plus className="mr-2 h-5 w-5" />
          Nova Empresa
        </Button>
      </div>

      {/* List */}
      {companies.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-16 w-16" />}
          title="Nenhuma empresa cadastrada"
          description="Crie a primeira empresa para começar"
          action={
            <Button onClick={onNew}>
              <Plus className="mr-2 h-5 w-5" />
              Nova Empresa
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <div key={company.id} onClick={() => onEnter(company)}>
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white"
                        style={{ backgroundColor: company.primary_color }}
                      >
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {company.name}
                        </h3>
                        {company.trade_name && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {company.trade_name}
                          </p>
                        )}
                        {company.document && (
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {company.document}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(company);
                      }}
                      title="Editar empresa"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Criada em{' '}
                      {format(new Date(company.created_at), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Users Tab
// ============================================

interface UsersTabProps {
  groupedUsers: [string, { company: Company | null; users: AppUser[] }][];
  companies: Company[];
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCompanyFilter: string;
  onCompanyFilterChange: (value: string) => void;
  onNew: () => void;
  onEdit: (user: AppUser) => void;
}

function UsersTab({
  groupedUsers,
  companies,
  isLoading,
  searchTerm,
  onSearchChange,
  selectedCompanyFilter,
  onCompanyFilterChange,
  onNew,
  onEdit,
}: UsersTabProps) {
  const totalUsers = groupedUsers.reduce((total, [, group]) => total + group.users.length, 0);
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" />
        <p className="mt-4 text-sm text-gray-500">Carregando usuários...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar usuário..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-11"
            />
          </div>
          <select
            value={selectedCompanyFilter}
            onChange={(e) => onCompanyFilterChange(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="">Todas as empresas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={onNew} disabled={companies.length === 0}>
          <Plus className="mr-2 h-5 w-5" />
          Novo Usuário
        </Button>
      </div>

      {/* List */}
      {totalUsers === 0 ? (
        <EmptyState
          icon={<Users className="h-16 w-16" />}
          title="Nenhum usuário encontrado"
          description={
            companies.length === 0
              ? 'Crie uma empresa primeiro para adicionar usuários'
              : 'Adicione o primeiro usuário'
          }
          action={
            companies.length > 0 ? (
              <Button onClick={onNew}>
                <Plus className="mr-2 h-5 w-5" />
                Novo Usuário
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {groupedUsers.map(([companyName, group]) => (
            <Card key={companyName}>
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">{companyName}</h3>
                    <Badge variant="neutral">
                      {group.users.length} usuário{group.users.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {group.users.map((user) => {
                  const profileCode = user.access_profile?.code || 'viewer';
                  const profileLabel = user.access_profile?.name || 'Sem perfil';
                  const profileColor = profileBadgeColors[profileCode] || fallbackProfileBadge;
                  return (
                    <div
                      key={user.id}
                      className="flex cursor-pointer items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => onEdit(user)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 flex-shrink-0">
                          <div className="bg-primary-100 dark:bg-primary-900/30 flex h-12 w-12 items-center justify-center rounded-full">
                            <span className="text-primary-600 dark:text-primary-400 text-lg font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${profileColor.bg} ${profileColor.text}`}
                        >
                          {profileLabel}
                        </span>
                        <div className="flex items-center gap-2">
                          {user.active ? (
                            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-xs">Ativo</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                              <XCircle className="h-4 w-4" />
                              <span className="text-xs">Inativo</span>
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(user);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Profiles Tab
// ============================================

interface ProfilesTabProps {
  profiles: AccessProfile[];
  companies: Company[];
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCompanyFilter: string;
  onCompanyFilterChange: (value: string) => void;
  onNew: () => void;
  onEdit: (profile: AccessProfile) => void;
}

function ProfilesTab({
  profiles,
  companies,
  isLoading,
  searchTerm,
  onSearchChange,
  selectedCompanyFilter,
  onCompanyFilterChange,
  onNew,
  onEdit,
}: ProfilesTabProps) {
  const deleteMutation = useDeleteAccessProfile();

  const handleDelete = async (e: React.MouseEvent, profile: AccessProfile) => {
    e.stopPropagation();

    if (profile.is_system) {
      toast.error('Perfis do sistema não podem ser excluídos');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o perfil "${profile.name}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(profile.id);
      toast.success('Perfil excluído com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir perfil');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" />
        <p className="mt-4 text-sm text-gray-500">Carregando perfis...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar perfil..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-11"
            />
          </div>
          <select
            value={selectedCompanyFilter}
            onChange={(e) => onCompanyFilterChange(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="">Todas as empresas</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={onNew} disabled={companies.length === 0 && !selectedCompanyFilter}>
          <Plus className="mr-2 h-5 w-5" />
          Novo Perfil
        </Button>
      </div>

      {/* List */}
      {profiles.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-16 w-16" />}
          title="Nenhum perfil encontrado"
          description="Os perfis de acesso definem as permissões dos usuários"
          action={
            companies.length > 0 ? (
              <Button onClick={onNew}>
                <Plus className="mr-2 h-5 w-5" />
                Novo Perfil
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <div key={profile.id} className="cursor-pointer" onClick={() => onEdit(profile)}>
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                          profile.is_admin
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : profile.is_system
                              ? 'bg-blue-100 dark:bg-blue-900/30'
                              : 'bg-primary-100 dark:bg-primary-900/30'
                        }`}
                      >
                        <ShieldCheck
                          className={`h-6 w-6 ${
                            profile.is_admin
                              ? 'text-red-600 dark:text-red-400'
                              : profile.is_system
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-primary-600 dark:text-primary-400'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {profile.name}
                          </h3>
                          {profile.is_admin && <span className="text-xs">⭐</span>}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{profile.code}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!profile.is_system && (
                        <Button variant="ghost" size="sm" onClick={(e) => handleDelete(e, profile)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {profile.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                      {profile.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                    {profile.is_system && <Badge variant="info">Sistema</Badge>}
                    {profile.is_admin && <Badge variant="warning">Admin</Badge>}
                    {!profile.active && <Badge variant="danger">Inativo</Badge>}
                    {!profile.is_system && profile.active && (
                      <Badge variant="success">Personalizado</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// System Users Tab
// ============================================

interface SystemUsersTabProps {
  systemUsers: SystemUser[];
  isLoading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onNew: () => void;
  onEdit: (user: SystemUser) => void;
}

function SystemUsersTab({
  systemUsers,
  isLoading,
  searchTerm,
  onSearchChange,
  onNew,
  onEdit,
}: SystemUsersTabProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" />
        <p className="mt-4 text-sm text-gray-500">Carregando usuários do sistema...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <Crown className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              Usuários do Sistema
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Estes são usuários com acesso administrativo global ao sistema.
              <strong> Superadmins</strong> têm acesso total, enquanto{' '}
              <strong>Administradores do Sistema</strong> podem gerenciar empresas e seus limites.
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar usuário do sistema..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11"
          />
        </div>
        <Button onClick={onNew}>
          <Plus className="mr-2 h-5 w-5" />
          Novo Usuário do Sistema
        </Button>
      </div>

      {/* List */}
      {systemUsers.length === 0 ? (
        <EmptyState
          icon={<Crown className="h-16 w-16" />}
          title="Nenhum usuário do sistema encontrado"
          description="Adicione usuários com acesso administrativo global"
          action={
            <Button onClick={onNew}>
              <Plus className="mr-2 h-5 w-5" />
              Novo Usuário do Sistema
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {systemUsers.map((user) => (
            <div key={user.auth_user_id} className="cursor-pointer" onClick={() => onEdit(user)}>
              <Card className="h-full transition-shadow hover:shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                          user.is_superadmin
                            ? 'bg-amber-100 dark:bg-amber-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}
                      >
                        {user.is_superadmin ? (
                          <Crown className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <UserCog className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{user.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(user);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                    {user.is_superadmin ? (
                      <Badge variant="warning">
                        <Crown className="mr-1 h-3 w-3" />
                        Superadmin
                      </Badge>
                    ) : (
                      <Badge variant="info">
                        <UserCog className="mr-1 h-3 w-3" />
                        Administrador do Sistema
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    Criado em{' '}
                    {format(new Date(user.created_at), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
