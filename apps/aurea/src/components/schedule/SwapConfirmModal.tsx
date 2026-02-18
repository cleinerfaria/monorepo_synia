import { Modal, ModalFooter, Button } from '@/components/ui';

interface SwapTargetOption {
  index: number;
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
  selectedTargetIndex: number | null;
  onSelectTarget: (index: number) => void;
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
  selectedTargetIndex,
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
            ? 'Escolha o horario de destino para confirmar a troca do plantao.'
            : 'Confirme a troca do plantao selecionado.'}
        </p>

        <div className="space-y-2">
          <div className="border-border-default bg-surface-canvas rounded-lg border p-3 text-center">
            <div className="text-content-muted text-xs">
              Origem: {formatDateBR(sourceDate)} - {sourceLabel}
            </div>
            <div className="text-content-primary mt-1 text-sm font-semibold">
              {sourceProfessionalName}
            </div>
          </div>

          <div className="text-content-muted text-xs font-semibold uppercase tracking-wide">
            Destino: {formatDateBR(targetDate)}
          </div>

          <div className="space-y-1.5">
            {targetOptions.map((option) => (
              <button
                key={option.index}
                type="button"
                onClick={() => onSelectTarget(option.index)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  selectedTargetIndex === option.index
                    ? 'border-primary-500 bg-primary-50/60 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'border-border-default text-content-secondary hover:border-primary-300 hover:bg-surface-hover'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-xs opacity-80">
                  {option.professionalName || 'Sem profissional'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedTargetIndex === null && hasMultipleTargets && (
          <p className="text-content-muted text-xs">
            Selecione se a troca sera no plantao diurno ou noturno.
          </p>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={selectedTargetIndex === null}>
          Trocar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
