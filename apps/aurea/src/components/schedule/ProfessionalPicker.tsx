import { useCallback, useMemo, useState } from 'react';
import { Modal, ModalFooter, Button, Input } from '@/components/ui';
import type { ScheduleProfessional, SlotType } from '@/types/schedule';

interface ProfessionalPickerProps {
  isOpen: boolean;
  onClose: () => void;
  professionals: ScheduleProfessional[];
  date: string;
  slot: SlotType;
  currentProfessionalId: string | undefined;
  onSelect: (professionalId: string) => void;
  onRemove: () => void;
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  return `${weekdays[dow]}, ${d}/${m}/${y}`;
}

export function ProfessionalPicker({
  isOpen,
  onClose,
  professionals,
  date,
  slot,
  currentProfessionalId,
  onSelect,
  onRemove,
}: ProfessionalPickerProps) {
  const [search, setSearch] = useState('');

  const filteredProfessionals = useMemo(() => {
    if (!search.trim()) return professionals;
    const term = search.toLowerCase();
    return professionals.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.role && p.role.toLowerCase().includes(term))
    );
  }, [professionals, search]);

  const handleSelect = useCallback(
    (profId: string) => {
      onSelect(profId);
      setSearch('');
      onClose();
    },
    [onSelect, onClose]
  );

  const handleRemove = useCallback(() => {
    onRemove();
    setSearch('');
    onClose();
  }, [onRemove, onClose]);

  const handleClose = useCallback(() => {
    setSearch('');
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Atribuir profissional" size="sm">
      <div className="space-y-3">
        <p className="text-sm text-content-secondary">
          {formatDateBR(date)}
        </p>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar profissional..."
          autoFocus
        />

        <div className="max-h-[300px] space-y-0.5 overflow-y-auto">
          {filteredProfessionals.map((prof) => {
            const isActive = prof.id === currentProfessionalId;

            return (
              <button
                key={prof.id}
                onClick={() => handleSelect(prof.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30'
                    : 'hover:bg-surface-hover'
                }`}
              >
                {/* Avatar cor */}
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{
                    backgroundColor: prof.color || 'rgb(var(--color-primary-500))',
                  }}
                >
                  {prof.name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-content-primary">
                    {prof.name}
                  </div>
                  {prof.role && (
                    <div className="truncate text-xs text-content-muted">{prof.role}</div>
                  )}
                </div>

                {isActive && (
                  <span className="shrink-0 text-xs text-primary-600 dark:text-primary-400">
                    ✓ Atual
                  </span>
                )}
              </button>
            );
          })}

          {filteredProfessionals.length === 0 && (
            <p className="py-4 text-center text-sm text-content-muted">
              Nenhum profissional encontrado
            </p>
          )}
        </div>

        {currentProfessionalId && (
          <button
            onClick={handleRemove}
            className="w-full rounded-lg border border-feedback-danger-border/50 px-3 py-2 text-center text-sm text-feedback-danger-fg transition-colors hover:bg-feedback-danger-bg/30"
          >
            Remover atribuição
          </button>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>
          Fechar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
