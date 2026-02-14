import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  Button,
  Input,
  Loading,
  EmptyState,
  Badge,
  TabButton,
} from '@/components/ui'
import { useCompanies, Company } from '@/hooks/useCompanies'
import { useAppUsers, AppUser, roleLabels, roleColors, UserRole } from '@/hooks/useAppUsers'
import {
  useAccessProfiles,
  useAccessProfile,
  useDeleteAccessProfile,
  AccessProfile,
} from '@/hooks/useAccessProfiles'
import { useAuthStore } from '@/stores/authStore'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import CompanyModal from './CompanyModal'
import UserModal from './UserModal'
import LinkUserModal from './LinkUserModal'
import AccessProfileModal from './AccessProfileModal'
import AdminUiTab from './AdminUiTab'
import {
  Building2,
  Users,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  LogOut,
  Home,
  ShieldCheck,
  Palette,
} from 'lucide-react'
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'companies' | 'users' | 'profiles' | 'ui'>('companies')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('')

  // Modals
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [isLinkUserModalOpen, setIsLinkUserModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<AccessProfile | null>(null)

  // Data
  const { data: companies = [], isLoading: isLoadingCompanies } = useCompanies()
  const { data: users = [], isLoading: isLoadingUsers } = useAppUsers(
    selectedCompanyFilter || undefined
  )
  const { data: accessProfiles = [], isLoading: isLoadingProfiles } = useAccessProfiles(
    selectedCompanyFilter || undefined
  )

  // Get permissions for selected profile
  const { data: selectedProfileWithPermissions } = useAccessProfile(selectedProfile?.id)

  // Filtered data
  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.document?.includes(searchTerm)
  )

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredProfiles = accessProfiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company)
    setIsCompanyModalOpen(true)
  }

  const handleNewCompany = () => {
    setSelectedCompany(null)
    setIsCompanyModalOpen(true)
  }

  const handleEditUser = (user: AppUser) => {
    setSelectedUser(user)
    setIsUserModalOpen(true)
  }

  const handleNewUser = () => {
    setSelectedUser(null)
    setIsUserModalOpen(true)
  }

  const handleEditProfile = (profile: AccessProfile) => {
    setSelectedProfile(profile)
    setIsProfileModalOpen(true)
  }

  const handleNewProfile = () => {
    setSelectedProfile(null)
    setIsProfileModalOpen(true)
  }

  const navigate = useNavigate()
  const { company, signOut } = useAuthStore()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleGoToDashboard = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <div className="border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏥</span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">AureaCare</span>
              <Badge variant="warning">Admin</Badge>
            </div>
            <div className="flex items-center gap-2">
              {company && (
                <Button variant="secondary" size="sm" onClick={handleGoToDashboard}>
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

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Alerta se usuário não tem empresa */}
          {!company && companies.length > 0 && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <span className="text-2xl">!</span>
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
              <TabButton
                active={activeTab === 'companies'}
                onClick={() => {
                  setActiveTab('companies')
                  setSearchTerm('')
                }}
                icon={<Building2 className="h-5 w-5" />}
                hoverBorder
                className="px-1 py-4"
                badge={<Badge variant="neutral">{companies.length}</Badge>}
              >
                Empresas
              </TabButton>
              <TabButton
                active={activeTab === 'users'}
                onClick={() => {
                  setActiveTab('users')
                  setSearchTerm('')
                }}
                icon={<Users className="h-5 w-5" />}
                hoverBorder
                className="px-1 py-4"
                badge={<Badge variant="neutral">{users.length}</Badge>}
              >
                Usuários
              </TabButton>
              <TabButton
                active={activeTab === 'profiles'}
                onClick={() => {
                  setActiveTab('profiles')
                  setSearchTerm('')
                }}
                icon={<ShieldCheck className="h-5 w-5" />}
                hoverBorder
                className="px-1 py-4"
                badge={<Badge variant="neutral">{accessProfiles.length}</Badge>}
              >
                Perfis de Acesso
              </TabButton>
              <TabButton
                active={activeTab === 'ui'}
                onClick={() => {
                  setActiveTab('ui')
                  setSearchTerm('')
                }}
                icon={<Palette className="h-5 w-5" />}
                hoverBorder
                className="px-1 py-4"
                badge={<Badge variant="info">Lab</Badge>}
              >
                UI
              </TabButton>
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
            />
          ) : activeTab === 'users' ? (
            <UsersTab
              users={filteredUsers}
              companies={companies}
              isLoading={isLoadingUsers}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedCompanyFilter={selectedCompanyFilter}
              onCompanyFilterChange={setSelectedCompanyFilter}
              onNew={handleNewUser}
              onEdit={handleEditUser}
            />
          ) : activeTab === 'profiles' ? (
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
          ) : (
            <AdminUiTab companyName={company?.name} />
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
        </div>
      </div>
    </div>
  )
}

