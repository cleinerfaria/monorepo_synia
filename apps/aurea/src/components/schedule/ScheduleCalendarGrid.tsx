import { memo, useCallback, useMemo, useState, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { useScheduleStore } from '@/stores/scheduleStore';
import { assignmentKey, SLOTS_BY_REGIME, SLOT_LABELS } from '@/types/schedule';
import type { SlotType, ScheduleProfessional } from '@/types/schedule';
import { ScheduleDayCell } from './ScheduleDayCell';
import { ScheduleSlotChip } from './ScheduleSlotChip';
import { SwapConfirmModal } from './SwapConfirmModal';

interface ScheduleCalendarGridProps {
  professionals: ScheduleProfessional[];
  onSlotClick: (date: string, slot: SlotType) => void;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Retorna todos os dias do mês em formato YYYY-MM-DD */
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

/** Retorna dia da semana (0=Dom...6=Sáb) */
function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay();
}

/** Converter DOM dayOfWeek para index da grid (Dom=0, Sáb=6) */
function gridColumn(dayOfWeek: number): number {
  return dayOfWeek;
}

function ScheduleCalendarGridInner({ professionals, onSlotClick }: ScheduleCalendarGridProps) {
  const {
    year,
    month,
    regime,
    assignments,
    assignmentsData,
    selectedDates,
    toggleDateSelection,
    moveProfessional,
    copyProfessional,
    swapProfessionals,
  } = useScheduleStore();

  const [dragItem, setDragItem] = useState<{
    date: string;
    slot: SlotType;
    professionalId: string;
  } | null>(null);

  const [swapModal, setSwapModal] = useState<{
    open: boolean;
    dateA: string;
    dateB: string;
    slot: SlotType;
  }>({ open: false, dateA: '', dateB: '', slot: '24h' });

  const [overDate, setOverDate] = useState<string | null>(null);
  const copyModeRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  const slots = useMemo(() => SLOTS_BY_REGIME[regime], [regime]);

  const profMap = useMemo(() => {
    const map = new Map<string, ScheduleProfessional>();
    for (const p of professionals) {
      map.set(p.id, p);
    }
    return map;
  }, [professionals]);

  // Calcular offset da primeira semana
  const firstDayColumn = useMemo(() => {
    if (days.length === 0) return 0;
    return gridColumn(getDayOfWeek(days[0]));
  }, [days]);

  // Agrupar por semanas para grid
  const weeks = useMemo(() => {
    const result: Array<Array<string | null>> = [];
    let currentWeek: Array<string | null> = new Array(firstDayColumn).fill(null);

    for (const day of days) {
      const col = gridColumn(getDayOfWeek(day));
      if (col === 0 && currentWeek.length > 0) {
        // Pad última semana
        while (currentWeek.length < 7) currentWeek.push(null);
        result.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    }

    // Pad última semana
    while (currentWeek.length < 7) currentWeek.push(null);
    if (currentWeek.some((d) => d !== null)) result.push(currentWeek);

    return result;
  }, [days, firstDayColumn]);

  // Drag handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const [date, slot] = (active.id as string).split('::');
      const profIds = assignments.get(assignmentKey(date, slot as SlotType)) || [];
      const profId = profIds[0]; // Pegar o primeiro profissional

      // Detectar se Ctrl/Alt está pressionado para modo copiar
      const nativeEvent = event.activatorEvent as any;
      copyModeRef.current = nativeEvent?.ctrlKey || nativeEvent?.altKey || false;

      if (profId) {
        setDragItem({ date, slot: slot as SlotType, professionalId: profId });
      }
    },
    [assignments]
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const [date] = (over.id as string).split('::');
      setOverDate(date);
    } else {
      setOverDate(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setDragItem(null);
      setOverDate(null);

      if (!over || !active) return;

      const [fromDate, fromSlot] = (active.id as string).split('::');
      const [toDate, toSlot] = (over.id as string).split('::');
      const slot = fromSlot as SlotType;

      if (fromDate === toDate) return;

      // Verificar se o destino já tem um profissional
      const targetKey = assignmentKey(toDate, slot);
      const targetProfIds = assignments.get(targetKey);

      if (targetProfIds && targetProfIds.length > 0) {
        // Abrir modal de swap
        setSwapModal({ open: true, dateA: fromDate, dateB: toDate, slot });
      } else if (copyModeRef.current) {
        copyProfessional(fromDate, toDate, slot);
      } else {
        moveProfessional(fromDate, toDate, slot);
      }
    },
    [assignments, moveProfessional, copyProfessional]
  );

  const handleSwapConfirm = useCallback(() => {
    swapProfessionals(swapModal.dateA, swapModal.dateB, swapModal.slot);
    setSwapModal({ open: false, dateA: '', dateB: '', slot: '24h' });
  }, [swapModal, swapProfessionals]);

  const handleSwapCancel = useCallback(() => {
    setSwapModal({ open: false, dateA: '', dateB: '', slot: '24h' });
  }, []);

  const handleDateClick = useCallback(
    (date: string, event: React.MouseEvent) => {
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        toggleDateSelection(date);
      }
    },
    [toggleDateSelection]
  );

  // Overlay do drag
  const dragOverlayContent = useMemo(() => {
    if (!dragItem) return null;
    const prof = profMap.get(dragItem.professionalId);
    if (!prof) return null;
    return <ScheduleSlotChip professional={prof} isDragging slot={dragItem.slot} />;
  }, [dragItem, profMap]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto">
          {/* Header: dias da semana */}
          <div className="bg-border-default grid grid-cols-7 gap-px rounded-t-lg">
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={label}
                className={`bg-surface-card text-content-secondary px-2 py-2 text-center text-xs font-semibold ${
                  i === 0 || i === 6 ? 'text-feedback-warning-fg/70' : ''
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Corpo: semanas */}
          <div className="bg-border-default grid gap-px rounded-b-lg">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-px">
                {week.map((date, dayIdx) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${weekIdx}-${dayIdx}`}
                        className="bg-surface-canvas/50 min-h-[80px] md:min-h-[100px]"
                      />
                    );
                  }

                  const isSelected = selectedDates.has(date);
                  const isToday = date === today;
                  const isWeekend = dayIdx === 0 || dayIdx === 6;
                  const isDropTarget = overDate === date;

                  // Verificar se tem profissional atribuído em todos os slots
                  const hasAllSlots = slots.every((s) => {
                    const profs = assignments.get(assignmentKey(date, s));
                    return profs && profs.length > 0;
                  });
                  const hasAnySlot = slots.some((s) => {
                    const profs = assignments.get(assignmentKey(date, s));
                    return profs && profs.length > 0;
                  });
                  const isPending = !hasAllSlots;

                  return (
                    <ScheduleDayCell
                      key={date}
                      date={date}
                      slots={slots}
                      assignments={assignments}
                      assignmentsData={assignmentsData}
                      profMap={profMap}
                      isSelected={isSelected}
                      isToday={isToday}
                      isWeekend={isWeekend}
                      isDropTarget={isDropTarget}
                      isPending={isPending}
                      hasAnySlot={hasAnySlot}
                      onClick={handleDateClick}
                      onSlotClick={onSlotClick}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>{dragOverlayContent}</DragOverlay>
      </DndContext>

      <SwapConfirmModal
        isOpen={swapModal.open}
        dateA={swapModal.dateA}
        dateB={swapModal.dateB}
        slot={swapModal.slot}
        profA={profMap.get(assignments.get(assignmentKey(swapModal.dateA, swapModal.slot))?.[0] || '')}
        profB={profMap.get(assignments.get(assignmentKey(swapModal.dateB, swapModal.slot))?.[0] || '')}
        onConfirm={handleSwapConfirm}
        onCancel={handleSwapCancel}
      />
    </>
  );
}

export const ScheduleCalendarGrid = memo(ScheduleCalendarGridInner);
