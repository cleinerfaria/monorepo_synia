import { useEffect, useState } from 'react';
import { Modal, Input, Button, Switch } from '@synia/ui';
import {
  EvaluationDefinition,
  useCreateEvaluation,
  useUpdateEvaluation,
  useEvaluationInstances,
} from '@/hooks/useWhatsappAspects';
import { useWhatsappInstances } from '@/hooks/useWhatsappInstances';
import toast from 'react-hot-toast';

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  evaluation: EvaluationDefinition | null;
}

export default function EvaluationModal({
  isOpen,
  onClose,
  companyId,
  evaluation,
}: EvaluationModalProps) {
  const isEditing = !!evaluation;
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
    instanceIds: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateEvaluation();
  const updateMutation = useUpdateEvaluation();
  const { data: instances = [] } = useWhatsappInstances(companyId);
  const { data: evaluationInstanceIds = [] } = useEvaluationInstances(evaluation?.id);

  const isLoading = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (evaluation) {
      setFormData({
        name: evaluation.name,
        description: evaluation.description || '',
        active: evaluation.active,
        instanceIds: [],
      });
    } else {
      setFormData({ name: '', description: '', active: true, instanceIds: [] });
    }
    setErrors({});
  }, [evaluation, isOpen]);

  // Efeito separado para carregar instanceIds
  useEffect(() => {
    if (evaluation && evaluationInstanceIds.length >= 0) {
      setFormData((prev) => ({
        ...prev,
        instanceIds: evaluationInstanceIds,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluation?.id, JSON.stringify(evaluationInstanceIds)]);

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
      if (isEditing && evaluation) {
        await updateMutation.mutateAsync({
          id: evaluation.id,
          name: formData.name,
          description: formData.description || undefined,
          active: formData.active,
          instance_ids: formData.instanceIds,
        });
        toast.success('Avaliacao atualizada');
      } else {
        await createMutation.mutateAsync({
          company_id: companyId,
          name: formData.name,
          description: formData.description || undefined,
          active: formData.active,
          instance_ids: formData.instanceIds,
        });
        toast.success('Avaliacao criada');
      }
      onClose();
    } catch (error: any) {
      const message = error.message || 'Erro ao salvar avaliacao';
      setErrors({ submit: message });
      toast.error(message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar avaliacao' : 'Nova avaliacao'}
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
            placeholder="Ex: Atendimento Comercial"
            error={errors.name}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Descricao
          </label>
          <Input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descricao resumida"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Instâncias Associadas
          </label>
          <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-600">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.instanceIds.length === 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData({ ...formData, instanceIds: [] });
                  }
                }}
                className="mr-2 rounded"
              />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Disponível para todas as instâncias (global)
              </span>
            </label>
            {instances.map((instance) => (
              <label key={instance.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.instanceIds.includes(instance.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        instanceIds: [...formData.instanceIds, instance.id],
                      });
                    } else {
                      setFormData({
                        ...formData,
                        instanceIds: formData.instanceIds.filter((id) => id !== instance.id),
                      });
                    }
                  }}
                  className="mr-2 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {instance.name} {instance.phone_number && `(${instance.phone_number})`}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Se nenhuma instância for selecionada, a avaliação estará disponível para todas as
            instâncias
          </p>
        </div>

        <Switch
          checked={formData.active}
          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
          label="Avaliacao ativa"
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
