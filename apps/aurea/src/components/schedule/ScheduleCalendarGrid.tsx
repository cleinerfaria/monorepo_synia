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
import type { ScheduleProfessional } from '@/types/schedule';
import { ScheduleDayCell } from './ScheduleDayCell';
import { ScheduleSlotChip } from './ScheduleSlotChip';
import { SwapConfirmModal } from './SwapConfirmModal';

interface ScheduleCalendarGridProps {
  professionals: ScheduleProfessional[];
  onSlotClick: (date: string, index: number) => void;
  onAddClick: (date: string) => void;
  minEditableDate: string | null;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

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

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay();
}

function gridColumn(dayOfWeek: number): number {
  return dayOfWeek;
}

function ScheduleCalendarGridInner({
  professionals,
  onSlotClick,
  onAddClick,
  minEditableDate,
}: ScheduleCalendarGridProps) {
  const {
    year,
    month,
    regime,
    assignments,
    selectedDates,
    toggleDateSelection,
    moveAssignment,
    copyAssignment,
    swapDayAssignments,
    removeAssignment,
  } = useScheduleStore();

  const [dragItem, setDragItem] = useState<{
    date: string;
    index: number;
    professionalId: string;
  } | null>(null);

  const [swapModal, setSwapModal] = useState<{
    open: boolean;
    dateA: string;
    dateB: string;
  }>({ open: false, dateA: '', dateB: '' });

  const [overDate, setOverDate] = useState<string | null>(null);
  const copyModeRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const profMap = useMemo(() => {
    const map = new Map<string, ScheduleProfessional>();
    for (const p of professionals) {
      map.set(p.id, p);
    }
    return map;
  }, [professionals]);

  const firstDayColumn = useMemo(() => {
    if (days.length === 0) return 0;
    return gridColumn(getDayOfWeek(days[0]));
  }, [days]);

  const weeks = useMemo(() => {
    const result: Array<Array<string | null>> = [];
    let currentWeek: Array<string | null> = new Array(firstDayColumn).fill(null);

    for (const day of days) {
      const col = gridColumn(getDayOfWeek(day));
      if (col === 0 && currentWeek.length > 0) {
        while (currentWeek.length < 7) currentWeek.push(null);
        result.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    }

    while (currentWeek.length < 7) currentWeek.push(null);
    if (currentWeek.some((d) => d !== null)) result.push(currentWeek);

    return result;
  }, [days, firstDayColumn]);

  // Drag handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const idStr = active.id as string;
      const [date, indexStr] = idStr.split('::');
      const index = parseInt(indexStr, 10);
      if (minEditableDate && date < minEditableDate) return;
      const dayAssignments = assignments.get(date);
      const assignment = dayAssignments?.[index];

      const nativeEvent = event.activatorEvent as any;
      copyModeRef.current = nativeEvent?.ctrlKey || nativeEvent?.altKey || false;

      if (assignment) {
        setDragItem({ date, index, professionalId: assignment.professional_id });
      }
    },
    [assignments, minEditableDate]
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const overIdStr = over.id as string;
      // Drop target is "day::YYYY-MM-DD" or "YYYY-MM-DD::index"
      if (overIdStr.startsWith('day::')) {
        setOverDate(overIdStr.replace('day::', ''));
      } else {
        const [date] = overIdStr.split('::');
        setOverDate(date);
      }
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

      const activeIdStr = active.id as string;
      const [fromDate, fromIndexStr] = activeIdStr.split('::');
      const fromIndex = parseInt(fromIndexStr, 10);
      if (minEditableDate && fromDate < minEditableDate) return;

      const overIdStr = over.id as string;
      let toDate: string;
      if (overIdStr.startsWith('day::')) {
        toDate = overIdStr.replace('day::', '');
      } else {
        [toDate] = overIdStr.split('::');
      }
      if (minEditableDate && toDate < minEditableDate) return;

      if (fromDate === toDate) return;

      // Se o destino ja tem assignments, abrir modal de swap
      const targetAssignments = assignments.get(toDate);
      if (targetAssignments && targetAssignments.length > 0) {
        setSwapModal({ open: true, dateA: fromDate, dateB: toDate });
      } else if (copyModeRef.current) {
        copyAssignment(fromDate, fromIndex, toDate);
      } else {
        moveAssignment(fromDate, fromIndex, toDate);
      }
    },
    [assignments, moveAssignment, copyAssignment, minEditableDate]
  );

  const handleSwapConfirm = useCallback(() => {
    swapDayAssignments(swapModal.dateA, swapModal.dateB);
    setSwapModal({ open: false, dateA: '', dateB: '' });
  }, [swapModal, swapDayAssignments]);

  const handleSwapCancel = useCallback(() => {
    setSwapModal({ open: false, dateA: '', dateB: '' });
  }, []);

  const handleDateClick = useCallback(
    (date: string, event: React.MouseEvent) => {
      if (minEditableDate && date < minEditableDate) return;
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        toggleDateSelection(date);
      }
    },
    [toggleDateSelection, minEditableDate]
  );

  const handleRemoveAssignment = useCallback(
    (date: string, index: number) => {
      removeAssignment(date, index);
    },
    [removeAssignment]
  );

  // Overlay do drag
  const dragOverlayContent = useMemo(() => {
    if (!dragItem) return null;
    const prof = profMap.get(dragItem.professionalId);
    if (!prof) return null;
    const dayAssignments = assignments.get(dragItem.date);
    const assignment = dayAssignments?.[dragItem.index];
    return (
      <ScheduleSlotChip
        professional={prof}
        isDragging
        startAt={assignment?.start_at}
        endAt={assignment?.end_at}
      />
    );
  }, [dragItem, profMap, assignments]);

  const today = new Date().toISOString().slice(0, 10);

  // Nomes dos profissionais para o modal de swap
  const swapProfNamesA = useMemo(() => {
    if (!swapModal.open) return '';
    const dayA = assignments.get(swapModal.dateA) || [];
    return dayA.map((a) => profMap.get(a.professional_id)?.name || '?').join(', ');
  }, [swapModal, assignments, profMap]);

  const swapProfNamesB = useMemo(() => {
    if (!swapModal.open) return '';
    const dayB = assignments.get(swapModal.dateB) || [];
    return dayB.map((a) => profMap.get(a.professional_id)?.name || '?').join(', ');
  }, [swapModal, assignments, profMap]);

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
                  const isLocked = !!minEditableDate && date < minEditableDate;

                  return (
                    <ScheduleDayCell
                      key={date}
                      date={date}
                      assignments={assignments}
                      profMap={profMap}
                      isSelected={isSelected}
                      isToday={isToday}
                      isWeekend={isWeekend}
                      isDropTarget={isDropTarget}
                      isLocked={isLocked}
                      regime={regime}
                      onClick={handleDateClick}
                      onSlotClick={onSlotClick}
                      onAddClick={onAddClick}
                      onRemoveAssignment={handleRemoveAssignment}
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
        profNamesA={swapProfNamesA}
        profNamesB={swapProfNamesB}
        onConfirm={handleSwapConfirm}
        onCancel={handleSwapCancel}
      />
    </>
  );
}

export const ScheduleCalendarGrid = memo(ScheduleCalendarGridInner);
