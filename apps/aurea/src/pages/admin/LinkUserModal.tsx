import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Input, Button } from '@/components/ui';
import { Company } from '@/hooks/useCompanies';
import { UserRole, roleLabels, useLinkCurrentUser } from '@/hooks/useAppUsers';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface LinkUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
}

const roles: UserRole[] = ['admin', 'manager', 'clinician', 'stock', 'finance', 'viewer'];

export default function LinkUserModal({ isOpen, onClose, companies }: LinkUserModalProps) {
  const navigate = useNavigate();
  const { user, setAppUser, setCompany } = useAuthStore();

  const [formData, setFormData] = useState({
    company_id: '',
    name: '',
    role: 'admin' as UserRole,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const linkMutation = useLinkCurrentUser();

  useEffect(() => {
    if (isOpen) {
      setFormData({
        company_id: companies.length > 0 ? companies[0].id : '',
        name: user?.user_metadata?.name || user?.email?.split('@')[0] || '',
        role: 'admin',
      });
      setErrors({});
    }
  }, [isOpen, companies, user]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.company_id) {
      newErrors.company_id = 'Empresa é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const appUser = await linkMutation.mutateAsync({
        company_id: formData.company_id,
        name: formData.name,
        role: formData.role,
      });

      // Atualizar o estado global com o novo appUser e company
      setAppUser(appUser);

      // Buscar a empresa
      const { data: companyData } = await supabase
        .from('company')
        .select('*')
        .eq('id', formData.company_id)
        .single();

      if (companyData) {
        setCompany(companyData);
      }

      toast.success('Conta vinculada com sucesso!');
      onClose();

      // Redirecionar para o dashboard
      navigate('/');
    } catch (error: any) {
      console.error('Erro ao vincular conta:', error);
      toast.error(error.message || 'Erro ao vincular conta');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Vincular Minha Conta" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Você está logado como: <strong>{user?.email}</strong>
          </p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
            Este formulário irá vincular sua conta a uma empresa existente.
          </p>
        </div>

        {/* Empresa */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Empresa *
          </label>
          <select
            value={formData.company_id}
            onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.company_id && <p className="mt-1 text-sm text-red-500">{errors.company_id}</p>}
        </div>

        {/* Nome */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Seu Nome *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Digite seu nome"
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        {/* Perfil */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Perfil de Acesso
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button type="button" variant="ghost" onClick={onClose} showIcon={false}>
            Cancelar
          </Button>
          <Button type="submit" disabled={linkMutation.isPending}>
            {linkMutation.isPending ? 'Vinculando...' : 'Vincular Conta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
