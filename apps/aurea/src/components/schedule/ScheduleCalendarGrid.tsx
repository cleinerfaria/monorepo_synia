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
import { SLOTS_BY_REGIME, getSlotTimes } from '@/types/schedule';
import type {
  ScheduleProfessional,
  SlotType,
  ScheduleRegime,
  ScheduleAssignment,
} from '@/types/schedule';
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
const SLOT_TYPE_LABELS: Record<SlotType, string> = {
  '24h': '24h',
  '12h_day': '12h diurno',
  '12h_night': '12h noturno',
  '8h_morning': '8h manha',
  '8h_afternoon': '8h tarde',
  '8h_night': '8h noite',
};

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

function formatTimeRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const startLabel = start.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const endLabel = end.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const crossesDay = end.toISOString().slice(0, 10) > start.toISOString().slice(0, 10);
  return `${startLabel}-${endLabel}${crossesDay ? ' (+1 dia)' : ''}`;
}

function resolveAssignmentSlotType(
  date: string,
  assignment: ScheduleAssignment,
  regime: ScheduleRegime,
  startTime: string
): SlotType | null {
  for (const slotType of SLOTS_BY_REGIME[regime]) {
    const expectedTimes = getSlotTimes(slotType, date, startTime);
    if (expectedTimes.start === assignment.start_at && expectedTimes.end === assignment.end_at) {
      return slotType;
    }
  }

  return null;
}

function buildAssignmentLabel(
  date: string,
  assignment: ScheduleAssignment,
  regime: ScheduleRegime,
  startTime: string
): string {
  const slotType = resolveAssignmentSlotType(date, assignment, regime, startTime);
  const timeRange = formatTimeRange(assignment.start_at, assignment.end_at);

  if (!slotType) {
    return `(${timeRange})`;
  }

  return `${SLOT_TYPE_LABELS[slotType]} (${timeRange})`;
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
    startTime,
    assignments,
    selectedDates,
    toggleDateSelection,
    moveAssignment,
    copyAssignment,
    swapAssignments,
    removeAssignment,
  } = useScheduleStore();

  const [dragItem, setDragItem] = useState<{
    date: string;
    index: number;
    professionalId: string;
  } | null>(null);

  const [swapModal, setSwapModal] = useState<{
    open: boolean;
    sourceDate: string;
    sourceIndex: number;
    sourceLabel: string;
    sourceProfessionalName: string;
    targetDate: string;
    targetOptions: Array<{ index: number; label: string; professionalName: string }>;
    selectedTargetIndex: number | null;
  }>({
    open: false,
    sourceDate: '',
    sourceIndex: -1,
    sourceLabel: '',
    sourceProfessionalName: '',
    targetDate: '',
    targetOptions: [],
    selectedTargetIndex: null,
  });

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
      let toIndex: number | null = null;
      if (overIdStr.startsWith('day::')) {
        toDate = overIdStr.replace('day::', '');
      } else {
        const [parsedDate, parsedIndex] = overIdStr.split('::');
        toDate = parsedDate;
        const nextIndex = Number.parseInt(parsedIndex, 10);
        toIndex = Number.isNaN(nextIndex) ? null : nextIndex;
      }
      if (minEditableDate && toDate < minEditableDate) return;

      if (fromDate === toDate) {
        const sameDayAssignments = assignments.get(fromDate) || [];

        // No mesmo dia, se o drop cair no container do dia (sem indice),
        // troca com o outro slot quando houver apenas um par de plantoes.
        if (toIndex === null) {
          if (sameDayAssignments.length === 2) {
            const otherIndex = fromIndex === 0 ? 1 : 0;
            swapAssignments(fromDate, fromIndex, toDate, otherIndex);
          }
          return;
        }

        if (toIndex === fromIndex) return;
        swapAssignments(fromDate, fromIndex, toDate, toIndex);
        return;
      }

      const sourceAssignments = assignments.get(fromDate);
      const sourceAssignment = sourceAssignments?.[fromIndex];
      if (!sourceAssignment) return;

      const targetAssignments = assignments.get(toDate);
      if (targetAssignments && targetAssignments.length > 0) {
        const sourceLabel = buildAssignmentLabel(fromDate, sourceAssignment, regime, startTime);
        const sourceProfessionalName =
          profMap.get(sourceAssignment.professional_id)?.name || 'Profissional';
        const targetOptions = targetAssignments.map((assignment, index) => ({
          index,
          label: buildAssignmentLabel(toDate, assignment, regime, startTime),
          professionalName: profMap.get(assignment.professional_id)?.name || 'Sem profissional',
        }));

        if (targetOptions.length === 1) {
          swapAssignments(fromDate, fromIndex, toDate, targetOptions[0].index);
          return;
        }

        setSwapModal({
          open: true,
          sourceDate: fromDate,
          sourceIndex: fromIndex,
          sourceLabel,
          sourceProfessionalName,
          targetDate: toDate,
          targetOptions,
          selectedTargetIndex: null,
        });
      } else if (copyModeRef.current) {
        copyAssignment(fromDate, fromIndex, toDate);
      } else {
        moveAssignment(fromDate, fromIndex, toDate);
      }
    },
    [
      assignments,
      moveAssignment,
      copyAssignment,
      minEditableDate,
      regime,
      startTime,
      profMap,
      swapAssignments,
    ]
  );

  const closeSwapModal = useCallback(() => {
    setSwapModal({
      open: false,
      sourceDate: '',
      sourceIndex: -1,
      sourceLabel: '',
      sourceProfessionalName: '',
      targetDate: '',
      targetOptions: [],
      selectedTargetIndex: null,
    });
  }, []);

  const handleSwapTargetSelect = useCallback((index: number) => {
    setSwapModal((prev) => ({ ...prev, selectedTargetIndex: index }));
  }, []);

  const handleSwapConfirm = useCallback(() => {
    if (swapModal.selectedTargetIndex === null) return;

    swapAssignments(
      swapModal.sourceDate,
      swapModal.sourceIndex,
      swapModal.targetDate,
      swapModal.selectedTargetIndex
    );
    closeSwapModal();
  }, [swapModal, swapAssignments, closeSwapModal]);

  const handleSwapCancel = useCallback(() => {
    closeSwapModal();
  }, [closeSwapModal]);

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
        sourceDate={swapModal.sourceDate}
        sourceLabel={swapModal.sourceLabel}
        sourceProfessionalName={swapModal.sourceProfessionalName}
        targetDate={swapModal.targetDate}
        targetOptions={swapModal.targetOptions}
        selectedTargetIndex={swapModal.selectedTargetIndex}
        onSelectTarget={handleSwapTargetSelect}
        onConfirm={handleSwapConfirm}
        onCancel={handleSwapCancel}
      />
    </>
  );
}

export const ScheduleCalendarGrid = memo(ScheduleCalendarGridInner);
