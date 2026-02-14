import { useState, useMemo, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Edit, Plus, Search, Users } from 'lucide-react';
import { Card, Button, DataTable, EmptyState, Badge } from '@/components/ui';
import { useAppUsers, AppUser } from '@/hooks/useAppUsers';
import { useAccessProfiles } from '@/hooks/useAccessProfiles';
import { useAuthStore } from '@/stores/authStore';
import UserModal from '@/pages/admin/UserModal';
import { DEFAULT_COMPANY_COLOR } from '@/lib/themeConstants';

export default function UsersPage() {
  const [searchInput, setSearchInput] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  const { company } = useAuthStore();
  const { data: users = [], isLoading: isLoadingUsers } = useAppUsers(company?.id);
  const { data: accessProfiles = [] } = useAccessProfiles(company?.id);

  const filteredUsers = useMemo(() => {
    if (!searchInput.trim()) return users;
    const query = searchInput.toLowerCase();
    return users.filter(
      (user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    );
  }, [users, searchInput]);

  const handleEditUser = useCallback((user: AppUser) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  }, []);

  const handleNewUser = useCallback(() => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  }, []);

  const getProfileName = useCallback(
    (profileId?: string, profileName?: string | null) => {
      if (profileName) return profileName;
      if (!profileId) return null;
      const profile = accessProfiles.find((p) => p.id === profileId);
      return profile?.name;
    },
    [accessProfiles]
  );

  const columns: ColumnDef<AppUser>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Usuário',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="bg-primary-100 dark:bg-primary-900/30 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
              <Users className="text-primary-600 dark:text-primary-400 h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900 dark:text-white">
                {row.original.name}
              </p>
              <p className="truncate text-sm text-gray-500">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'access_profile',
        header: 'Perfil de Acesso',
        cell: ({ row }) =>
          row.original.access_profile_id ? (
            <Badge variant="neutral">
              {getProfileName(row.original.access_profile_id, row.original.access_profile?.name) ||
                '-'}
            </Badge>
          ) : (
            <span className="text-gray-400">-</span>
          ),
      },
      {
        accessorKey: 'active',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.active ? 'success' : 'neutral'}>
            {row.original.active ? 'Ativo' : 'Inativo'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditUser(row.original);
              }}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [handleEditUser, getProfileName]
  );

  const emptyState = searchInput.trim() ? (
    <EmptyState
      icon={<Users className="h-12 w-12 text-gray-400" />}
      title="Nenhum usuário encontrado"
      description="Tente ajustar sua busca"
    />
  ) : (
    <EmptyState
      icon={<Users className="h-12 w-12 text-gray-400" />}
      title="Nenhum usuário cadastrado"
      description="Comece cadastrando seu primeiro usuário"
      action={
        <Button onClick={handleNewUser} size="sm">
          <Plus className="h-4 w-4" />
          Cadastrar Usuário
        </Button>
      }
    />
  );

  const companiesForModal = company
    ? [
        {
          id: company.id,
          name: company.name,
          trade_name: company.trade_name || null,
          document: company.document || null,
          logo_url: company.logo_url_expanded || company.logo_url_collapsed || null,
          logo_url_expanded_dark: null,
          logo_url_collapsed_dark: null,
          logo_url_expanded_light: null,
          logo_url_collapsed_light: null,
          primary_color: company.primary_color || DEFAULT_COMPANY_COLOR,
          theme_preference: company.theme_preference || 'system',
          created_at: '',
          updated_at: '',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Usuários
          </h1>
        </div>
        <Button onClick={handleNewUser}>
          <Plus className="h-5 w-5" />
          Novo Usuário
        </Button>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative w-full sm:w-[30%]">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <DataTable
            data={filteredUsers}
            columns={columns}
            isLoading={isLoadingUsers}
            onRowClick={handleEditUser}
            emptyState={emptyState}
          />
        </div>
      </Card>

      {/* User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        companies={companiesForModal}
        showCompanyField={false}
      />
    </div>
  );
}
