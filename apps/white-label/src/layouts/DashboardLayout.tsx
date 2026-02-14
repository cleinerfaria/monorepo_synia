import { useState, useEffect, useMemo, useRef } from 'react';

import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Transition } from '@headlessui/react';

import { clsx } from 'clsx';
import packageJson from '../../package.json';

import {
  Building2,
  ChevronDown,
  Home,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Monitor,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Unlock,
  X,
} from 'lucide-react';

import { useAuthStore } from '@/stores/authStore';
import { DEFAULT_COMPANY_COLOR } from '@/lib/themeConstants';

import { useTheme } from '@/contexts/ThemeContext';

import { useNavigationGuard } from '@/hooks/useNavigationGuard';

import { useIsSuperadmin } from '@/hooks/useIsSuperadmin';
import { useIsMultitenantAdmin } from '@/hooks/useSystemUsers';
import { useUserCompanies } from '@/hooks/useUserCompanies';
import usePages from '@/hooks/usePages';

interface NavItem {
  name: string;

  href: string;

  icon: React.ComponentType<{ className?: string }>;

  children?: { name: string; href: string }[];
}

const navigation: NavItem[] = [
  { name: 'Início', href: '/', icon: Home },

  {
    name: 'Dashboard',

    href: '/dashboard',

    icon: LayoutDashboard,

    children: [
      { name: 'Visão Geral', href: '/dashboard/visao-geral' },
      { name: 'Produtos', href: '/dashboard/produtos' },
      { name: 'Clientes', href: '/dashboard/clientes' },
      { name: 'Meta', href: '/dashboard/meta' },
    ],
  },

  {
    name: 'WhatsApp',

    href: '/whatsapp',

    icon: MessageSquare,

    children: [
      { name: 'Instâncias', href: '/whatsapp/instances' },
      { name: 'Contatos', href: '/whatsapp/contacts' },

      { name: 'Mensagens', href: '/whatsapp/messages' },

      { name: 'Avaliações', href: '/whatsapp/evaluations' },

      { name: 'Aspectos', href: '/whatsapp/aspects' },
    ],
  },

  {
    name: 'Configurações',

    href: '/configuracoes',

    icon: Settings,

    children: [
      { name: 'Usuários', href: '/configuracoes/usuarios' },

      { name: 'Logs do Sistema', href: '/configuracoes/logs' },
    ],
  },

  { name: 'Administração', href: '/admin', icon: ShieldCheck },
];

const SIDEBAR_STORAGE_KEY = 'wl-sidebar-pinned';
const APP_VERSION = packageJson.version;

// Filter navigation based on enabled modules
function getFilteredNavigation(
  company: any,
  isSuperadmin: boolean = false,
  configuredPages: any[] = []
): NavItem[] {
  // If no company and user is superadmin, show only core navigation items
  if (!company) {
    if (isSuperadmin) {
      // For superadmin without company, show only essential items
      return navigation.filter((item) => ['Início', 'Administração'].includes(item.name));
    }
    // For regular users without company, show basic navigation
    return navigation.filter((item) =>
      ['Início', 'Configurações', 'Administração'].includes(item.name)
    );
  }

  // Get enabled modules from localStorage
  const stored = localStorage.getItem(`company-${company.id}-modules`);
  let enabledModules: Record<string, boolean> = {};

  if (stored) {
    enabledModules = JSON.parse(stored);
  } else {
    // Default: enable whatsapp and dashboard
    enabledModules = {
      whatsapp: true,
      dashboard: true,
    };
  }

  return navigation
    .map((item) => {
      // Always show core items
      if (['Início', 'Configurações', 'Administração'].includes(item.name)) {
        return item;
      }

      // Handle Dashboard - add configured pages as children
      if (item.name === 'Dashboard') {
        if (!enabledModules.dashboard) return null;

        // Create default dashboard children
        const defaultChildren = [
          { name: 'Visão Geral', href: '/dashboard/visao-geral' },
          { name: 'Produtos', href: '/dashboard/produtos' },
          { name: 'Clientes', href: '/dashboard/clientes' },
          { name: 'Meta', href: '/dashboard/meta' },
        ];

        // Add configured pages
        const configuredChildren = configuredPages.map((page) => ({
          name: page.name,
          href: `/dashboard/page/${page.id}`,
        }));

        return {
          ...item,
          children: [...defaultChildren, ...configuredChildren],
        };
      }

      // Filter based on module settings
      if (item.name === 'WhatsApp') {
        return enabledModules.whatsapp ? item : null;
      }

      return item;
    })
    .filter((item): item is NavItem => item !== null);
}

