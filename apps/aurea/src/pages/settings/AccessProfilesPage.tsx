import { useState } from 'react';
import { Card, CardContent, Button, Input, Loading, EmptyState, Modal } from '@/components/ui';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<AccessProfile | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<AccessProfile | null>(null);

  const { company } = useAuthStore();
  const { data: accessProfiles = [], isLoading: isLoadingProfiles } = useAccessProfiles(
    company?.id
  );
  const deleteProfile = useDeleteAccessProfile();

  const filteredProfiles = accessProfiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditProfile = (profile: AccessProfile) => {
    setSelectedProfile(profile);
    setIsProfileModalOpen(true);
  };

  const handleNewProfile = () => {
    setSelectedProfile(null);
    setIsProfileModalOpen(true);
  };

  const handleDeleteClick = (profile: AccessProfile) => {
    setProfileToDelete(profile);
    setIsDeleteModalOpen(true);
  };

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

      {/* Search */}
      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Profiles Grid */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <ShieldCheck className="h-5 w-5" />
          Perfis ({filteredProfiles.length})
        </h2>

        {isLoadingProfiles ? (
          <div className="flex justify-center py-8">
            <Loading size="lg" />
          </div>
        ) : filteredProfiles.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <EmptyState
                icon={<ShieldCheck className="h-16 w-16" />}
                title="Nenhum perfil encontrado"
                description={
                  searchTerm ? 'Tente ajustar sua busca' : "Clique em 'Novo Perfil' para criar um"
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProfiles.map((profile) => (
              <Card key={profile.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {profile.name}
                        </h3>
                      </div>
                      <p className="mb-2 text-sm text-gray-500">Código: {profile.code}</p>
                      {profile.description && (
                        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                          {profile.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>
                          Criado em{' '}
                          {format(new Date(profile.created_at), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditProfile(profile)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(profile)}
                        className="text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

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
              variant="secondary"
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