// ============================================
// Companies Tab
// ============================================

interface CompaniesTabProps {
  companies: Company[]
  isLoading: boolean
  searchTerm: string
  onSearchChange: (value: string) => void
  onNew: () => void
  onEdit: (company: Company) => void
}

function CompaniesTab({
  companies,
  isLoading,
  searchTerm,
  onSearchChange,
  onNew,
  onEdit,
}: CompaniesTabProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" />
        <p className="mt-4 text-sm text-gray-500">Carregando empresas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar empresa..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
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
            <div key={company.id} className="cursor-pointer" onClick={() => onEdit(company)}>
              <Card className="h-full transition-shadow hover:shadow-lg">
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
                        e.stopPropagation()
                        onEdit(company)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
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
  )
}

// ============================================
// Users Tab
// ============================================

interface UsersTabProps {
  users: AppUser[]
  companies: Company[]
  isLoading: boolean
  searchTerm: string
  onSearchChange: (value: string) => void
  selectedCompanyFilter: string
  onCompanyFilterChange: (value: string) => void
  onNew: () => void
  onEdit: (user: AppUser) => void
}

function UsersTab({
  users,
  companies,
  isLoading,
  searchTerm,
  onSearchChange,
  selectedCompanyFilter,
  onCompanyFilterChange,
  onNew,
  onEdit,
}: UsersTabProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" />
        <p className="mt-4 text-sm text-gray-500">Carregando usuários...</p>
      </div>
    )
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
              className="pl-10"
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
      {users.length === 0 ? (
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
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Perfil
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {users.map((user) => {
                  const roleColor = roleColors[user.role as UserRole]
                  return (
                    <tr
                      key={user.id}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => onEdit(user)}
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="bg-primary-100 dark:bg-primary-900/30 flex h-10 w-10 items-center justify-center rounded-full">
                              <span className="text-primary-600 dark:text-primary-400 font-medium">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {user.company?.name || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${roleColor.bg} ${roleColor.text}`}
                        >
                          {roleLabels[user.role as UserRole]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {user.active ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                            <XCircle className="h-4 w-4" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(user)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ============================================
// Profiles Tab
// ============================================

interface ProfilesTabProps {
  profiles: AccessProfile[]
  companies: Company[]
  isLoading: boolean
  searchTerm: string
  onSearchChange: (value: string) => void
  selectedCompanyFilter: string
  onCompanyFilterChange: (value: string) => void
  onNew: () => void
  onEdit: (profile: AccessProfile) => void
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
  const deleteMutation = useDeleteAccessProfile()

  const handleDelete = async (e: React.MouseEvent, profile: AccessProfile) => {
    e.stopPropagation()

    if (profile.is_system) {
      toast.error('Perfis do sistema não podem ser excluídos')
      return
    }

    if (!confirm(`Tem certeza que deseja excluir o perfil "${profile.name}"?`)) {
      return
    }

    try {
      await deleteMutation.mutateAsync(profile.id)
      toast.success('Perfil excluído com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir perfil')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" />
        <p className="mt-4 text-sm text-gray-500">Carregando perfis...</p>
      </div>
    )
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
              className="pl-10"
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
          icon={<ShieldCheck className="h-16 w-16" />}
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
                        <Pencil className="h-4 w-4" />
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
  )
}