export default function DashboardLayout() {
  const navigate = useNavigate();

  const { appUser, company, signOut, exitCompany, enterCompany } = useAuthStore();

  const { data: isSuperadmin = false } = useIsSuperadmin();
  const { data: isMultitenantAdmin = false } = useIsMultitenantAdmin();

  // Check if user is admin of their company
  const isCompanyAdmin = appUser?.access_profile?.is_admin || false;

  const { theme, setTheme, resolvedTheme } = useTheme();

  const { handleLinkClick } = useNavigationGuard();

  // Get configured pages
  const { pages } = usePages();

  // Memoize pages to prevent infinite loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stablePages = useMemo(() => pages, [JSON.stringify(pages)]);

  // Filtered navigation based on enabled modules
  const [filteredNavigation, setFilteredNavigation] = useState<NavItem[]>(() => {
    // Initial navigation - show basic items until we know if user is superadmin and has company
    return navigation.filter((item) =>
      ['Início', 'Configurações', 'Administração'].includes(item.name)
    );
  });

  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile

  const [isPinned, setIsPinned] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);

    return stored === 'true';
  });

  const [isHovered, setIsHovered] = useState(false);

  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  // Buscar empresas do usuário
  const { data: userCompanies = [] } = useUserCompanies();

  // Filtrar empresas baseado no termo de busca
  const filteredCompanies = userCompanies.filter(
    (comp) =>
      (comp.trade_name || comp.name).toLowerCase().includes(companySearchTerm.toLowerCase()) ||
      comp.document?.includes(companySearchTerm) ||
      false
  );

  // Close company dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        companyDropdownRef.current &&
        !companyDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCompanyDropdownOpen(false);
        setCompanySearchTerm('');
      }
    };

    if (isCompanyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isCompanyDropdownOpen]);

  // Persistir preferência de pinned

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isPinned));
  }, [isPinned]);

  // Update navigation when company, modules, or pages change
  useEffect(() => {
    setFilteredNavigation(
      getFilteredNavigation(company, isSuperadmin || isMultitenantAdmin, stablePages).filter(
        Boolean
      )
    );
  }, [company, isSuperadmin, isMultitenantAdmin, stablePages]);

  // Listen for module changes from admin panel
  useEffect(() => {
    const handleModulesUpdate = () => {
      setFilteredNavigation(
        getFilteredNavigation(company, isSuperadmin || isMultitenantAdmin, stablePages).filter(
          Boolean
        )
      );
    };

    window.addEventListener('company-modules-updated', handleModulesUpdate);
    return () => window.removeEventListener('company-modules-updated', handleModulesUpdate);
  }, [company, isSuperadmin, isMultitenantAdmin, stablePages]);

  const handleSignOut = async () => {
    await signOut();

    navigate('/login');
  };

  const handleExitCompany = () => {
    exitCompany();

    navigate('/admin');
  };

  const handleSwitchCompany = async (newCompanyId: string) => {
    if (newCompanyId === company?.id) {
      setIsCompanyDropdownOpen(false);
      setCompanySearchTerm('');
      return;
    }

    try {
      await enterCompany(newCompanyId);
      setIsCompanyDropdownOpen(false);
      setCompanySearchTerm('');
      navigate('/');
    } catch (error) {
      console.error('Erro ao trocar de empresa:', error);
    }
  };

  const toggleExpanded = (name: string) => {
    setExpandedItem((prev) => (prev === name ? null : name));
  };

  const isExpanded = (name: string) => expandedItem === name;

  const togglePin = () => {
    setIsPinned((prev) => !prev);
  };

  // Desktop: O sidebar está expandido se estiver pinned OU em hover

  const isDesktopExpanded = isPinned || isHovered;

  const themeOptions = [
    { value: 'light', label: 'Claro', icon: Sun },

    { value: 'dark', label: 'Escuro', icon: Moon },

    { value: 'system', label: 'Sistema', icon: Monitor },
  ];

  const defaultLogoSrc = resolvedTheme === 'dark' ? '/logo_dark.png' : '/logo_light.png';

  const defaultLogoAlt = company?.trade_name || company?.name || 'sistema';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}

      <Transition show={sidebarOpen}>
        <div className="fixed inset-0 z-40 lg:hidden">
          <Transition.Child
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          </Transition.Child>

          <Transition.Child
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <div className="relative flex h-full w-[15.3rem] flex-col bg-white shadow-2xl dark:bg-gray-800">
              <button
                className="absolute right-4 top-4 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>

              <SidebarContent
                navigation={filteredNavigation}
                toggleExpanded={toggleExpanded}
                isExpanded={isExpanded}
                company={company}
                isExpanded_={true}
                onNavigate={() => setSidebarOpen(false)}
                onLinkClick={handleLinkClick}
                showPinButton={false}
                isPinned={false}
                onTogglePin={() => {}}
                isSuperadmin={isSuperadmin}
                isMultitenantAdmin={isMultitenantAdmin}
                isCompanyAdmin={isCompanyAdmin}
                onExitCompany={handleExitCompany}
                defaultLogoSrc={defaultLogoSrc}
                defaultLogoAlt={defaultLogoAlt}
              />
            </div>
          </Transition.Child>
        </div>
      </Transition>

      {/* Desktop sidebar */}

      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-[60] hidden transition-all duration-300 ease-in-out lg:block',

          isDesktopExpanded ? 'w-[15.3rem]' : 'w-[72px]'
        )}
        onMouseEnter={() => !isPinned && setIsHovered(true)}
        onMouseLeave={() => !isPinned && setIsHovered(false)}
      >
        <div className="flex h-full flex-col border-r border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <SidebarContent
            navigation={filteredNavigation}
            toggleExpanded={toggleExpanded}
            isExpanded={isExpanded}
            company={company}
            isExpanded_={isDesktopExpanded}
            onNavigate={() => !isPinned && setIsHovered(false)}
            onLinkClick={handleLinkClick}
            showPinButton={true}
            isPinned={isPinned}
            onTogglePin={togglePin}
            isSuperadmin={isSuperadmin}
            isMultitenantAdmin={isMultitenantAdmin}
            isCompanyAdmin={isCompanyAdmin}
            onExitCompany={handleExitCompany}
            defaultLogoSrc={defaultLogoSrc}
            defaultLogoAlt={defaultLogoAlt}
          />
        </div>
      </div>

      {/* Main content - ajusta margem baseado se está pinned ou não */}

      <div
        className={clsx(
          'transition-all duration-300 ease-in-out',

          isPinned ? 'lg:pl-[15.3rem]' : 'lg:pl-[72px]'
        )}
      >
        {/* Top bar */}

        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-800/80 lg:px-8">
          <button
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="flex-1" />

          {/* Company selector */}
          {company && (
            <div className="relative" ref={companyDropdownRef}>
              <button
                onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                className={clsx(
                  'flex items-center gap-2 rounded-lg px-3 py-2 transition-colors',
                  isSuperadmin || isMultitenantAdmin
                    ? 'bg-primary-50 text-primary-800 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-200 dark:hover:bg-primary-900/50'
                    : userCompanies.length > 1
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                )}
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden text-sm font-medium sm:inline">
                  {company.trade_name || company.name}
                </span>
                {userCompanies.length > 1 || isSuperadmin || isMultitenantAdmin ? (
                  <ChevronDown
                    className={clsx(
                      'h-4 w-4 transition-transform',
                      isCompanyDropdownOpen && 'rotate-180'
                    )}
                  />
                ) : isSuperadmin || isMultitenantAdmin ? (
                  <LogOut className="h-3 w-3" />
                ) : null}
              </button>

              {/* Dropdown menu */}
              {isCompanyDropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
                  {/* Search input */}
                  <div className="border-b border-gray-200 p-3 dark:border-gray-600">
                    <input
                      type="text"
                      placeholder="Buscar empresa..."
                      value={companySearchTerm}
                      onChange={(e) => setCompanySearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                      autoFocus
                    />
                  </div>

                  {/* Companies list */}
                  {filteredCompanies.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto">
                      {filteredCompanies.map((comp) => (
                        <button
                          key={comp.id}
                          onClick={() => handleSwitchCompany(comp.id)}
                          className={clsx(
                            'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                            comp.id === company.id
                              ? 'bg-primary-50 dark:bg-primary-900/30'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          )}
                        >
                          <div
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded font-semibold text-white"
                            style={{
                              backgroundColor: comp.primary_color || DEFAULT_COMPANY_COLOR,
                            }}
                          >
                            {(comp.trade_name || comp.name)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={clsx(
                                'truncate text-sm font-medium',
                                comp.id === company.id
                                  ? 'text-primary-700 dark:text-primary-300'
                                  : 'text-gray-900 dark:text-white'
                              )}
                            >
                              {comp.trade_name || comp.name}
                            </p>
                            {comp.trade_name && (
                              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {comp.name}
                              </p>
                            )}
                          </div>
                          {comp.id === company.id && (
                            <div className="h-2 w-2 rounded-full bg-primary-600 dark:bg-primary-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      Nenhuma empresa encontrada
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Theme toggle */}

          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-700">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                className={clsx(
                  'rounded-lg p-2 transition-colors',

                  theme === option.value
                    ? 'bg-white shadow-sm dark:bg-gray-600'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
                title={option.label}
              >
                <option.icon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              </button>
            ))}
          </div>

          {/* User menu */}

          <div className="flex items-center gap-3 border-l border-gray-200 pl-4 dark:border-gray-600">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{appUser?.name}</p>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {appUser?.access_profile?.name || 'Sem perfil'}
              </p>
            </div>

            <button
              onClick={handleSignOut}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Page content */}

        <main className="p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

interface SidebarContentProps {
  navigation: NavItem[];

  toggleExpanded: (name: string) => void;

  isExpanded: (name: string) => boolean;

  company: any;

  isExpanded_: boolean;

  onNavigate?: () => void;

  onLinkClick?: (e: React.MouseEvent, href: string) => void;

  showPinButton?: boolean;

  isPinned?: boolean;

  onTogglePin?: () => void;

  isSuperadmin?: boolean;

  isMultitenantAdmin?: boolean;

  isCompanyAdmin?: boolean;

  onExitCompany?: () => void;

  defaultLogoSrc: string;

  defaultLogoAlt: string;
}

function SidebarContent({
  navigation,

  toggleExpanded,

  isExpanded,

  company,

  isExpanded_,

  onNavigate,

  onLinkClick,

  showPinButton = false,

  isPinned = false,

  onTogglePin,

  isSuperadmin = false,

  isMultitenantAdmin = false,

  isCompanyAdmin = false,

  onExitCompany,

  defaultLogoSrc,

  defaultLogoAlt,
}: SidebarContentProps) {
  return (
    <>
      {/* Logo + Pin Button */}

      <div
        className={clsx(
          'relative flex h-20 items-center border-b border-gray-100 transition-all duration-300 dark:border-gray-700',

          isExpanded_ ? 'px-4' : 'px-3'
        )}
      >
        <div className="flex flex-1 items-center justify-center">
          {!isExpanded_ ? (
            company?.logo_url_collapsed || company?.logo_url ? (
              <img
                src={company.logo_url_collapsed || company.logo_url}
                alt={company.trade_name || company.name}
                className="h-14 w-14 rounded-xl object-contain transition-all duration-300"
              />
            ) : (
              <img
                src={defaultLogoSrc}
                alt={defaultLogoAlt}
                className="h-14 w-14 rounded-xl object-contain transition-all duration-300"
              />
            )
          ) : company?.logo_url_expanded || company?.logo_url ? (
            <img
              src={company.logo_url_expanded || company.logo_url}
              alt={company.trade_name || company.name}
              className="h-16 max-w-[9.5rem] object-contain transition-all duration-300"
            />
          ) : (
            <img
              src={defaultLogoSrc}
              alt={defaultLogoAlt}
              className="h-16 max-w-[9.5rem] object-contain transition-all duration-300"
            />
          )}
        </div>

        {isExpanded_ && showPinButton && (
          <button
            onClick={onTogglePin}
            className={clsx(
              'absolute right-3 top-3 rounded-lg p-1.5 transition-colors',

              isPinned
                ? 'bg-primary-100/50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
            title={isPinned ? 'Desafixar menu' : 'Fixar menu'}
          >
            {isPinned ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Navigation */}

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {navigation
            .filter((item) => {
              // Esconder "Administração" para não-superadmins e não-multitenant-admins
              if (item.href === '/admin' && !isSuperadmin && !isMultitenantAdmin) {
                return false;
              }
              // Esconder "Configurações" para não-admins (superadmin, multitenant admin ou admin da empresa)
              if (
                item.href === '/configuracoes' &&
                !isSuperadmin &&
                !isMultitenantAdmin &&
                !isCompanyAdmin
              ) {
                return false;
              }
              return true;
            })
            .map((item) => (
              <li key={item.name}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => isExpanded_ && toggleExpanded(item.name)}
                      className={clsx(
                        'sidebar-link w-full',

                        isExpanded_ ? 'justify-between' : 'justify-center',

                        isExpanded(item.name) && isExpanded_ && 'bg-gray-50 dark:bg-gray-700/30'
                      )}
                      title={!isExpanded_ ? item.name : undefined}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 flex-shrink-0" />

                        {isExpanded_ && item.name}
                      </span>

                      {isExpanded_ && (
                        <ChevronDown
                          className={clsx(
                            'h-4 w-4 flex-shrink-0 transition-transform',

                            isExpanded(item.name) && 'rotate-180'
                          )}
                        />
                      )}
                    </button>

                    {isExpanded(item.name) && isExpanded_ && (
                      <Transition
                        show={isExpanded(item.name)}
                        enter="transition-all duration-200 ease-out"
                        enterFrom="opacity-0 max-h-0"
                        enterTo="opacity-100 max-h-96"
                        leave="transition-all duration-150 ease-in"
                        leaveFrom="opacity-100 max-h-96"
                        leaveTo="opacity-0 max-h-0"
                      >
                        <ul className="ml-4 mt-0.5 space-y-0.5 overflow-hidden">
                          {item.children.map((child) => (
                            <li key={child.name}>
                              <NavLink
                                to={child.href}
                                end
                                onClick={(e) => {
                                  onLinkClick?.(e, child.href);

                                  if (!e.defaultPrevented) {
                                    onNavigate?.();
                                  }
                                }}
                                className={({ isActive }) =>
                                  clsx('sidebar-link pl-8', isActive && 'active')
                                }
                              >
                                {child.name}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </Transition>
                    )}
                  </div>
                ) : (
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    onClick={(e) => {
                      onLinkClick?.(e, item.href);

                      if (!e.defaultPrevented) {
                        onNavigate?.();
                      }
                    }}
                    className={({ isActive }) =>
                      clsx('sidebar-link', !isExpanded_ && 'justify-center', isActive && 'active')
                    }
                    title={!isExpanded_ ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />

                    {isExpanded_ && item.name}
                  </NavLink>
                )}
              </li>
            ))}
        </ul>
      </nav>

      {/* Botão Sair da Empresa para Superadmin e Admin Multi Tenant */}

      {(isSuperadmin || isMultitenantAdmin) && company && isExpanded_ && (
        <div className="border-t border-gray-100 px-3 py-3 dark:border-gray-700">
          <button
            onClick={onExitCompany}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-orange-600 transition-colors hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
            title="Voltar ao painel de administração"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            Sair da Empresa
          </button>
        </div>
      )}

      {/* Footer */}

      <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-700">
        <p className="truncate text-center text-xs text-gray-400 dark:text-gray-500">
          {isExpanded_ ? `versão ${APP_VERSION}` : `v${APP_VERSION}`}
        </p>
      </div>
    </>
  );
}
