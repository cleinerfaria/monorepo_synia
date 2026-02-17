import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Input, Button, Select } from '@/components/ui';
import { Company } from '@/hooks/useCompanies';
import { useLinkCurrentUser } from '@/hooks/useAppUsers';
import { useAccessProfiles } from '@/hooks/useAccessProfiles';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface LinkUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
}

export default function LinkUserModal({ isOpen, onClose, companies }: LinkUserModalProps) {
  const navigate = useNavigate();
  const { user, setAppUser, setCompany } = useAuthStore();

  const [formData, setFormData] = useState({
    company_id: '',
    name: '',
    access_profile_id: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Buscar perfis de acesso
  const { data: accessProfiles = [] } = useAccessProfiles(formData.company_id || undefined);

  const linkMutation = useLinkCurrentUser();

  useEffect(() => {
    if (isOpen) {
      setFormData({
        company_id: companies.length > 0 ? companies[0].id : '',
        name: user?.user_metadata?.name || user?.email?.split('@')[0] || '',
        access_profile_id: '',
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
      const appUser = await linkMutation.mutateAsync({
        company_id: formData.company_id,
        name: formData.name,
        access_profile_id: formData.access_profile_id,
      });

      // Atualizar o estado global com o novo appUser e company
      setAppUser(appUser as any);

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

  // Filtrar perfis ativos
  const activeProfiles = accessProfiles.filter((p) => p.active);

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

        {/* Nome */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Seu Nome *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Digite seu nome"
            error={errors.name}
          />
        </div>

        {/* Perfil de Acesso */}
        <div>
          <Select
            label="Perfil de Acesso *"
            placeholder="Selecione um perfil"
            options={activeProfiles.map((profile) => ({
              value: profile.id,
              label: `${profile.name}${profile.is_admin ? ' ⭐' : ''}`,
            }))}
            value={formData.access_profile_id}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, access_profile_id: e.target.value })
            }
            error={errors.access_profile_id}
          />
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
