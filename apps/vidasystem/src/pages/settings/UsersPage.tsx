import { useState, useMemo, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card, Button, DataTable, EmptyState, Badge, IconButton } from '@/components/ui';
import { useAppUsers, AppUser } from '@/hooks/useAppUsers';
import { useAuthStore } from '@/stores/authStore';
import UserModal from '@/pages/admin/UserModal';
import { Users, Plus, Pencil, Search } from 'lucide-react';
export default function UsersPage() {
  const [searchInput, setSearchInput] = useState('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  const { company } = useAuthStore();
  const { data: users = [], isLoading: isLoadingUsers } = useAppUsers(company?.id);

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

  const columns: ColumnDef<AppUser>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Usuário',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
          row.original.access_profile ? (
            <Badge variant="neutral">{row.original.access_profile.name}</Badge>
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
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleEditUser(row.original);
              }}
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
          </div>
        ),
      },
    ],
    [handleEditUser]
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
        <Button icon={<Plus className="h-4 w-4" />} onClick={handleNewUser} size="sm">
          Cadastrar Usuário
        </Button>
      }
    />
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Usuários
          </h1>
        </div>
        <Button onClick={handleNewUser} icon={<Plus className="h-5 w-5" />}>
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
        companies={[]}
        tenantCompanyId={company?.id}
        hideCompanyInfo={true}
      />
    </div>
  );
}
