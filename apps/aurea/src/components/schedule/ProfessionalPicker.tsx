import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ModalFooter, Button, SearchableSelect } from '@/components/ui';
import type { ScheduleProfessional, ScheduleAssignment, ScheduleRegime } from '@/types/schedule';
import { getRegimeMaxHours, getSlotTimes } from '@/types/schedule';
import type { SlotType } from '@/types/schedule';

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
  /** Assignments existentes do dia (para validacao de sobreposicao) */
  dayAssignments: ScheduleAssignment[];
  /** Indice do assignment sendo editado (para excluir da validacao) */
  editIndex: number | null;
  /** Horario inicial configurado para a escala (HH:MM) */
  scheduleStartTime: string;
  /** Regime da escala */
  regime: ScheduleRegime;
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

/** Opcoes de turno rapido */
interface ShiftPreset {
  label: string;
  slot: SlotType;
}

const SHIFT_PRESETS: ShiftPreset[] = [
  { label: 'Plantao 24h', slot: '24h' },
  { label: '12h Diurno', slot: '12h_day' },
  { label: '12h Noturno', slot: '12h_night' },
];

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
  dayAssignments,
  editIndex,
  scheduleStartTime,
  regime,
}: ProfessionalPickerProps) {
  const [selectedProfId, setSelectedProfId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [endNextDay, setEndNextDay] = useState(false);
  const [activePreset, setActivePreset] = useState<SlotType | null>(null);

  // Inicializar quando o modal abre
  useEffect(() => {
    if (isOpen) {
      if (existingAssignment) {
        setSelectedProfId(existingAssignment.professional_id);
        setStartTime(isoToTimeInput(existingAssignment.start_at));
        setEndTime(isoToTimeInput(existingAssignment.end_at));
        const startDate = new Date(existingAssignment.start_at).toISOString().slice(0, 10);
        const endDate = new Date(existingAssignment.end_at).toISOString().slice(0, 10);
        setEndNextDay(endDate > startDate);
      } else {
        setSelectedProfId('');
        setStartTime(isoToTimeInput(defaultStartAt));
        setEndTime(isoToTimeInput(defaultEndAt));
        const startDate = new Date(defaultStartAt).toISOString().slice(0, 10);
        const endDate = new Date(defaultEndAt).toISOString().slice(0, 10);
        setEndNextDay(endDate > startDate);
      }
      setActivePreset(null);
    }
  }, [isOpen, existingAssignment, defaultStartAt, defaultEndAt]);

  // Opcoes do dropdown de profissionais
  const professionalOptions = useMemo(
    () =>
      professionals.map((p) => ({
        value: p.id,
        label: p.name,
        description: p.role || undefined,
      })),
    [professionals]
  );

  // Aplicar preset de turno rapido
  const handlePresetClick = useCallback(
    (preset: ShiftPreset) => {
      if (!date) return;
      const times = getSlotTimes(preset.slot, date, scheduleStartTime || '07:00');
      setStartTime(isoToTimeInput(times.start));
      setEndTime(isoToTimeInput(times.end));
      const startDate = new Date(times.start).toISOString().slice(0, 10);
      const endDate = new Date(times.end).toISOString().slice(0, 10);
      setEndNextDay(endDate > startDate);
      setActivePreset(preset.slot);
    },
    [date, scheduleStartTime]
  );

  // Validacoes em tempo real
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!startTime || !endTime || !date) return errors;

    const startIso = timeInputToIso(date, startTime, 0);
    const endIso = timeInputToIso(date, endTime, endNextDay ? 1 : 0);
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();

    if (endMs <= startMs) {
      errors.push('Horario final deve ser apos o horario inicial');
      return errors;
    }

    if (scheduleStartTime) {
      const [h, m] = scheduleStartTime.split(':').map(Number);
      const minStart = new Date(date + 'T00:00:00');
      minStart.setHours(h, m, 0, 0);
      if (startMs < minStart.getTime()) {
        errors.push(`Horario inicial nao pode ser antes de ${scheduleStartTime}`);
      }
    }

    if (dayAssignments) {
      for (let i = 0; i < dayAssignments.length; i++) {
        if (i === editIndex) continue;
        const existingStart = new Date(dayAssignments[i].start_at).getTime();
        const existingEnd = new Date(dayAssignments[i].end_at).getTime();
        if (startMs < existingEnd && endMs > existingStart) {
          errors.push('Horario sobrepoe outro profissional');
          break;
        }
      }
    }

    if (dayAssignments && regime) {
      const maxMs = getRegimeMaxHours(regime) * 60 * 60 * 1000;
      const existingMs = dayAssignments.reduce((sum, a, i) => {
        if (i === editIndex) return sum;
        return sum + (new Date(a.end_at).getTime() - new Date(a.start_at).getTime());
      }, 0);
      const newMs = endMs - startMs;
      if (existingMs + newMs > maxMs) {
        errors.push(`Total de horas excede o limite de ${getRegimeMaxHours(regime)}h do regime`);
      }
    }

    return errors;
  }, [startTime, endTime, endNextDay, date, dayAssignments, editIndex, scheduleStartTime, regime]);

  const hasErrors = validationErrors.length > 0;
  const canSave = selectedProfId && startTime && endTime && !hasErrors;

  const handleSave = useCallback(() => {
    if (!canSave) return;
    const startIso = timeInputToIso(date, startTime, 0);
    const endIso = timeInputToIso(date, endTime, endNextDay ? 1 : 0);
    onSelect(selectedProfId, startIso, endIso);
    onClose();
  }, [canSave, date, startTime, endTime, endNextDay, selectedProfId, onSelect, onClose]);

  const handleRemove = useCallback(() => {
    if (onRemove) {
      onRemove();
      onClose();
    }
  }, [onRemove, onClose]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const modalTitle = existingAssignment ? 'Editar plantão' : 'Novo plantão';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="sm">
      <div className="space-y-4">
        {/* Data */}
        <p className="text-content-secondary text-sm">{formatDateBR(date)}</p>

        {/* Profissional — dropdown com busca */}
        <SearchableSelect
          label="Profissional"
          placeholder="Selecione o profissional..."
          searchPlaceholder="Buscar por nome ou função..."
          options={professionalOptions}
          value={selectedProfId}
          onChange={(eventOrValue) => {
            const nextValue =
              typeof eventOrValue === 'string' ? eventOrValue : eventOrValue.target?.value || '';
            setSelectedProfId(nextValue);
          }}
          emptyMessage="Nenhum profissional encontrado"
          required
        />

        {/* Selecao rapida de turno */}
        <div>
          <p className="text-content-muted mb-1.5 text-xs font-semibold uppercase tracking-wide">
            Turno rápido
          </p>
          <div className="flex gap-1.5">
            {SHIFT_PRESETS.map((preset) => (
              <button
                key={preset.slot}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activePreset === preset.slot
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'border-border-default text-content-secondary hover:border-primary-300 hover:bg-surface-hover'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Horarios manuais */}
        <div className="border-border-default bg-surface-canvas rounded-lg border p-3">
          <p className="text-content-muted mb-2 text-xs font-semibold uppercase tracking-wide">
            Horario
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-content-secondary mb-0.5 block text-[10px]">Inicio</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setActivePreset(null);
                }}
                className="input-field w-full text-sm"
              />
            </div>
            <span className="text-content-muted mt-4 text-sm">ate</span>
            <div className="flex-1">
              <label className="text-content-secondary mb-0.5 block text-[10px]">
                Fim {endNextDay && <span className="text-feedback-info-fg">(+1 dia)</span>}
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setActivePreset(null);
                }}
                className="input-field w-full text-sm"
              />
            </div>
          </div>
          <label className="mt-2 flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={endNextDay}
              onChange={(e) => {
                setEndNextDay(e.target.checked);
                setActivePreset(null);
              }}
              className="rounded"
            />
            <span className="text-content-secondary">Termina no dia seguinte</span>
          </label>
        </div>

        {/* Erros de validacao */}
        {hasErrors && (
          <div className="bg-feedback-danger-bg/30 border-feedback-danger-border/50 rounded-lg border p-2.5">
            {validationErrors.map((error, i) => (
              <p key={i} className="text-feedback-danger-fg text-xs">
                {error}
              </p>
            ))}
          </div>
        )}

        {/* Botao de remover */}
        {onRemove && existingAssignment && (
          <button
            type="button"
            onClick={handleRemove}
            className="border-feedback-danger-border/50 text-feedback-danger-fg hover:bg-feedback-danger-bg/30 w-full rounded-lg border px-3 py-2 text-center text-sm transition-colors"
          >
            Remover atribuicao
          </button>
        )}
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose} showIcon={false}>
          Cancelar
        </Button>
        <Button variant="solid" onClick={handleSave} disabled={!canSave} showIcon={false}>
          {existingAssignment ? 'Salvar' : 'Adicionar'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
