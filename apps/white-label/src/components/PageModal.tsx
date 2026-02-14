import { useState, useEffect } from 'react';
import { Modal, Input, Button, Select } from '@/components/ui';
import usePages from '@/hooks/usePages';
import { useCompanyDatabases } from '@/hooks/useCompanyDatabases';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import type { Page } from '../types/database';

interface PageModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  page?: Page | null;
}

export default function PageModal({ isOpen, onClose, companyId, page }: PageModalProps) {
  const { appUser: _appUser } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    company_database_id: '',
    meta_data: {},
  });

  const { createPage, updatePage, isCreating, isUpdating } = usePages();
  const { data: databases = [] } = useCompanyDatabases(companyId);
  const isEditing = !!page;
  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (page) {
      setFormData({
        name: page.name,
        company_database_id: page.company_database_id || '',
        meta_data: page.meta_data || {},
      });
    } else {
      setFormData({
        name: '',
        company_database_id: '',
        meta_data: {},
      });
    }
  }, [page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing && page) {
        await updatePage({
          id: page.id,
          updates: {
            name: formData.name,
            company_database_id: formData.company_database_id || undefined,
            meta_data: formData.meta_data,
          },
        });
        toast.success('Página atualizada com sucesso!');
      } else {
        await createPage({
          name: formData.name,
          company_database_id: formData.company_database_id || undefined,
          meta_data: formData.meta_data,
        });
        toast.success('Página criada com sucesso!');
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} página`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Página' : 'Nova Página'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nome da Página
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="ex: Vendas, Dashboards, Relatórios"
            required
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">Nome identificador da página no sistema</p>
        </div>

        <div>
          <Select
            label="Banco de Dados"
            options={[
              { value: '', label: 'Nenhum (opcional)' },
              ...databases.map((db) => ({
                value: db.id,
                label: `${db.name}${db.is_default ? ' (Padrão)' : ''}`,
              })),
            ]}
            value={formData.company_database_id}
            onChange={(e: { target: { value: string } }) =>
              setFormData((prev) => ({
                ...prev,
                company_database_id: e.target?.value || '',
              }))
            }
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Selecione o banco de dados para esta página consultar views e dados
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Página'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
