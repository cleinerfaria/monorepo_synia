import { useState, useEffect } from 'react';
import { Modal, Input, Button, Badge } from '@/components/ui';
import {
  AccessProfile,
  ModulePermission,
  useModulePermissions,
  useCreateAccessProfile,
  useUpdateAccessProfile,
  groupPermissionsByModule,
} from '@/hooks/useAccessProfiles';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';
interface AccessProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AccessProfile | null;
  companyId: string;
  existingPermissionIds?: string[];
}

export default function AccessProfileModal({
  isOpen,
  onClose,
  profile,
  companyId,
  existingPermissionIds = [],
}: AccessProfileModalProps) {
  const isEditing = !!profile;

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    is_admin: false,
  });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Buscar todas as permissões
  const { data: allPermissions = [], isLoading: isLoadingPermissions } = useModulePermissions();

  const createMutation = useCreateAccessProfile();
  const updateMutation = useUpdateAccessProfile();

  const isLoading = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (profile) {
      setFormData({
        code: profile.code,
        name: profile.name,
        description: profile.description || '',
        is_admin: profile.is_admin,
      });
      setSelectedPermissions(new Set(existingPermissionIds));
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        is_admin: false,
      });
      setSelectedPermissions(new Set());
    }
    setErrors({});
  }, [profile, isOpen, existingPermissionIds]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Código é obrigatório';
    } else if (!/^[a-z0-9_]+$/.test(formData.code)) {
      newErrors.code = 'Código deve conter apenas letras minúsculas, números e underscore';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: profile.id,
          name: formData.name,
          description: formData.description || undefined,
          is_admin: formData.is_admin,
          permission_ids: Array.from(selectedPermissions),
        });
        toast.success('Perfil atualizado com sucesso!');
      } else {
        await createMutation.mutateAsync({
          company_id: companyId,
          code: formData.code,
          name: formData.name,
          description: formData.description || undefined,
          is_admin: formData.is_admin,
          permission_ids: Array.from(selectedPermissions),
        });
        toast.success('Perfil criado com sucesso!');
      }
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      const message = error.message || 'Erro ao salvar perfil';
      setErrors({ submit: message });
      toast.error(message);
    }
  };

  const togglePermission = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const toggleModule = (modulePermissions: ModulePermission[]) => {
    const modulePermissionIds = modulePermissions.map((p) => p.id);
    const allSelected = modulePermissionIds.every((id) => selectedPermissions.has(id));

    const newSelected = new Set(selectedPermissions);
    if (allSelected) {
      modulePermissionIds.forEach((id) => newSelected.delete(id));
    } else {
      modulePermissionIds.forEach((id) => newSelected.add(id));
    }
    setSelectedPermissions(newSelected);
  };

  const selectAll = () => {
    setSelectedPermissions(new Set(allPermissions.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedPermissions(new Set());
  };

  // Agrupar permissões por módulo
  const groupedPermissions = groupPermissionsByModule(allPermissions);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Perfil de Acesso' : 'Novo Perfil de Acesso'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {errors.submit}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Código *
            </label>
            <Input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
              placeholder="ex: operador_estoque"
              error={errors.code}
              disabled={isEditing}
            />
            {isEditing && (
              <p className="mt-1 text-xs text-gray-500">O código não pode ser alterado</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Operador de Estoque"
              error={errors.name}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Descrição
          </label>
          <Input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Breve descrição do perfil"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_admin"
            checked={formData.is_admin}
            onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
            className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="is_admin" className="text-sm text-gray-700 dark:text-gray-300">
            Administrador (acesso total a todas as funcionalidades)
          </label>
        </div>

        {/* Permissões */}
        {!formData.is_admin && (
          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white">Permissões</h3>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
                  Selecionar Tudo
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={deselectAll}>
                  Limpar
                </Button>
              </div>
            </div>

            {isLoadingPermissions ? (
              <p className="text-sm text-gray-500">Carregando permissões...</p>
            ) : (
              <div className="max-h-96 space-y-4 overflow-y-auto pr-2">
                {groupedPermissions.map(({ module, permissions }) => {
                  const modulePermissionIds = permissions.map((p) => p.id);
                  const selectedCount = modulePermissionIds.filter((id) =>
                    selectedPermissions.has(id)
                  ).length;
                  const allSelected = selectedCount === permissions.length;
                  const someSelected = selectedCount > 0 && selectedCount < permissions.length;

                  return (
                    <div
                      key={module.code}
                      className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      {/* Module Header */}
                      <div
                        className="flex cursor-pointer items-center justify-between bg-gray-50 px-4 py-2 dark:bg-gray-800"
                        onClick={() => toggleModule(permissions)}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded border ${
                              allSelected
                                ? 'border-primary-500 bg-primary-500'
                                : someSelected
                                  ? 'border-primary-500 bg-primary-200'
                                  : 'border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {allSelected && <Check className="h-3 w-3 text-white" />}
                            {someSelected && <div className="bg-primary-500 h-2 w-2 rounded-sm" />}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {module.name}
                          </span>
                        </div>
                        <Badge variant="neutral">
                          {selectedCount}/{permissions.length}
                        </Badge>
                      </div>

                      {/* Permissions */}
                      <div className="grid grid-cols-2 gap-2 px-4 py-2">
                        {permissions.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex cursor-pointer items-center gap-2 rounded p-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                              className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
                            />
                            <span className="text-gray-700 dark:text-gray-300">
                              {permission.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            showIcon={false}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} showIcon={false}>
            {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Perfil'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
