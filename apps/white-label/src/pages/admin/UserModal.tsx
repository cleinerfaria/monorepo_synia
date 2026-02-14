import { useState, useEffect, useMemo } from 'react';
import { Modal, Input, Button, Select } from '@/components/ui';
import {
  AppUser,
  useCreateAppUser,
  useUpdateAppUser,
  useDeactivateAppUser,
  useReactivateAppUser,
  useResetUserPassword,
} from '@/hooks/useAppUsers';
import { useAccessProfiles } from '@/hooks/useAccessProfiles';
import { Company } from '@/hooks/useCompanies';
import { Eye, EyeOff, Key } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser | null;
  companies: Company[];
  showCompanyField?: boolean;
}

export default function UserModal({
  isOpen,
  onClose,
  user,
  companies,
  showCompanyField = true,
}: UserModalProps) {
  const isEditing = !!user;
  const shouldShowCompanyField = showCompanyField;

  const [formData, setFormData] = useState({
    company_id: '',
    name: '',
    email: '',
    password: '',
    access_profile_id: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Buscar perfis de acesso - usar memo para evitar re-renders desnecessários
  const stableCompanyId = useMemo(() => {
    return user?.company_id || formData.company_id || companies[0]?.id || undefined;
  }, [user?.company_id, formData.company_id, companies]);
  const {
    data: accessProfiles = [],
    isLoading: _isLoadingProfiles,
    error: profilesError,
  } = useAccessProfiles(stableCompanyId);

  useEffect(() => {
    if (profilesError) {
      console.error('❌ Erro ao carregar perfis:', profilesError);
    }
  }, [profilesError]);

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
        access_profile_id: user.access_profile_id || '',
      });
      setConfirmPassword('');
    } else {
      setFormData({
        company_id: companies.length > 0 ? companies[0].id : '',
        name: '',
        email: '',
        password: '',
        access_profile_id: '',
      });
      setConfirmPassword('');
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

      if (!confirmPassword) {
        newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
      } else if (formData.password && formData.password !== confirmPassword) {
        newErrors.confirmPassword = 'As senhas não coincidem';
      }

      if (shouldShowCompanyField && !formData.company_id) {
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
          access_profile_id: formData.access_profile_id,
        });
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await createMutation.mutateAsync({
          company_id: formData.company_id,
          email: formData.email,
          password: formData.password,
          name: formData.name,
          access_profile_id: formData.access_profile_id,
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

  // Filtrar apenas perfis ativos (fallback para todos se nenhum estiver ativo)
  const activeProfiles = accessProfiles.filter((p) => p.active);
  const profilesToShow = activeProfiles.length > 0 ? activeProfiles : accessProfiles;

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

        {!isEditing && shouldShowCompanyField && (
          <Select
            label="Empresa"
            placeholder="Selecione uma empresa"
            options={companies.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
            value={formData.company_id}
            onChange={(e: { target: { value: string } }) =>
              setFormData({ ...formData, company_id: e.target.value, access_profile_id: '' })
            }
            error={errors.company_id}
            required
          />
        )}

        {isEditing && shouldShowCompanyField && (
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
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirmação de senha *
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  error={errors.confirmPassword}
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
          </div>
        )}

        {/* Reset Password (apenas para edição) */}
        {isEditing && (
          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            {!showResetPassword ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowResetPassword(true)}
              >
                <Key className="mr-2 h-4 w-4" />
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
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Perfil de Acesso */}
        <Select
          label="Perfil de Acesso"
          placeholder="Selecione um perfil"
          options={profilesToShow.map((profile) => ({
            value: profile.id,
            label: profile.name,
          }))}
          value={formData.access_profile_id}
          onChange={(e: { target: { value: string } }) => {
            setFormData({
              ...formData,
              access_profile_id: e.target.value,
            });
          }}
          error={errors.access_profile_id}
          required
        />

        {/* Actions */}
        <div className="flex justify-between pt-4 dark:border-gray-700">
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
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Usuário'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
