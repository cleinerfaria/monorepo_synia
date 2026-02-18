import { useState, useMemo, useCallback } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card, Button, DataTable, EmptyState, Modal, IconButton } from '@/components/ui';
import {
  useAccessProfiles,
  useDeleteAccessProfile,
  AccessProfile,
} from '@/hooks/useAccessProfiles';
import { useAuthStore } from '@/stores/authStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import AccessProfileModal from '@/pages/admin/AccessProfileModal';
import { ShieldCheck, Plus, Pencil, Trash2, Search } from 'lucide-react';

export default function AccessProfilesPage() {
  const [searchInput, setSearchInput] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<AccessProfile | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<AccessProfile | null>(null);

  const { company } = useAuthStore();
  const { data: accessProfiles = [], isLoading: isLoadingProfiles } = useAccessProfiles(
    company?.id
  );
  const deleteProfile = useDeleteAccessProfile();

  const filteredProfiles = useMemo(() => {
    if (!searchInput.trim()) return accessProfiles;
    const query = searchInput.toLowerCase();

    return accessProfiles.filter(
      (profile) =>
        profile.name.toLowerCase().includes(query) || profile.code.toLowerCase().includes(query)
    );
  }, [accessProfiles, searchInput]);

  const handleEditProfile = useCallback((profile: AccessProfile) => {
    setSelectedProfile(profile);
    setIsProfileModalOpen(true);
  }, []);

  const handleNewProfile = useCallback(() => {
    setSelectedProfile(null);
    setIsProfileModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((profile: AccessProfile) => {
    setProfileToDelete(profile);
    setIsDeleteModalOpen(true);
  }, []);

  const columns: ColumnDef<AccessProfile>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Perfil',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900 dark:text-white">
                {row.original.name}
              </p>
              <p className="truncate text-sm text-gray-500">{row.original.code}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Descrição',
        cell: ({ row }) =>
          row.original.description ? (
            <p className="max-w-md truncate text-sm text-gray-600 dark:text-gray-400">
              {row.original.description}
            </p>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          ),
      },
      {
        accessorKey: 'created_at',
        header: 'Criado em',
        cell: ({ row }) => (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {format(new Date(row.original.created_at), 'dd/MM/yyyy', { locale: ptBR })}
          </span>
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
                handleEditProfile(row.original);
              }}
              title="Editar perfil"
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(row.original);
              }}
              className="text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
              title="Excluir perfil"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [handleDeleteClick, handleEditProfile]
  );

  const handleConfirmDelete = async () => {
    if (!profileToDelete) return;

    try {
      await deleteProfile.mutateAsync(profileToDelete.id);
      toast.success('Perfil excluído com sucesso');
      setIsDeleteModalOpen(false);
      setProfileToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir perfil');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Perfis de Acesso</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Configure os perfis e permissões do sistema
          </p>
        </div>
        <Button onClick={handleNewProfile} icon={<Plus className="mr-2 h-4 w-4" />}>
          Novo Perfil
        </Button>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          <div className="relative w-full sm:w-[30%]">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <DataTable
            data={filteredProfiles}
            columns={columns}
            isLoading={isLoadingProfiles}
            onRowClick={handleEditProfile}
            emptyState={
              searchInput.trim() ? (
                <EmptyState
                  icon={<ShieldCheck className="h-12 w-12 text-gray-400" />}
                  title="Nenhum perfil encontrado"
                  description="Tente ajustar sua busca"
                />
              ) : (
                <EmptyState
                  icon={<ShieldCheck className="h-12 w-12 text-gray-400" />}
                  title="Nenhum perfil cadastrado"
                  description="Comece criando seu primeiro perfil de acesso"
                  action={
                    <Button onClick={handleNewProfile} size="sm">
                      <Plus className="h-4 w-4" />
                      Novo Perfil
                    </Button>
                  }
                />
              )
            }
          />
        </div>
      </Card>

      {/* Profile Modal */}
      {company?.id && (
        <AccessProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedProfile(null);
          }}
          profile={selectedProfile}
          companyId={company.id}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProfileToDelete(null);
        }}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir o perfil{' '}
            <strong className="text-gray-900 dark:text-white">{profileToDelete?.name}</strong>?
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Esta ação não pode ser desfeita. Usuários vinculados a este perfil ficarão sem perfil de
            acesso.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="neutral"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setProfileToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={deleteProfile.isPending}
            >
              {deleteProfile.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
