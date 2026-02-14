import { useEffect, useState } from 'react';
import { Modal, Input, Button, Textarea } from '@/components/ui';
import {
  CreateWhatsappInstanceInput,
  UpdateWhatsappInstanceInput,
  WhatsappInstance,
  useCreateWhatsappInstance,
  useUpdateWhatsappInstance,
} from '@/hooks/useWhatsappInstances';
import toast from 'react-hot-toast';

interface InstanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  instance: WhatsappInstance | null;
}

export default function InstanceModal({
  isOpen,
  onClose,
  companyId,
  instance,
}: InstanceModalProps) {
  const isEditing = !!instance;
  const [formData, setFormData] = useState({
    name: '',
    sector: '',
    observation: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateWhatsappInstance();
  const updateMutation = useUpdateWhatsappInstance();

  const isLoading = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (instance) {
      setFormData({
        name: instance.name,
        sector: instance.sector || '',
        observation: instance.observation || '',
      });
    } else {
      setFormData({
        name: '',
        sector: '',
        observation: '',
      });
    }
    setErrors({});
  }, [instance, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da instância é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) return;

    try {
      if (isEditing && instance) {
        const payload: UpdateWhatsappInstanceInput = {
          id: instance.id,
          name: formData.name,
          sector: formData.sector || null,
          observation: formData.observation || null,
        };
        await updateMutation.mutateAsync(payload);
        toast.success('Instância atualizada com sucesso!');
      } else {
        const payload: CreateWhatsappInstanceInput = {
          company_id: companyId,
          name: formData.name.trim(),
          sector: formData.sector || undefined,
          observation: formData.observation || undefined,
        };
        await createMutation.mutateAsync(payload);
        toast.success('Instância criada com sucesso!');
      }

      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar instância:', error);
      const message = error.message || 'Erro ao salvar instância';
      setErrors({ submit: message });
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Instância' : 'Nova Instância'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.submit && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {errors.submit}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Nome da instância *
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: atendimento-comercial"
            error={errors.name}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Setor (opcional)
          </label>
          <Input
            type="text"
            value={formData.sector}
            onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
            placeholder="Ex: Vendas, Suporte, Financeiro"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Observação (opcional)
          </label>
          <Textarea
            value={formData.observation}
            onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
            placeholder="Observações operacionais"
            rows={4}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Instância'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
