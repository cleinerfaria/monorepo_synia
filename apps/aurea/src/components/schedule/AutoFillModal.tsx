import { useState, useCallback, useMemo } from 'react';
import { Modal, ModalFooter, Button, Input } from '@/components/ui';
import { useScheduleStore } from '@/stores/scheduleStore';
import { assignmentKey, SLOTS_BY_REGIME } from '@/types/schedule';
import type { ScheduleProfessional, AutoFillConfig, AssignmentMap } from '@/types/schedule';

interface AutoFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  professionals: ScheduleProfessional[];
}

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

function getDaysInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push(`${yyyy}-${mm}-${dd}`);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay();
}

export function AutoFillModal({ isOpen, onClose, professionals }: AutoFillModalProps) {
  const { year, month, regime, generateAutoFillPreview, applyAutoFill } = useScheduleStore();

  // Config state
  const [rotation, setRotation] = useState<string[]>([]);
  const [substituteId, setSubstituteId] = useState<string | null>(null);
  const [daysPerProfessional, setDaysPerProfessional] = useState(1);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<AssignmentMap | null>(null);
  const [search, setSearch] = useState('');

  const slots = useMemo(() => SLOTS_BY_REGIME[regime], [regime]);

  // Filtrar profissionais
  const filteredProfessionals = useMemo(() => {
    if (!search.trim()) return professionals;
    const term = search.toLowerCase();
    return professionals.filter(
      (p) => p.name.toLowerCase().includes(term) || (p.role && p.role.toLowerCase().includes(term))
    );
  }, [professionals, search]);

  const toggleRotation = useCallback((profId: string) => {
    setRotation((prev) => {
      if (prev.includes(profId)) return prev.filter((id) => id !== profId);
      return [...prev, profId];
    });
    setShowPreview(false);
    setPreview(null);
  }, []);

  const toggleWeekday = useCallback((day: number) => {
    setSelectedWeekdays((prev) => {
      if (prev.includes(day)) return prev.filter((d) => d !== day);
      return [...prev, day].sort();
    });
    setShowPreview(false);
    setPreview(null);
  }, []);

  const moveInRotation = useCallback((index: number, direction: 'up' | 'down') => {
    setRotation((prev) => {
      const newArr = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= newArr.length) return prev;
      [newArr[index], newArr[target]] = [newArr[target], newArr[index]];
      return newArr;
    });
    setShowPreview(false);
    setPreview(null);
  }, []);

  const handleGeneratePreview = useCallback(() => {
    if (rotation.length === 0) return;

    const config: AutoFillConfig = {
      rotation,
      substituteId,
      daysPerProfessional,
      weekdays: selectedWeekdays,
    };

    const result = generateAutoFillPreview(config);
    setPreview(result);
    setShowPreview(true);
  }, [rotation, substituteId, daysPerProfessional, selectedWeekdays, generateAutoFillPreview]);

  const handleApply = useCallback(() => {
    if (preview) {
      applyAutoFill(preview);
      onClose();
    }
  }, [preview, applyAutoFill, onClose]);

  // Preview renderizado
  const previewDays = useMemo(() => {
    if (!preview) return [];
    const days = getDaysInMonth(year, month);
    return days.map((day) => {
      const profIds = slots.map((slot) => preview.get(assignmentKey(day, slot))?.[0]);
      return { date: day, profIds };
    });
  }, [preview, year, month, slots]);

  const profMap = useMemo(() => {
    const map = new Map<string, ScheduleProfessional>();
    for (const p of professionals) map.set(p.id, p);
    return map;
  }, [professionals]);

  const handleClose = useCallback(() => {
    setShowPreview(false);
    setPreview(null);
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Auto-preencher escala" size="lg">
      <div className="space-y-4">
        {/* Rotação de profissionais */}
        <div>
          <label className="label mb-1 block text-sm">
            Selecione a ordem de rotação dos profissionais:
          </label>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar profissional..."
            className="mb-2"
          />

          <div className="border-border-default max-h-[200px] space-y-1 overflow-y-auto rounded-lg border p-2">
            {filteredProfessionals.map((prof) => {
              const inRotation = rotation.includes(prof.id);
              const rotIndex = rotation.indexOf(prof.id);
              const isSubst = substituteId === prof.id;

              return (
                <div
                  key={prof.id}
                  className={`flex items-center gap-2 rounded p-1.5 transition-colors ${
                    inRotation
                      ? 'bg-primary-50/50 dark:bg-primary-900/20'
                      : isSubst
                        ? 'bg-feedback-warning-bg/50'
                        : 'hover:bg-surface-hover'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => {
                      if (isSubst) {
                        setSubstituteId(null);
                      }
                      toggleRotation(prof.id);
                    }}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                      inRotation
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-border-default'
                    }`}
                  >
                    {inRotation && rotIndex + 1}
                  </button>

                  {/* Cor + nome */}
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: prof.color || 'rgb(var(--color-primary-500))' }}
                  />
                  <span className="text-content-primary min-w-0 flex-1 truncate text-sm">
                    {prof.name}
                  </span>

                  {inRotation && (
                    <span className="text-content-muted text-[10px]">#{rotIndex + 1}</span>
                  )}

                  {/* Ordenar na rotação */}
                  {inRotation && (
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => moveInRotation(rotIndex, 'up')}
                        disabled={rotIndex === 0}
                        className="text-content-muted hover:text-content-primary rounded px-1 text-[10px] disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveInRotation(rotIndex, 'down')}
                        disabled={rotIndex === rotation.length - 1}
                        className="text-content-muted hover:text-content-primary rounded px-1 text-[10px] disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  )}

                  {/* Folguista */}
                  {!inRotation && (
                    <button
                      onClick={() => setSubstituteId(isSubst ? null : prof.id)}
                      className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                        isSubst
                          ? 'bg-feedback-warning-bg text-feedback-warning-fg'
                          : 'text-content-muted hover:text-feedback-warning-fg'
                      }`}
                      title="Marcar como folguista"
                    >
                      ★ Folguista
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dias por profissional */}
        <div>
          <label className="label mb-1 block text-sm">Dias consecutivos por profissional:</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={31}
              value={daysPerProfessional}
              onChange={(e) => {
                setDaysPerProfessional(Math.max(1, parseInt(e.target.value) || 1));
                setShowPreview(false);
                setPreview(null);
              }}
              className="input-field w-20 text-center"
            />
            <span className="text-content-muted text-sm">dia(s)</span>
          </div>
        </div>

        {/* Dias da semana */}
        <div>
          <label className="label mb-1 block text-sm">Dias da semana:</label>
          <div className="flex flex-wrap gap-1">
            {WEEKDAY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleWeekday(opt.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedWeekdays.includes(opt.value)
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-border-default text-content-secondary hover:border-primary-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Botão gerar preview */}
        <Button
          variant="secondary"
          onClick={handleGeneratePreview}
          disabled={rotation.length === 0}
          className="w-full"
        >
          Gerar preview
        </Button>

        {/* Preview */}
        {showPreview && preview && (
          <div>
            <h4 className="text-content-primary mb-2 text-sm font-semibold">Preview:</h4>
            <div className="border-border-default max-h-[200px] overflow-y-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-surface-card sticky top-0">
                  <tr>
                    <th className="border-border-default text-content-muted border-b px-2 py-1 text-left">
                      Dia
                    </th>
                    {slots.map((s) => (
                      <th
                        key={s}
                        className="border-border-default text-content-muted border-b px-2 py-1 text-left"
                      >
                        {slots.length > 1 ? s : 'Profissional'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewDays.map(({ date, profIds }) => {
                    const anyAssigned = profIds.some((id) => id);
                    if (!anyAssigned) return null;
                    return (
                      <tr key={date} className="border-border-default/50 border-b">
                        <td className="text-content-primary px-2 py-1">{formatDateBR(date)}</td>
                        {profIds.map((profId, i) => {
                          const prof = profId ? profMap.get(profId) : null;
                          return (
                            <td key={i} className="px-2 py-1">
                              {prof ? (
                                <span className="flex items-center gap-1">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{
                                      backgroundColor:
                                        prof.color || 'rgb(var(--color-primary-500))',
                                    }}
                                  />
                                  {prof.name.split(' ')[0]}
                                </span>
                              ) : (
                                <span className="text-content-muted">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleApply} disabled={!preview}>
          Aplicar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
