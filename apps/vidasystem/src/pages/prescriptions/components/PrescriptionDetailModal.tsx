import { Modal } from '@/components/ui';
import type { ReactNode } from 'react';

interface PrescriptionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: unknown;
  children: ReactNode;
}

export function PrescriptionDetailModal({
  isOpen,
  onClose,
  selectedItem,
  children,
}: PrescriptionDetailModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedItem ? 'Editar Item' : 'Adicionar Item'}
      size="lg"
    >
      {children}
    </Modal>
  );
}
