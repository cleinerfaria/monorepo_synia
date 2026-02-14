import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Transition } from '@headlessui/react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/contexts/ThemeContext'
import { useNavigationGuard } from '@/contexts/NavigationGuardContext'
import { IconButton } from '@/components/ui'
import {
  Home,
  Users,
  FileText,
  Store,
  Settings,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Lock,
  Unlock,
  ShieldCheck,
} from 'lucide-react'
interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: { name: string; href: string }[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  {
    name: 'Cadastros',
    href: '/cadastros',
    icon: Users,
    children: [
      { name: 'Clientes', href: '/clientes' },
      { name: 'Equipamentos', href: '/equipamentos' },
      { name: 'Fabricantes', href: '/fabricantes' },
      { name: 'Fornecedores', href: '/fornecedores' },
      { name: 'Pacientes', href: '/pacientes' },
      { name: 'Princípios Ativos', href: '/principios-ativos' },
      { name: 'Procedimentos', href: '/procedimentos' },
      { name: 'Produtos', href: '/produtos' },
      { name: 'Produtos Apresentação', href: '/produto-apresentacao' },
      { name: 'Profissionais', href: '/profissionais' },
      { name: 'Unidades de Medida', href: '/unidades-medida' },
      { name: 'Vias de Administração', href: '/vias-administracao' },
    ],
  },
  {
    name: 'Prontuário',
    href: '/prontuario',
    icon: FileText,
    children: [
      { name: 'Censo', href: '/prontuario/censo' },
      { name: 'Relatórios', href: '/prontuario/relatorios' },
      { name: 'PAD', href: '/prontuario/pad' },
      { name: 'Prescrições', href: '/prescricoes' },
    ],
  },
  {
    name: 'Farmácia',
    href: '/farmacia',
    icon: Store,
    children: [
      { name: 'Estoque', href: '/estoque' },
      { name: 'Importar NFe', href: '/nfe' },
    ],
  },
  {
    name: 'Configurações',
    href: '/configuracoes',
    icon: Settings,
    children: [
      { name: 'Geral', href: '/configuracoes' },
      { name: 'Usuários', href: '/configuracoes/usuarios' },
      { name: 'Perfis de Acesso', href: '/configuracoes/perfis-acesso' },
      { name: 'Logs do Sistema', href: '/configuracoes/logs' },
      { name: 'Tabelas de Referência', href: '/configuracoes/tabelas-referencia' },
    ],
  },
  { name: 'Administração', href: '/admin', icon: ShieldCheck },
]

const SIDEBAR_STORAGE_KEY = 'aurea-sidebar-pinned'

