import { useState, useEffect } from 'react';
import { Modal, Input, Button, Select } from '@/components/ui';
import {
  AppUser,
  UserRole,
  useCreateAppUser,
  useUpdateAppUser,
  useDeactivateAppUser,
  useReactivateAppUser,
  useResetUserPassword,
} from '@/hooks/useAppUsers';
import { useAccessProfiles } from '@/hooks/useAccessProfiles';
import { Company } from '@/hooks/useCompanies';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Key } from 'lucide-react';
interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser | null;
  companies: Company[];
}

const roles: UserRole[] = [
  'admin',
  'manager',
  'clinician',
  'stock',
  'finance',
  'viewer',
  'shift_only',
];

export default function UserModal({ isOpen, onClose, user, companies }: UserModalProps) {
  const isEditing = !!user;

  const [formData, setFormData] = useState({
    company_id: '',
    name: '',
    email: '',
    password: '',
    role: 'viewer' as UserRole,
    access_profile_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Buscar perfis de acesso
  const { data: accessProfiles = [] } = useAccessProfiles(formData.company_id || undefined);

  const createMutation = useCreateAppUser();
  const updateMutation = useUpdateAppUser();
  const deactivateMutation = useDeactivateAppUser();
  const reactivateMutation = useReactivateAppUser();
  const resetPasswordMutation = useResetUserPassword();

  const isLoading =
    createMutation.isPending ||
    updateMutation.isPending ||
    deactivateMutation.isPending ||
    reactivateMutation.isPending ||
    resetPasswordMutation.isPending;

  useEffect(() => {
    if (user) {
      setFormData({
        company_id: user.company_id,
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        access_profile_id: user.access_profile_id || '',
      });
    } else {
      setFormData({
        company_id: companies.length > 0 ? companies[0].id : '',
        name: '',
        email: '',
        password: '',
        role: 'viewer',
        access_profile_id: '',
      });
    }
    setErrors({});
    setShowPassword(false);
    setShowResetPassword(false);
    setNewPassword('');
  }, [user, isOpen, companies]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!isEditing) {
      if (!formData.password) {
        newErrors.password = 'Senha é obrigatória';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
      }

      if (!formData.company_id) {
        newErrors.company_id = 'Empresa é obrigatória';
      }
    }

    if (!formData.access_profile_id) {
      newErrors.access_profile_id = 'Perfil de acesso é obrigatório';
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
          id: user.id,
          name: formData.name,
          role: formData.role,
          access_profile_id: formData.access_profile_id || undefined,
        });
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await createMutation.mutateAsync({
          company_id: formData.company_id,
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          access_profile_id: formData.access_profile_id || undefined,
        });
        toast.success('Usuário criado com sucesso!');
      }
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      const message = error.message || 'Erro ao salvar usuário';
      setErrors({ submit: message });
      toast.error(message);
    }
  };

  const handleToggleActive = async () => {
    if (!user) return;

    try {
      if (user.active) {
        await deactivateMutation.mutateAsync(user.id);
        toast.success('Usuário desativado!');
      } else {
        await reactivateMutation.mutateAsync(user.id);
        toast.success('Usuário reativado!');
      }
      onClose();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      const message = error.message || 'Erro ao alterar status';
      setErrors({ submit: message });
      toast.error(message);
    }
  };

  const handleResetPassword = async () => {
    if (!user || !newPassword) return;

    if (newPassword.length < 6) {
      setErrors({ newPassword: 'Senha deve ter pelo menos 6 caracteres' });
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({
        userId: user.id,
        newPassword: newPassword,
      });
      toast.success('Senha alterada com sucesso!');
      setShowResetPassword(false);
      setNewPassword('');
    } catch (error: any) {
      console.error('Erro ao resetar senha:', error);
      const message = error.message || 'Erro ao resetar senha';
      setErrors({ newPassword: message });
      toast.error(message);
    }
  };

  // Filtrar perfis ativos
  const activeProfiles = accessProfiles.filter((p) => p.active);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Usuário' : 'Novo Usuário'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {errors.submit}
          </div>
        )}

        {!isEditing && (
          <div>
            <Select
              label="Empresa *"
              placeholder="Selecione uma empresa"
              options={companies.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              value={formData.company_id}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, company_id: e.target.value, access_profile_id: '' })
              }
              error={errors.company_id}
            />
          </div>
        )}

        {isEditing && (
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Empresa</p>
            <p className="font-medium text-gray-900 dark:text-white">{user.company?.name || '-'}</p>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nome *
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome completo"
            error={errors.name}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            E-mail *
          </label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@exemplo.com"
            error={errors.email}
            disabled={isEditing}
          />
          {isEditing && (
            <p className="mt-1 text-xs text-gray-500">O e-mail não pode ser alterado</p>
          )}
        </div>

        {!isEditing && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Senha *
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                error={errors.password}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        )}

        {/* Reset Password (apenas para edição) */}
        {isEditing && (
          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            {!showResetPassword ? (
              <Button
                type="button"
                variant="neutral"
                icon={<Key className="mr-2 h-4 w-4" />}
                size="sm"
                onClick={() => setShowResetPassword(true)}
              >
                Redefinir Senha
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Redefinir Senha
                </p>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova senha (mínimo 6 caracteres)"
                    error={errors.newPassword}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleResetPassword}
                    disabled={isLoading || !newPassword}
                    showIcon={false}
                  >
                    {resetPasswordMutation.isPending ? 'Salvando...' : 'Salvar Nova Senha'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowResetPassword(false);
                      setNewPassword('');
                      setErrors({});
                    }}
                    showIcon={false}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Perfil de Acesso */}
        <div>
          <Select
            label="Perfil de Acesso *"
            placeholder="Selecione um perfil"
            options={activeProfiles.map((profile) => ({
              value: profile.id,
              label: `${profile.name}${profile.is_system ? ' (Sistema)' : ''}${profile.is_admin ? ' ⭐' : ''}`,
            }))}
            value={formData.access_profile_id}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const newValue = e.target.value;
              const profile = activeProfiles.find((p) => p.id === newValue);

              let newRole: UserRole = 'viewer';

              if (profile) {
                // Se o código do perfil corresponde a uma role existente, usa ela
                if (roles.includes(profile.code as UserRole)) {
                  newRole = profile.code as UserRole;
                }
                // Se é admin, força admin
                else if (profile.is_admin) {
                  newRole = 'admin';
                }
                // Fallback inteligente para perfis que não são roles padrão
                else {
                  // Se o código contem 'clinician', 'medico', 'enfermeiro', assume clinical
                  if (
                    profile.code.includes('clinician') ||
                    profile.code.includes('medic') ||
                    profile.code.includes('enferm')
                  ) {
                    newRole = 'clinician';
                  }
                  // Se contem 'stock', 'estoque'
                  else if (profile.code.includes('stock') || profile.code.includes('estoque')) {
                    newRole = 'stock';
                  }
                  // Defaults to viewer for safety
                }
              }

              setFormData({
                ...formData,
                access_profile_id: newValue,
                role: newRole,
              });
            }}
            error={errors.access_profile_id}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            O perfil define as permissões e o nível de acesso (Role: {formData.role})
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
          <div>
            {isEditing && (
              <Button
                type="button"
                variant={user.active ? 'danger' : 'secondary'}
                onClick={handleToggleActive}
                disabled={isLoading}
              >
                {user.active ? 'Desativar' : 'Reativar'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
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
              {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Usuário'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
