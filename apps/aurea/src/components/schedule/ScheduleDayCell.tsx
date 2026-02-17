import { memo, useCallback, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { assignmentKey, SLOT_LABELS } from '@/types/schedule';
import type { SlotType, ScheduleProfessional, AssignmentMap, ScheduleAssignmentDataMap } from '@/types/schedule';
import { ScheduleSlotChip } from './ScheduleSlotChip';

interface ScheduleDayCellProps {
  date: string;
  slots: SlotType[];
  assignments: AssignmentMap;
  assignmentsData: ScheduleAssignmentDataMap;
  profMap: Map<string, ScheduleProfessional>;
  isSelected: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isDropTarget: boolean;
  isPending: boolean;
  hasAnySlot: boolean;
  onClick: (date: string, event: React.MouseEvent) => void;
  onSlotClick: (date: string, slot: SlotType) => void;
}

function ScheduleDayCellInner({
  date,
  slots,
  assignments,
  assignmentsData,
  profMap,
  isSelected,
  isToday,
  isWeekend,
  isDropTarget,
  isPending,
  hasAnySlot,
  onClick,
  onSlotClick,
}: ScheduleDayCellProps) {
  const dayNumber = parseInt(date.slice(8, 10), 10);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      onClick(date, e);
    },
    [date, onClick]
  );

  // Classes base da célula
  const cellClasses = useMemo(() => {
    const classes = [
      'relative min-h-[80px] md:min-h-[100px] p-1 md:p-1.5 transition-colors cursor-pointer',
      'bg-surface-card hover:bg-surface-hover',
    ];

    if (isSelected) {
      classes.push('ring-2 ring-inset ring-primary-500 bg-primary-50/30 dark:bg-primary-900/20');
    }
    if (isToday) {
      classes.push('border-l-2 border-l-primary-500');
    }
    if (isWeekend) {
      classes.push('bg-surface-canvas/80 dark:bg-surface-canvas/40');
    }
    if (isDropTarget) {
      classes.push('ring-2 ring-inset ring-primary-400 bg-primary-50/50 dark:bg-primary-900/30');
    }
    if (isPending && !hasAnySlot) {
      classes.push('border-b-2 border-b-feedback-warning-border');
    }

    return classes.join(' ');
  }, [isSelected, isToday, isWeekend, isDropTarget, isPending, hasAnySlot]);

  return (
    <div className={cellClasses} onClick={handleClick}>
      {/* Número do dia */}
      <div className="mb-0.5 flex items-center justify-between">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
            isToday ? 'bg-primary-500 text-white' : 'text-content-primary'
          }`}
        >
          {dayNumber}
        </span>
        {isPending && !hasAnySlot && (
          <span className="text-feedback-warning-fg text-[10px]" title="Sem profissional atribuído">
            ●
          </span>
        )}
      </div>

      {/* Slots */}
      <div className="space-y-0.5">
        {slots.map((slot) => {
          const key = assignmentKey(date, slot);
          const profIds = assignments.get(key) || [];
          const professionals = profIds
            .map(id => profMap.get(id))
            .filter((p) => p !== undefined) as ScheduleProfessional[];
          const assignmentDataList = assignmentsData.get(key) || [];

          return (
            <SlotDropZone
              key={slot}
              date={date}
              slot={slot}
              professionals={professionals}
              assignmentDataList={assignmentDataList}
              showSlotLabel={slots.length > 1}
              onSlotClick={onSlotClick}
            />
          );
        })}
      </div>
    </div>
  );
}

export const ScheduleDayCell = memo(ScheduleDayCellInner);

// =====================================================
// Drop zone de um slot individual
// =====================================================

interface SlotDropZoneProps {
  date: string;
  slot: SlotType;
  professionals: ScheduleProfessional[];
  assignmentDataList: import('@/types/schedule').ScheduleAssignment[];
  showSlotLabel: boolean;
  onSlotClick: (date: string, slot: SlotType) => void;
}

function SlotDropZoneInner({
  date,
  slot,
  professionals,
  assignmentDataList,
  showSlotLabel,
  onSlotClick,
}: SlotDropZoneProps) {
  const dropId = `${date}::${slot}`;
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSlotClick(date, slot);
    },
    [date, slot, onSlotClick]
  );

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={`min-h-[28px] rounded transition-colors ${
        isOver ? 'bg-primary-100/50 dark:bg-primary-800/30' : 'hover:bg-surface-hover/50'
      }`}
    >
      {showSlotLabel && (
        <span className="text-content-muted text-[9px] font-medium">{SLOT_LABELS[slot]}</span>
      )}
      
      {professionals.length > 0 ? (
        <div className="space-y-0.5">
          {professionals.map((prof, idx) => (
            <ScheduleSlotChip 
              key={prof.id}
              professional={prof} 
              slot={slot} 
              date={date}
              startAt={assignmentDataList[idx]?.start_at}
              endAt={assignmentDataList[idx]?.end_at}
              isDraggable 
            />
          ))}
        </div>
      ) : (
        <button
          className="border-border-default text-content-muted hover:border-primary-300 hover:bg-primary-50/30 hover:text-primary-600 dark:hover:border-primary-600 dark:hover:bg-primary-900/20 dark:hover:text-primary-400 flex w-full items-center justify-center rounded border border-dashed px-1 py-0.5 text-[10px] transition-colors"
          title="Atribuir profissional"
        >
          +
        </button>
      )}
    </div>
  );
}

const SlotDropZone = memo(SlotDropZoneInner);