export default function DashboardLayout() {
  const navigate = useNavigate()
  const { appUser, company, signOut } = useAuthStore()
  const { theme, setTheme, resolvedTheme: _resolvedTheme } = useTheme()
  const { handleLinkClick } = useNavigationGuard()
  const [sidebarOpen, setSidebarOpen] = useState(false) // Mobile
  const [isPinned, setIsPinned] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    return stored === 'true'
  })
  const [isHovered, setIsHovered] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  // Persistir preferência de pinned
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isPinned))
  }, [isPinned])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const toggleExpanded = (name: string) => {
    setExpandedItem((prev) => (prev === name ? null : name))
  }

  const isExpanded = (name: string) => expandedItem === name

  const togglePin = () => {
    setIsPinned((prev) => !prev)
  }

  // Desktop: O sidebar está expandido se estiver pinned OU em hover
  const isDesktopExpanded = isPinned || isHovered

  const themeOptions = [
    { value: 'light', label: 'Claro', icon: Sun },
    { value: 'dark', label: 'Escuro', icon: Moon },
    { value: 'system', label: 'Sistema', icon: Monitor },
  ]

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
                navigation={navigation}
                toggleExpanded={toggleExpanded}
                isExpanded={isExpanded}
                company={company}
                isExpanded_={true}
                onNavigate={() => setSidebarOpen(false)}
                onLinkClick={handleLinkClick}
                showPinButton={false}
                isPinned={false}
                onTogglePin={() => {}}
              />
            </div>
          </Transition.Child>
        </div>
      </Transition>

      {/* Desktop sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-30 hidden transition-all duration-300 ease-in-out lg:block',
          isDesktopExpanded ? 'w-[15.3rem]' : 'w-[72px]'
        )}
        onMouseEnter={() => !isPinned && setIsHovered(true)}
        onMouseLeave={() => !isPinned && setIsHovered(false)}
      >
        <div className="flex h-full flex-col border-r border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <SidebarContent
            navigation={navigation}
            toggleExpanded={toggleExpanded}
            isExpanded={isExpanded}
            company={company}
            isExpanded_={isDesktopExpanded}
            onNavigate={() => !isPinned && setIsHovered(false)}
            onLinkClick={handleLinkClick}
            showPinButton={true}
            isPinned={isPinned}
            onTogglePin={togglePin}
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
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-lg lg:px-8 dark:border-gray-700 dark:bg-gray-800/80">
          <button
            className="rounded-lg p-2 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>

          <div className="flex-1" />

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
              <p className="text-xs text-gray-500 dark:text-gray-400">{appUser?.role}</p>
            </div>
            <IconButton onClick={handleSignOut} title="Sair">
              <LogOut className="h-5 w-5" />
            </IconButton>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

interface SidebarContentProps {
  navigation: NavItem[]
  toggleExpanded: (name: string) => void
  isExpanded: (name: string) => boolean
  company: any
  isExpanded_: boolean
  onNavigate?: () => void
  onLinkClick?: (e: React.MouseEvent, href: string) => void
  showPinButton?: boolean
  isPinned?: boolean
  onTogglePin?: () => void
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
}: SidebarContentProps) {
  const versionLabel = `v${__APP_VERSION__}`

  return (
    <>
      {/* Logo + Pin Button */}
      <div
        className={clsx(
          'flex h-20 items-center gap-3 border-b border-gray-100 transition-all duration-300 dark:border-gray-700',
          isExpanded_ ? 'justify-between px-4' : 'justify-center px-3'
        )}
      >
        {/* Logo colapsada (visível quando menu está recolhido) */}
        {!isExpanded_ &&
          (company?.logo_url_collapsed || company?.logo_url ? (
            <img
              src={company.logo_url_collapsed || company.logo_url}
              alt={company.trade_name || company.name}
              className="h-14 w-14 rounded-xl object-contain transition-all duration-300"
            />
          ) : (
            <div className="from-primary-400 to-primary-600 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-all duration-300">
              <svg
                className="h-8 w-8 text-white transition-all duration-300"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          ))}
        {/* Logo expandida (visível quando menu está expandido) */}
        {isExpanded_ && (
          <>
            {company?.logo_url_expanded || company?.logo_url ? (
              <img
                src={company.logo_url_expanded || company.logo_url}
                alt={company.trade_name || company.name}
                className="h-16 max-w-[9.5rem] object-contain transition-all duration-300"
              />
            ) : (
              <div className="from-primary-400 to-primary-600 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-all duration-300">
                <svg
                  className="h-7 w-7 text-white transition-all duration-300"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
            )}
            {showPinButton && (
              <button
                onClick={onTogglePin}
                className={clsx(
                  'mt-1 flex-shrink-0 self-start rounded-lg p-1.5 transition-colors',
                  isPinned
                    ? 'bg-primary-100/50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
                title={isPinned ? 'Desafixar menu' : 'Fixar menu'}
              >
                {isPinned ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </button>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {navigation.map((item) => (
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
                                onLinkClick?.(e, child.href)
                                if (!e.defaultPrevented) {
                                  onNavigate?.()
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
                    onLinkClick?.(e, item.href)
                    if (!e.defaultPrevented) {
                      onNavigate?.()
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

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-700">
        <p className="truncate text-center text-xs text-gray-400 dark:text-gray-500">
          {isExpanded_ ? `Áurea Care ${versionLabel}` : versionLabel}
        </p>
      </div>
    </>
  )
}
