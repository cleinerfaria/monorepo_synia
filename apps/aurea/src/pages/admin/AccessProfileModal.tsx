import { useState, useEffect, useMemo } from 'react';
import { Modal, Input, Button } from '@/components/ui';
import {
  AccessProfile,
  useModulePermissions,
  useCreateAccessProfile,
  useUpdateAccessProfile,
  groupPermissionsByModule,
} from '@/hooks/useAccessProfiles';
import toast from 'react-hot-toast';

interface AccessProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AccessProfile | null;
  companyId: string;
  existingPermissionIds?: string[];
}

const EMPTY_PERMISSION_IDS: string[] = [];
const SHIFT_MODULE_CODE = 'my_shifts';
const SHIFT_PERMISSION_CODE = 'view';

function formatPermissionCodeLabel(code: string) {
  return code
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AccessProfileModal({
  isOpen,
  onClose,
  profile,
  companyId,
  existingPermissionIds = EMPTY_PERMISSION_IDS,
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

  const normalizedPermissionIds = useMemo(
    () => [...existingPermissionIds],
    [existingPermissionIds]
  );

  useEffect(() => {
    if (profile) {
      setFormData({
        code: profile.code,
        name: profile.name,
        description: profile.description || '',
        is_admin: profile.is_admin,
      });
      setSelectedPermissions(new Set(normalizedPermissionIds));
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
  }, [profile, isOpen, normalizedPermissionIds]);

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

  const toggleModulePermissions = (modulePermissionIds: string[]) => {
    if (modulePermissionIds.length === 0) return;

    const areAllSelected = modulePermissionIds.every((permissionId) =>
      selectedPermissions.has(permissionId)
    );

    const newSelected = new Set(selectedPermissions);
    if (areAllSelected) {
      modulePermissionIds.forEach((permissionId) => newSelected.delete(permissionId));
    } else {
      modulePermissionIds.forEach((permissionId) => newSelected.add(permissionId));
    }

    setSelectedPermissions(newSelected);
  };

  const selectAll = () => {
    setSelectedPermissions(new Set(allPermissions.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedPermissions(new Set());
  };

  const shiftPagePermission = useMemo(
    () =>
      allPermissions.find(
        (permission) =>
          permission.module?.code === SHIFT_MODULE_CODE && permission.code === SHIFT_PERMISSION_CODE
      ),
    [allPermissions]
  );

  const groupedPermissions = useMemo(() => {
    const permissionsForGrid = allPermissions.filter(
      (permission) =>
        !(
          permission.module?.code === SHIFT_MODULE_CODE && permission.code === SHIFT_PERMISSION_CODE
        )
    );
    return groupPermissionsByModule(permissionsForGrid);
  }, [allPermissions]);

  const basePermissionColumns = useMemo(
    () => [
      { code: 'view', label: 'Visualizar' },
      { code: 'create', label: 'Criar' },
      { code: 'edit', label: 'Editar' },
      { code: 'delete', label: 'Excluir' },
    ],
    []
  );

  const permissionColumns = useMemo(() => {
    const baseCodes = new Set(basePermissionColumns.map((column) => column.code));
    const extraColumnsMap = new Map<string, string>();

    allPermissions.forEach((permission) => {
      if (
        permission.module?.code === SHIFT_MODULE_CODE &&
        permission.code === SHIFT_PERMISSION_CODE
      ) {
        return;
      }

      if (!baseCodes.has(permission.code) && !extraColumnsMap.has(permission.code)) {
        extraColumnsMap.set(permission.code, permission.name || formatPermissionCodeLabel(permission.code));
      }
    });

    const extraColumns = Array.from(extraColumnsMap.entries())
      .sort(([codeA], [codeB]) => codeA.localeCompare(codeB))
      .map(([code, label]) => ({
        code,
        label,
      }));

    return [...basePermissionColumns, ...extraColumns];
  }, [allPermissions, basePermissionColumns]);

  const hasShiftPageAccess =
    !!shiftPagePermission && selectedPermissions.has(shiftPagePermission.id);

  const toggleShiftPageAccess = (enabled: boolean) => {
    if (!shiftPagePermission) return;

    const newSelectedPermissions = new Set(selectedPermissions);
    if (enabled) {
      newSelectedPermissions.add(shiftPagePermission.id);
    } else {
      newSelectedPermissions.delete(shiftPagePermission.id);
    }
    setSelectedPermissions(newSelectedPermissions);
  };

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

        {!formData.is_admin && !!shiftPagePermission ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <input
                type="checkbox"
                id="is_admin"
                checked={formData.is_admin}
                onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Administrador (acesso total)
              </span>
            </label>

            <label
              htmlFor="has_shift_page_access"
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
            >
              <input
                type="checkbox"
                id="has_shift_page_access"
                checked={hasShiftPageAccess}
                onChange={(e) => toggleShiftPageAccess(e.target.checked)}
                className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Acesso à página Meu Plantão
                </span>
              </div>
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_admin"
              checked={formData.is_admin}
              onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
              className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="is_admin" className="text-sm text-gray-700 dark:text-gray-300">
              Administrador (acesso total)
            </label>
          </div>
        )}

        {/* Permissões */}
        {!formData.is_admin && (
          <div>
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
              <div className="max-h-96 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        Módulo
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        Tudo
                      </th>
                      {permissionColumns.map((column) => (
                        <th
                          key={column.code}
                          className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
                    {groupedPermissions.map(({ module, permissions }) => {
                      const modulePermissionIds = permissions.map((permission) => permission.id);
                      const allModulePermissionsSelected =
                        modulePermissionIds.length > 0 &&
                        modulePermissionIds.every((permissionId) =>
                          selectedPermissions.has(permissionId)
                        );

                      return (
                        <tr key={module.code}>
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {module.name}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={allModulePermissionsSelected}
                              onChange={() => toggleModulePermissions(modulePermissionIds)}
                              className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
                            />
                          </td>
                          {permissionColumns.map((column) => {
                            const permission = permissions.find(
                              (item) => item.code === column.code
                            );

                            return (
                              <td key={column.code} className="px-4 py-3 text-center">
                                {permission ? (
                                  <input
                                    type="checkbox"
                                    checked={selectedPermissions.has(permission.id)}
                                    onChange={() => togglePermission(permission.id)}
                                    className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
                                  />
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button
            type="button"
            variant="neutral"
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
