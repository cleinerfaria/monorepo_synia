import { memo, useCallback, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type {
  ScheduleProfessional,
  DayAssignmentsMap,
} from '@/types/schedule';
import { ScheduleSlotChip } from './ScheduleSlotChip';

interface ScheduleDayCellProps {
  date: string;
  assignments: DayAssignmentsMap;
  profMap: Map<string, ScheduleProfessional>;
  isSelected: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isDropTarget: boolean;
  onClick: (date: string, event: React.MouseEvent) => void;
  onSlotClick: (date: string, index: number) => void;
  onAddClick: (date: string) => void;
  onRemoveAssignment: (date: string, index: number) => void;
}

function ScheduleDayCellInner({
  date,
  assignments,
  profMap,
  isSelected,
  isToday,
  isWeekend,
  isDropTarget,
  onClick,
  onSlotClick,
  onAddClick,
  onRemoveAssignment,
}: ScheduleDayCellProps) {
  const dayNumber = parseInt(date.slice(8, 10), 10);
  const dayAssignments = assignments.get(date) || [];
  const hasAssignments = dayAssignments.length > 0;

  const { setNodeRef, isOver } = useDroppable({ id: `day::${date}` });

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      onClick(date, e);
    },
    [date, onClick]
  );

  const handleAddClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAddClick(date);
    },
    [date, onAddClick]
  );

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
    if (isDropTarget || isOver) {
      classes.push('ring-2 ring-inset ring-primary-400 bg-primary-50/50 dark:bg-primary-900/30');
    }
    if (!hasAssignments) {
      classes.push('border-b-2 border-b-feedback-warning-border');
    }

    return classes.join(' ');
  }, [isSelected, isToday, isWeekend, isDropTarget, isOver, hasAssignments]);

  return (
    <div ref={setNodeRef} className={cellClasses} onClick={handleClick}>
      {/* Numero do dia */}
      <div className="mb-0.5 flex items-center justify-between">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
            isToday ? 'bg-primary-500 text-white' : 'text-content-primary'
          }`}
        >
          {dayNumber}
        </span>
        {!hasAssignments && (
          <span className="text-feedback-warning-fg text-[10px]" title="Sem profissional atribuido">
            ●
          </span>
        )}
      </div>

      {/* Assignments do dia */}
      <div className="space-y-0.5">
        {dayAssignments.map((assignment, idx) => {
          const prof = profMap.get(assignment.professional_id);
          if (!prof) return null;

          return (
            <ScheduleSlotChip
              key={`${assignment.professional_id}-${idx}`}
              professional={prof}
              dragId={`${date}::${idx}`}
              startAt={assignment.start_at}
              endAt={assignment.end_at}
              isDraggable
              onEdit={() => onSlotClick(date, idx)}
              onRemove={() => onRemoveAssignment(date, idx)}
            />
          );
        })}

        {/* Botao para adicionar */}
        <button
          onClick={handleAddClick}
          className="border-border-default text-content-muted hover:border-primary-300 hover:bg-primary-50/30 hover:text-primary-600 dark:hover:border-primary-600 dark:hover:bg-primary-900/20 dark:hover:text-primary-400 flex w-full items-center justify-center rounded border border-dashed px-1 py-0.5 text-[10px] transition-colors"
          title="Adicionar profissional"
        >
          +
        </button>
      </div>
    </div>
  );
}

export const ScheduleDayCell = memo(ScheduleDayCellInner);
