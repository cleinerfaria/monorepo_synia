import { Modal, ModalFooter, Button } from '@/components/ui';

interface SwapTargetOption {
  id: string;
  label: string;
  professionalName: string;
}

interface SwapConfirmModalProps {
  isOpen: boolean;
  sourceDate: string;
  sourceLabel: string;
  sourceProfessionalName: string;
  targetDate: string;
  targetOptions: SwapTargetOption[];
  selectedTargetId: string | null;
  onSelectTarget: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function SwapConfirmModal({
  isOpen,
  sourceDate,
  sourceLabel,
  sourceProfessionalName,
  targetDate,
  targetOptions,
  selectedTargetId,
  onSelectTarget,
  onConfirm,
  onCancel,
}: SwapConfirmModalProps) {
  const hasMultipleTargets = targetOptions.length > 1;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Troca de Plantão" size="sm">
      <div className="space-y-4">
        <p className="text-content-secondary text-sm">
          {hasMultipleTargets
            ? 'Escolha o horário de destino.'
            : 'Confirme a troca do plantão selecionado.'}
        </p>

        <div className="space-y-2">
          <div className="text-content-muted text-sm font-semibold uppercase tracking-wide">
            Origem: {formatDateBR(sourceDate)}
          </div>
          <div className="border-border-default bg-surface-canvas rounded-lg border px-3 py-2 text-left text-sm">
            <div className="text-content-primary text-base font-semibold">
              {sourceProfessionalName}
            </div>
            <div className="text-content-secondary font-medium">{sourceLabel}</div>
          </div>

          <div className="text-content-muted pt-4 text-sm font-semibold uppercase tracking-wide">
            Destino: {formatDateBR(targetDate)}
          </div>

          <div className="space-y-1.5">
            {targetOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectTarget(option.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  selectedTargetId === option.id
                    ? 'border-primary-500 bg-primary-50/60 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'border-border-default text-content-secondary hover:border-primary-300 hover:bg-surface-hover'
                }`}
              >
                <div className="text-content-primary text-base font-semibold">
                  {option.professionalName || 'Sem profissional'}
                </div>
                <div className="font-medium">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedTargetId === null && hasMultipleTargets && (
          <p className="text-content-muted text-xs">Selecione por qual plantão será a ação.</p>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={selectedTargetId === null}>
          Trocar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
