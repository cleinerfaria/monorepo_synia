import { useEffect, useState } from 'react';
import { Modal, Input, Button, Switch } from '@synia/ui';
import { EvaluationAspect, useCreateAspect, useUpdateAspect } from '@/hooks/useWhatsappAspects';
import toast from 'react-hot-toast';

interface AspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  evaluationId: string;
  aspect: EvaluationAspect | null;
}

export default function AspectModal({
  isOpen,
  onClose,
  companyId,
  evaluationId,
  aspect,
}: AspectModalProps) {
  const isEditing = !!aspect;
  const [formData, setFormData] = useState({
    name: '',
    instructions: '',
    weight: '',
    sort_order: 0,
    active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateAspect();
  const updateMutation = useUpdateAspect();
  const isLoading = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (aspect) {
      setFormData({
        name: aspect.name,
        instructions: aspect.instructions || '',
        weight: aspect.weight !== null ? String(aspect.weight) : '',
        sort_order: aspect.sort_order,
        active: aspect.active,
      });
    } else {
      setFormData({ name: '', instructions: '', weight: '', sort_order: 0, active: true });
    }
    setErrors({});
  }, [aspect, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Nome e obrigatorio';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) return;

    try {
      if (isEditing && aspect) {
        await updateMutation.mutateAsync({
          id: aspect.id,
          name: formData.name,
          instructions: formData.instructions || undefined,
          weight: formData.weight ? Number(formData.weight) : null,
          sort_order: formData.sort_order,
          active: formData.active,
        });
        toast.success('Aspecto atualizado');
      } else {
        await createMutation.mutateAsync({
          company_id: companyId,
          evaluation_id: evaluationId,
          name: formData.name,
          instructions: formData.instructions || undefined,
          weight: formData.weight ? Number(formData.weight) : null,
          sort_order: formData.sort_order,
          active: formData.active,
        });
        toast.success('Aspecto criado');
      }
      onClose();
    } catch (error: any) {
      const message = error.message || 'Erro ao salvar aspecto';
      setErrors({ submit: message });
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar aspecto' : 'Novo aspecto'}
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
            Nome *
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Empatia"
            error={errors.name}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Instrucoes
          </label>
          <Input
            type="text"
            value={formData.instructions}
            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            placeholder="Orientacoes para a IA"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Peso
            </label>
            <Input
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              placeholder="0.5"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ordem
            </label>
            <Input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
              placeholder="0"
            />
          </div>
        </div>

        <Switch
          checked={formData.active}
          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
          label="Aspecto ativo"
        />

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
