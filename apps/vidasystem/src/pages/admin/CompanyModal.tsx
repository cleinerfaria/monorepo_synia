import { useState, useEffect } from 'react';
import { Modal, Input, Button, Switch, ColorPicker } from '@/components/ui';
import {
  Company,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from '@/hooks/useCompanies';
import { DEFAULT_PRIMARY_COLOR } from '@/design-system/theme/constants';
import { formatCnpjInput, validateCnpj } from '@/lib/cnpj';
import { AlertTriangle } from 'lucide-react';
interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company | null;
}

export default function CompanyModal({ isOpen, onClose, company }: CompanyModalProps) {
  const isEditing = !!company;

  const [formData, setFormData] = useState({
    name: '',
    trade_name: '',
    document: '',
    primary_color: DEFAULT_PRIMARY_COLOR,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const deleteMutation = useDeleteCompany();

  const isLoading =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        trade_name: company.trade_name || '',
        document: formatCnpjInput(company.document || ''),
        primary_color: company.primary_color || DEFAULT_PRIMARY_COLOR,
        is_active: company.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        trade_name: '',
        document: '',
        primary_color: DEFAULT_PRIMARY_COLOR,
        is_active: true,
      });
    }
    setErrors({});
    setShowDeleteConfirm(false);
  }, [company, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (formData.document.trim() && !validateCnpj(formData.document)) {
      newErrors.document = 'CNPJ inválido';
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
          id: company.id,
          name: formData.name,
          trade_name: formData.trade_name || undefined,
          document: formData.document || undefined,
          primary_color: formData.primary_color,
          is_active: formData.is_active,
        });
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          trade_name: formData.trade_name || undefined,
          document: formData.document || undefined,
          primary_color: formData.primary_color,
          is_active: formData.is_active,
        });
      }
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar empresa:', error);
      setErrors({ submit: error.message || 'Erro ao salvar empresa' });
    }
  };

  const handleDelete = async () => {
    if (!company) return;

    try {
      await deleteMutation.mutateAsync(company.id);
      onClose();
    } catch (error: any) {
      console.error('Erro ao excluir empresa:', error);
      setErrors({ submit: error.message || 'Erro ao excluir empresa' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Empresa' : 'Nova Empresa'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {errors.submit}
          </div>
        )}

        <div>
          <Input
            label="Razão Social"
            type="text"
            autoUppercase={true}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome da empresa"
            required
            error={errors.name}
          />
        </div>

        <div>
          <Input
            label="Nome Fantasia"
            type="text"
            autoUppercase={true}
            value={formData.trade_name}
            onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
            placeholder="Nome fantasia"
          />
        </div>

        <div>
          <Input
            label="CNPJ"
            type="text"
            value={formData.document}
            onChange={(e) =>
              setFormData({ ...formData, document: formatCnpjInput(e.target.value) })
            }
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
            error={errors.document}
          />
        </div>

        <div>
          <ColorPicker
            label="Cor Principal"
            value={formData.primary_color}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData({ ...formData, primary_color: e.target.value })
            }
            placeholder={DEFAULT_PRIMARY_COLOR}
            hint="Cor principal utilizada para identificar a empresa no sistema"
          />
        </div>

        <div className="flex items-center">
          <Switch
            label="Status da Empresa"
            showStatus
            checked={!!formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          />
        </div>

        {/* Delete Confirmation */}
        {isEditing && showDeleteConfirm && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Confirmar exclusão
                </h4>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  Esta ação irá excluir a empresa e TODOS os dados relacionados (usuários, produtos,
                  estoque, etc). Esta ação não pode ser desfeita.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isLoading}
                  >
                    Sim, excluir
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

        {/* Actions */}
        <div className="flex justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
          <div>
            {isEditing && !showDeleteConfirm && (
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                showIcon={false}
              >
                Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
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
              {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Empresa'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
