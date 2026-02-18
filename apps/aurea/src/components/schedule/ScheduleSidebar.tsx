import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useScheduleStore } from '@/stores/scheduleStore';
import { SLOTS_BY_REGIME } from '@/types/schedule';
import type { ScheduleProfessional, BatchSelectionPreset, SlotType } from '@/types/schedule';
import { Input, Button } from '@/components/ui';
import { ScheduleSlotChip } from './ScheduleSlotChip';

interface ScheduleSidebarProps {
  professionals: ScheduleProfessional[];
  onAutoFillClick: () => void;
}

const BATCH_PRESETS: Array<{ value: BatchSelectionPreset; label: string }> = [
  { value: 'weekdays', label: 'Dias uteis' },
  { value: 'saturdays', label: 'Sabados' },
  { value: 'sundays', label: 'Domingos' },
  { value: 'even_days', label: 'Dias pares' },
  { value: 'odd_days', label: 'Dias impares' },
  { value: 'full_week', label: 'Semana inteira' },
  { value: 'full_month', label: 'Mes todo' },
];

const SLOT_OPTIONS: Array<{ value: SlotType; label: string }> = [
  { value: '24h', label: '24h' },
  { value: '12h_day', label: '12h diurno' },
  { value: '12h_night', label: '12h noturno' },
  { value: '8h_morning', label: '8h manha' },
  { value: '8h_afternoon', label: '8h tarde' },
  { value: '8h_night', label: '8h noite' },
];

