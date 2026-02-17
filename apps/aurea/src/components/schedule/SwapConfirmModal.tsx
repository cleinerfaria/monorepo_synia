import { Modal, ModalFooter, Button } from '@/components/ui';

interface SwapConfirmModalProps {
  isOpen: boolean;
  dateA: string;
  dateB: string;
  profNamesA: string;
  profNamesB: string;
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
  dateA,
  dateB,
  profNamesA,
  profNamesB,
  onConfirm,
  onCancel,
}: SwapConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Trocar profissionais?" size="sm">
      <div className="space-y-4">
        <p className="text-content-secondary text-sm">
          Deseja trocar os profissionais entre os dias selecionados?
        </p>

        <div className="flex items-center justify-center gap-3">
          {/* Dia A */}
          <div className="border-border-default bg-surface-canvas rounded-lg border p-3 text-center">
            <div className="text-content-muted text-xs">{formatDateBR(dateA)}</div>
            <div className="text-content-primary mt-1 text-sm font-semibold">
              {profNamesA || 'Vazio'}
            </div>
          </div>

          {/* Seta */}
          <div className="text-content-muted flex flex-col items-center">
            <span className="text-lg">⇄</span>
          </div>

          {/* Dia B */}
          <div className="border-border-default bg-surface-canvas rounded-lg border p-3 text-center">
            <div className="text-content-muted text-xs">{formatDateBR(dateB)}</div>
            <div className="text-content-primary mt-1 text-sm font-semibold">
              {profNamesB || 'Vazio'}
            </div>
          </div>
        </div>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Trocar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
