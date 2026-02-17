import { useCallback, useMemo, useState } from 'react';
import { Modal, ModalFooter, Button, Input } from '@/components/ui';
import type { ScheduleProfessional, ScheduleAssignment } from '@/types/schedule';

interface ProfessionalPickerProps {
  isOpen: boolean;
  onClose: () => void;
  professionals: ScheduleProfessional[];
  date: string;
  /** Assignment existente sendo editado (null = novo) */
  existingAssignment: ScheduleAssignment | null;
  /** Horario padrao para novos assignments */
  defaultStartAt: string;
  defaultEndAt: string;
  onSelect: (professionalId: string, startAt: string, endAt: string) => void;
  onRemove: (() => void) | null;
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  return `${weekdays[dow]}, ${d}/${m}/${y}`;
}

function isoToTimeInput(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '07:00';
  }
}

function timeInputToIso(date: string, time: string, dayOffset = 0): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function ProfessionalPicker({
  isOpen,
  onClose,
  professionals,
  date,
  existingAssignment,
  defaultStartAt,
  defaultEndAt,
  onSelect,
  onRemove,
}: ProfessionalPickerProps) {
  const [search, setSearch] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [endNextDay, setEndNextDay] = useState(false);

  // Inicializar horarios quando o modal abre
  useMemo(() => {
    if (isOpen) {
      if (existingAssignment) {
        setStartTime(isoToTimeInput(existingAssignment.start_at));
        setEndTime(isoToTimeInput(existingAssignment.end_at));
        // Verificar se end_at e do dia seguinte
        const startDate = new Date(existingAssignment.start_at).toISOString().slice(0, 10);
        const endDate = new Date(existingAssignment.end_at).toISOString().slice(0, 10);
        setEndNextDay(endDate > startDate);
      } else {
        setStartTime(isoToTimeInput(defaultStartAt));
        setEndTime(isoToTimeInput(defaultEndAt));
        const startDate = new Date(defaultStartAt).toISOString().slice(0, 10);
        const endDate = new Date(defaultEndAt).toISOString().slice(0, 10);
        setEndNextDay(endDate > startDate);
      }
    }
  }, [isOpen, existingAssignment, defaultStartAt, defaultEndAt]);

  const filteredProfessionals = useMemo(() => {
    if (!search.trim()) return professionals;
    const term = search.toLowerCase();
    return professionals.filter(
      (p) => p.name.toLowerCase().includes(term) || (p.role && p.role.toLowerCase().includes(term))
    );
  }, [professionals, search]);

  const handleSelect = useCallback(
    (profId: string) => {
      const startIso = timeInputToIso(date, startTime, 0);
      const endIso = timeInputToIso(date, endTime, endNextDay ? 1 : 0);
      onSelect(profId, startIso, endIso);
      setSearch('');
      onClose();
    },
    [date, startTime, endTime, endNextDay, onSelect, onClose]
  );

  const handleRemove = useCallback(() => {
    if (onRemove) {
      onRemove();
      setSearch('');
      onClose();
    }
  }, [onRemove, onClose]);

  const handleClose = useCallback(() => {
    setSearch('');
    onClose();
  }, [onClose]);

  const currentProfId = existingAssignment?.professional_id;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Atribuir profissional" size="sm">
      <div className="space-y-3">
        <p className="text-content-secondary text-sm">{formatDateBR(date)}</p>

        {/* Horarios */}
        <div className="border-border-default bg-surface-canvas rounded-lg border p-3">
          <p className="text-content-muted mb-2 text-xs font-semibold uppercase">Horario</p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-content-secondary mb-0.5 block text-[10px]">Inicio</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-content-secondary mb-0.5 block text-[10px]">
                Fim {endNextDay && <span className="text-feedback-info-fg">(+1 dia)</span>}
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>
          </div>
          <label className="mt-2 flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={endNextDay}
              onChange={(e) => setEndNextDay(e.target.checked)}
              className="rounded"
            />
            <span className="text-content-secondary">Termina no dia seguinte</span>
          </label>
        </div>

        {/* Busca de profissional */}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar profissional..."
          autoFocus
        />

        <div className="max-h-[300px] space-y-0.5 overflow-y-auto">
          {filteredProfessionals.map((prof) => {
            const isActive = prof.id === currentProfId;

            return (
              <button
                key={prof.id}
                onClick={() => handleSelect(prof.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isActive ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-surface-hover'
                }`}
              >
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
                  <div className="text-content-primary truncate font-medium">{prof.name}</div>
                  {prof.role && (
                    <div className="text-content-muted truncate text-xs">{prof.role}</div>
                  )}
                </div>

                {isActive && (
                  <span className="text-primary-600 dark:text-primary-400 shrink-0 text-xs">
                    ✓ Atual
                  </span>
                )}
              </button>
            );
          })}

          {filteredProfessionals.length === 0 && (
            <p className="text-content-muted py-4 text-center text-sm">
              Nenhum profissional encontrado
            </p>
          )}
        </div>

        {onRemove && currentProfId && (
          <button
            onClick={handleRemove}
            className="border-feedback-danger-border/50 text-feedback-danger-fg hover:bg-feedback-danger-bg/30 w-full rounded-lg border px-3 py-2 text-center text-sm transition-colors"
          >
            Remover atribuicao
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
