import { memo, useCallback, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { ScheduleProfessional, ScheduleRegime, DayAssignmentsMap } from '@/types/schedule';
import { getRegimeMaxHours } from '@/types/schedule';
import { ScheduleSlotChip } from './ScheduleSlotChip';

interface ScheduleDayCellProps {
  date: string;
  assignments: DayAssignmentsMap;
  profMap: Map<string, ScheduleProfessional>;
  isSelected: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isDropTarget: boolean;
  isLocked: boolean;
  regime: ScheduleRegime;
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
  regime,
  isDropTarget,
  isLocked,
  onClick,
  onSlotClick,
  onAddClick,
  onRemoveAssignment,
}: ScheduleDayCellProps) {
  const dayNumber = parseInt(date.slice(8, 10), 10);
  const dayAssignments = useMemo(() => assignments.get(date) || [], [assignments, date]);
  const hasAssignments = dayAssignments.length > 0;
  const hasSingleOvernightAssignment = useMemo(() => {
    if (dayAssignments.length !== 1) return false;
    const assignment = dayAssignments[0];
    const start = new Date(assignment.start_at);
    const end = new Date(assignment.end_at);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    return end.toISOString().slice(0, 10) > start.toISOString().slice(0, 10);
  }, [dayAssignments]);

  // Verificar se o dia esta completo (horas preenchidas >= horas do regime)
  const isDayFull = useMemo(() => {
    const maxHours = getRegimeMaxHours(regime);
    const totalMs = dayAssignments.reduce((sum, a) => {
      return sum + (new Date(a.end_at).getTime() - new Date(a.start_at).getTime());
    }, 0);
    const totalHours = totalMs / (1000 * 60 * 60);
    return totalHours >= maxHours;
  }, [dayAssignments, regime]);

  const { setNodeRef, isOver } = useDroppable({ id: `day::${date}`, disabled: isLocked });

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isLocked) return;
      onClick(date, e);
    },
    [date, onClick, isLocked]
  );

  const handleAddClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isLocked) return;
      onAddClick(date);
    },
    [date, onAddClick, isLocked]
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
    if (isLocked) {
      classes.push('cursor-not-allowed opacity-55');
    }
    if (!hasAssignments) {
      classes.push('border-b-2 border-b-feedback-warning-border');
    }

    return classes.join(' ');
  }, [isSelected, isToday, isWeekend, isDropTarget, isOver, hasAssignments, isLocked]);

  const showAddButton = !isDayFull && !isLocked;
  const showAddButtonBeforeAssignments = showAddButton && hasSingleOvernightAssignment;
  const addButtonClass =
    'border-border-default text-content-muted hover:border-primary-300 hover:bg-primary-50/30 hover:text-primary-600 dark:hover:border-primary-600 dark:hover:bg-primary-900/20 dark:hover:text-primary-400 flex min-h-[26px] w-full items-center justify-center rounded border border-dashed px-1 py-0.5 text-[10px] transition-colors md:min-h-[30px]';

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
        {showAddButtonBeforeAssignments && (
          <button
            onClick={handleAddClick}
            className={addButtonClass}
            title="Adicionar profissional"
          >
            +
          </button>
        )}

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
              isDraggable={!isLocked}
              onEdit={isLocked ? undefined : () => onSlotClick(date, idx)}
              onRemove={isLocked ? undefined : () => onRemoveAssignment(date, idx)}
            />
          );
        })}

        {/* Botao para adicionar (so aparece se o dia nao estiver completo) */}
        {showAddButton && !showAddButtonBeforeAssignments && (
          <button
            onClick={handleAddClick}
            className={addButtonClass}
            title="Adicionar profissional"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

export const ScheduleDayCell = memo(ScheduleDayCellInner);
