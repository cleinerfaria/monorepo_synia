import { useState, useEffect } from 'react';
import { Modal, Input, Button, Select } from '@synia/ui';
import usePageFilters from '@/hooks/usePageFilters';
import toast from 'react-hot-toast';
import type { PageFilter, PageFilterType, PageFilterSubtype } from '../types/database';

interface PageFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  pageId: string | null;
  pageFilter?: PageFilter | null;
}

const FILTER_TYPES: { value: PageFilterType; label: string }[] = [
  { value: 'input', label: 'Campo de Texto' },
  { value: 'textarea', label: 'Área de Texto' },
  { value: 'select', label: 'Lista de Seleção' },
  { value: 'multiselect', label: 'Seleção Múltipla' },
  { value: 'date', label: 'Data' },
  { value: 'daterange', label: 'Período de Datas' },
  { value: 'number', label: 'Número' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Opção Única' },
];

const FILTER_SUBTYPES: { value: PageFilterSubtype; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'url', label: 'URL' },
  { value: 'password', label: 'Senha' },
  { value: 'search', label: 'Busca' },
  { value: 'company', label: 'Empresa' },
  { value: 'user', label: 'Usuário' },
  { value: 'status', label: 'Status' },
  { value: 'category', label: 'Categoria' },
  { value: 'tag', label: 'Tag' },
  { value: 'period', label: 'Período' },
  { value: 'custom', label: 'Personalizado' },
];

export default function PageFilterModal({
  isOpen,
  onClose,
  pageId,
  pageFilter,
}: PageFilterModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'input' as PageFilterType,
    subtype: 'text' as PageFilterSubtype,
    label: '',
    placeholder: '',
    options_view: '',
    order_index: 0,
    active: true,
    has_search: false,
    page_size: 20,
    meta_data: {} as Record<string, any>,
    // Campos específicos para select/multiselect
    valueField: 'id',
    labelField: 'name',
  });

  const { createPageFilter, updatePageFilter, isCreating, isUpdating } = usePageFilters(
    pageId || undefined
  );
  const isEditing = !!pageFilter;
  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (pageFilter) {
      setFormData({
        name: pageFilter.name,
        type: pageFilter.type,
        subtype: pageFilter.subtype || 'text',
        label: pageFilter.label || '',
        placeholder: pageFilter.placeholder || '',
        options_view: pageFilter.options_view || '',
        order_index: pageFilter.order_index || 0,
        active: pageFilter.active ?? true,
        has_search: pageFilter.has_search ?? false,
        page_size: pageFilter.page_size ?? 20,
        meta_data: pageFilter.meta_data || {},
        valueField: pageFilter.meta_data?.valueField || 'id',
        labelField: pageFilter.meta_data?.labelField || 'name',
      });
    } else {
      setFormData({
        name: '',
        type: 'input',
        subtype: 'text',
        label: '',
        placeholder: '',
        options_view: '',
        order_index: 0,
        active: true,
        has_search: false,
        page_size: 20,
        meta_data: {},
        valueField: 'id',
        labelField: 'name',
      });
    }
  }, [pageFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pageId) {
      toast.error('Selecione uma página primeiro');
      return;
    }

    // Montar meta_data com valueField e labelField se for select/multiselect
    const meta_data = {
      ...formData.meta_data,
      ...(needsOptionsView && {
        valueField: formData.valueField || 'id',
        labelField: formData.labelField || 'name',
      }),
    };

    try {
      if (isEditing && pageFilter) {
        await updatePageFilter({
          id: pageFilter.id,
          updates: {
            name: formData.name,
            type: formData.type,
            subtype: formData.subtype,
            label: formData.label || undefined,
            placeholder: formData.placeholder || undefined,
            options_view: formData.options_view || undefined,
            order_index: formData.order_index,
            active: formData.active,
            has_search: formData.has_search,
            page_size: formData.page_size,
            meta_data,
          },
        });
        toast.success('Filtro atualizado com sucesso!');
      } else {
        await createPageFilter({
          page_id: pageId,
          name: formData.name,
          type: formData.type,
          subtype: formData.subtype,
          label: formData.label || undefined,
          placeholder: formData.placeholder || undefined,
          options_view: formData.options_view || undefined,
          order_index: formData.order_index,
          active: formData.active,
          has_search: formData.has_search,
          page_size: formData.page_size,
          meta_data,
        });
        toast.success('Filtro criado com sucesso!');
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} filtro`);
    }
  };

  const needsOptionsView = formData.type === 'select' || formData.type === 'multiselect';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Filtro' : 'Novo Filtro'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nome do Filtro
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="ex: empresa, periodo, status"
            required
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">Nome identificador do filtro</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Rótulo (Label)
          </label>
          <Input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
            placeholder="ex: Empresa, Período, Status"
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Texto amigável exibido na interface (deixe vazio para usar o nome)
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Select
              label="Tipo"
              options={FILTER_TYPES.map((type) => ({
                value: type.value,
                label: type.label,
              }))}
              value={formData.type}
              onChange={(value: string) =>
                setFormData((prev) => ({
                  ...prev,
                  type: value as PageFilterType,
                }))
              }
              disabled={isLoading}
            />
          </div>

          <div>
            <Select
              label="Subtipo"
              options={FILTER_SUBTYPES.map((subtype) => ({
                value: subtype.value,
                label: subtype.label,
              }))}
              value={formData.subtype}
              onChange={(value: string) =>
                setFormData((prev) => ({
                  ...prev,
                  subtype: value as PageFilterSubtype,
                }))
              }
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Placeholder
          </label>
          <Input
            type="text"
            value={formData.placeholder}
            onChange={(e) => setFormData((prev) => ({ ...prev, placeholder: e.target.value }))}
            placeholder="Texto de ajuda para o usuário"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ordem
            </label>
            <Input
              type="number"
              value={formData.order_index}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))
              }
              placeholder="0"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">Ordem de exibição (menor aparece primeiro)</p>
          </div>

          <div>
            <Select
              label="Status"
              options={[
                { value: 'true', label: 'Ativo' },
                { value: 'false', label: 'Inativo' },
              ]}
              value={formData.active.toString()}
              onChange={(value: string) =>
                setFormData((prev) => ({
                  ...prev,
                  active: value === 'true',
                }))
              }
              disabled={isLoading}
            />
          </div>
        </div>

        {needsOptionsView && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                View de Opções
              </label>
              <Input
                type="text"
                value={formData.options_view}
                onChange={(e) => setFormData((prev) => ({ ...prev, options_view: e.target.value }))}
                placeholder="ex: vw_filter_empresas, vw_filter_usuarios"
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Nome da view ou tabela para popular as opções do filtro. Deve ter colunas 'id' e
                'name'.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_search}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, has_search: e.target.checked }))
                    }
                    className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
                    disabled={isLoading}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Habilitar Busca
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">Permite buscar opções digitando</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Itens por Página
                </label>
                <Input
                  type="number"
                  value={formData.page_size}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, page_size: parseInt(e.target.value) || 20 }))
                  }
                  min={5}
                  max={100}
                  disabled={isLoading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Quantidade de itens carregados por vez (5-100)
                </p>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button type="button" variant="neutral" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Filtro'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