function ScheduleSidebarInner({ professionals, onAutoFillClick }: ScheduleSidebarProps) {
  const {
    year,
    month,
    regime,
    assignments,
    selectedDates,
    applyBatchPreset,
    applyBatchAssignment,
    clearSelection,
    duplicateWeek,
  } = useScheduleStore();

  const [search, setSearch] = useState('');
  const [substituteIds, setSubstituteIds] = useState<Set<string>>(new Set());
  const [selectedPreset, setSelectedPreset] = useState<BatchSelectionPreset | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotType | null>(null);

  const availableSlots = useMemo(() => {
    const allowedSlots = new Set<SlotType>(SLOTS_BY_REGIME[regime]);
    return SLOT_OPTIONS.filter((option) => allowedSlots.has(option.value));
  }, [regime]);

  useEffect(() => {
    if (availableSlots.length === 0) {
      setSelectedSlot(null);
      return;
    }

    setSelectedSlot((current) =>
      current && availableSlots.some((option) => option.value === current)
        ? current
        : availableSlots[0].value
    );
  }, [availableSlots]);

  const canBatchApply = selectedDates.size > 0 && selectedPreset !== null && selectedSlot !== null;

  const filteredProfessionals = useMemo(() => {
    if (!search.trim()) return professionals;
    const term = search.toLowerCase();
    return professionals.filter(
      (p) => p.name.toLowerCase().includes(term) || (p.role && p.role.toLowerCase().includes(term))
    );
  }, [professionals, search]);

  // Resumo do mes
  const monthSummary = useMemo(() => {
    const counts = new Map<string, number>();

    for (const [, dayAssignments] of assignments) {
      for (const a of dayAssignments) {
        counts.set(a.professional_id, (counts.get(a.professional_id) || 0) + 1);
      }
    }

    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const filledDays = assignments.size;
    const pendingDays = totalDaysInMonth - filledDays;

    return { counts, pendingDays, totalDays: totalDaysInMonth, filledDays };
  }, [assignments, year, month]);

  const toggleSubstitute = useCallback((id: string) => {
    setSubstituteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBatchApply = useCallback(
    (profId: string) => {
      if (!canBatchApply || !selectedSlot) return;
      applyBatchAssignment(profId, selectedSlot);
    },
    [canBatchApply, selectedSlot, applyBatchAssignment]
  );

  const weekStarts = useMemo(() => {
    const starts: string[] = [];
    const d = new Date(year, month - 1, 1);
    while (d.getDay() !== 0 && d.getMonth() === month - 1) {
      d.setDate(d.getDate() + 1);
    }
    while (d.getMonth() === month - 1) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      starts.push(`${yyyy}-${mm}-${dd}`);
      d.setDate(d.getDate() + 7);
    }
    return starts;
  }, [year, month]);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Secao: Profissionais */}
      <div className="border-border-default border-b p-3">
        <h3 className="text-content-muted mb-2 text-xs font-semibold uppercase tracking-wider">
          Profissionais disponiveis
        </h3>

        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar profissional..."
          className="mb-2"
        />

        <div className="max-h-[250px] space-y-1 overflow-y-auto md:max-h-[350px]">
          {filteredProfessionals.map((prof) => {
            const isSubstitute = substituteIds.has(prof.id);
            const profWithSubstitute = { ...prof, is_substitute: isSubstitute };

            return (
              <div key={prof.id} className="group flex items-center gap-1">
                <div
                  className={`min-w-0 flex-1 ${canBatchApply ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                  onClick={() => {
                    handleBatchApply(prof.id);
                  }}
                >
                  <ScheduleSlotChip professional={profWithSubstitute} />
                </div>

                <button
                  onClick={() => toggleSubstitute(prof.id)}
                  className={`shrink-0 rounded p-0.5 text-[10px] transition-colors ${
                    isSubstitute
                      ? 'text-feedback-warning-fg'
                      : 'text-content-muted opacity-0 group-hover:opacity-100'
                  }`}
                  title={isSubstitute ? 'Remover como folguista' : 'Marcar como folguista'}
                >
                  ★
                </button>
              </div>
            );
          })}

          {filteredProfessionals.length === 0 && (
            <p className="text-content-muted py-2 text-center text-xs">
              Nenhum profissional encontrado
            </p>
          )}
        </div>
      </div>

      {/* Secao: Ferramentas */}
      <div className="border-border-default border-b p-3">
        <h3 className="text-content-muted mb-2 text-xs font-semibold uppercase tracking-wider">
          Ferramentas
        </h3>

        <div className="mb-3">
          <p className="text-content-secondary mb-1 text-[11px]">Selecao de dias:</p>
          <div className="flex flex-wrap gap-1">
            {BATCH_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => {
                  setSelectedPreset(preset.value);
                  applyBatchPreset(preset.value);
                }}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  selectedPreset === preset.value
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-border-default bg-surface-card text-content-secondary hover:border-primary-300 hover:bg-primary-50/30 hover:text-primary-600 dark:hover:border-primary-600 dark:hover:bg-primary-900/20 dark:hover:text-primary-400'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <p className="text-content-secondary mb-1 text-[11px]">Horario do plantao:</p>
          <div className="flex flex-wrap gap-1">
            {availableSlots.map((slot) => (
              <button
                key={slot.value}
                onClick={() => setSelectedSlot(slot.value)}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  selectedSlot === slot.value
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-border-default bg-surface-card text-content-secondary hover:border-primary-300 hover:bg-primary-50/30 hover:text-primary-600 dark:hover:border-primary-600 dark:hover:bg-primary-900/20 dark:hover:text-primary-400'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        {!canBatchApply && (
          <p className="text-content-muted mb-2 text-[10px]">
            Selecione o dia e o horario para preencher com profissional.
          </p>
        )}

        {selectedDates.size > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-primary-600 dark:text-primary-400 text-[11px]">
              {selectedDates.size} dia(s) selecionado(s)
            </span>
            <button
              onClick={clearSelection}
              className="text-content-muted hover:text-content-primary text-[10px] underline"
            >
              Limpar
            </button>
          </div>
        )}

        <div className="space-y-1.5">
          <Button
            variant="neutral"
            size="sm"
            onClick={onAutoFillClick}
            className="w-full justify-center text-xs"
          >
            Auto-preencher
          </Button>

          {weekStarts.length > 0 && (
            <div>
              <p className="text-content-secondary mb-1 text-[11px]">Duplicar semana:</p>
              <div className="flex flex-wrap gap-1">
                {weekStarts.map((ws, idx) => (
                  <button
                    key={ws}
                    onClick={() => duplicateWeek(ws)}
                    className="border-border-default bg-surface-card text-content-secondary hover:border-primary-300 hover:bg-primary-50/30 hover:text-primary-600 dark:hover:border-primary-600 dark:hover:bg-primary-900/20 dark:hover:text-primary-400 rounded border px-2 py-0.5 text-[10px] font-medium transition-colors"
                  >
                    Sem. {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Secao: Resumo do mes */}
      <div className="p-3">
        <h3 className="text-content-muted mb-2 text-xs font-semibold uppercase tracking-wider">
          Resumo do mes
        </h3>

        <div className="mb-2 grid grid-cols-2 gap-2">
          <div className="border-border-default bg-surface-canvas rounded-lg border p-2 text-center">
            <div className="text-content-primary text-lg font-bold">{monthSummary.filledDays}</div>
            <div className="text-content-muted text-[10px]">Dias preenchidos</div>
          </div>
          <div className="border-border-default bg-surface-canvas rounded-lg border p-2 text-center">
            <div
              className={`text-lg font-bold ${monthSummary.pendingDays > 0 ? 'text-feedback-warning-fg' : 'text-feedback-success-fg'}`}
            >
              {monthSummary.pendingDays}
            </div>
            <div className="text-content-muted text-[10px]">Dias pendentes</div>
          </div>
        </div>

        <div className="max-h-[200px] space-y-1 overflow-y-auto">
          {professionals
            .filter((p) => monthSummary.counts.has(p.id))
            .sort(
              (a, b) => (monthSummary.counts.get(b.id) || 0) - (monthSummary.counts.get(a.id) || 0)
            )
            .map((prof) => {
              const count = monthSummary.counts.get(prof.id) || 0;
              return (
                <div
                  key={prof.id}
                  className="flex items-center justify-between rounded px-1 py-0.5 text-[11px]"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: prof.color || 'rgb(var(--color-primary-500))',
                      }}
                    />
                    <span className="text-content-primary truncate">{prof.name}</span>
                  </div>
                  <span className="text-content-secondary shrink-0 font-semibold">{count}x</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export const ScheduleSidebar = memo(ScheduleSidebarInner);
