import { useState, useEffect } from 'react';
import { Modal, Input, Button } from '@synia/ui';
import {
  SystemUser,
  useCreateSystemUser,
  useUpdateSystemUser,
  useDeleteSystemUser,
} from '@/hooks/useSystemUsers';
import { Eye, EyeOff, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface SystemUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SystemUser | null;
}

export default function SystemUserModal({ isOpen, onClose, user }: SystemUserModalProps) {
  const isEditing = !!user;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    is_superadmin: false,
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const createMutation = useCreateSystemUser();
  const updateMutation = useUpdateSystemUser();
  const deleteMutation = useDeleteSystemUser();

  const isLoading =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        is_superadmin: user.is_superadmin,
      });
      setConfirmPassword('');
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        is_superadmin: false,
      });
      setConfirmPassword('');
    }
    setErrors({});
    setShowPassword(false);
    setShowDeleteConfirm(false);
  }, [user, isOpen]);

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
          auth_user_id: user.auth_user_id,
          name: formData.name,
          is_superadmin: formData.is_superadmin,
        });
        toast.success('Usuário do sistema atualizado com sucesso!');
      } else {
        await createMutation.mutateAsync({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          is_superadmin: formData.is_superadmin,
        });
        toast.success('Usuário do sistema criado com sucesso!');
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving system user:', error);
      toast.error(error.message || 'Erro ao salvar usuário do sistema');
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      await deleteMutation.mutateAsync(user.auth_user_id);
      toast.success('Usuário do sistema removido com sucesso!');
      onClose();
    } catch (error: any) {
      console.error('Error deleting system user:', error);
      toast.error(error.message || 'Erro ao remover usuário do sistema');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Usuário do Sistema' : 'Novo Usuário do Sistema'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <div>
          <label
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Nome *
          </label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nome do usuário"
            error={errors.name}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            E-mail *
          </label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="email@exemplo.com"
            disabled={isEditing}
            error={errors.email}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

        {/* Senha (apenas para novos usuários) */}
        {!isEditing && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Senha *
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  error={errors.password}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirmar Senha *
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  error={errors.confirmPassword}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        )}

        {/* Tipo de Usuário */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tipo de Usuário *
          </label>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
              <input
                type="radio"
                name="is_superadmin"
                checked={formData.is_superadmin === true}
                onChange={() => setFormData((prev) => ({ ...prev, is_superadmin: true }))}
                className="text-primary-600 h-4 w-4"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Superadmin</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Acesso total ao sistema</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
              <input
                type="radio"
                name="is_superadmin"
                checked={formData.is_superadmin === false}
                onChange={() => setFormData((prev) => ({ ...prev, is_superadmin: false }))}
                className="text-primary-600 h-4 w-4"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Administrador Multi-tenant
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pode cadastrar empresas e gerenciar limites de instâncias
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Aviso de deleção */}
        {isEditing && showDeleteConfirm && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="font-medium text-red-800 dark:text-red-200">
                  Tem certeza que deseja remover este usuário?
                </p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  Esta ação removerá o acesso do usuário ao sistema administrativo.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isLoading}
                  >
                    Confirmar Remoção
                  </Button>
                  <Button
                    type="button"
                    variant="neutral"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4">
          {isEditing ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading || showDeleteConfirm}
            >
              <Trash2 className="mr-2 h-4 w-4 text-red-500" />
              Remover
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="neutral" onClick={onClose} disabled={isLoading}>
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
