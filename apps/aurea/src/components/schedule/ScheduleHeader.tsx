import { memo, useMemo } from 'react';
import { Button } from '@/components/ui';
import type { ScheduleRegime } from '@/types/schedule';

interface ScheduleHeaderProps {
  patientName: string | undefined;
  year: number;
  month: number;
  regime: ScheduleRegime;
  isDirty: boolean;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSave: () => void;
  onClearMonth: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleSidebar: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function ScheduleHeaderInner({
  patientName,
  year,
  month,
  regime,
  isDirty,
  isSaving,
  canUndo,
  canRedo,
  onPreviousMonth,
  onNextMonth,
  onSave,
  onClearMonth,
  onUndo,
  onRedo,
  onToggleSidebar,
}: ScheduleHeaderProps) {
  const monthLabel = useMemo(() => `${MONTH_NAMES[month - 1]} ${year}`, [month, year]);

  return (
    <div className="mb-4 space-y-3">
      {/* Linha 1: Paciente + mês */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-content-primary md:text-xl">
            Escala Mensal
          </h1>
          {patientName && (
            <p className="text-sm text-content-secondary">{patientName}</p>
          )}
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPreviousMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default text-content-secondary transition-colors hover:bg-surface-hover"
            title="Mês anterior"
          >
            ‹
          </button>
          <span className="min-w-[140px] text-center text-sm font-semibold text-content-primary">
            {monthLabel}
          </span>
          <button
            onClick={onNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default text-content-secondary transition-colors hover:bg-surface-hover"
            title="Próximo mês"
          >
            ›
          </button>
        </div>
      </div>

      {/* Linha 2: Ações */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Toggle sidebar em mobile */}
        <button
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default text-content-secondary transition-colors hover:bg-surface-hover lg:hidden"
          title="Painel lateral"
        >
          ☰
        </button>

        {/* Regime badge */}
        <span className="rounded-full border border-border-default bg-surface-canvas px-2 py-0.5 text-[10px] font-medium text-content-muted">
          {regime}
        </span>

        {/* Indicador de alterações não salvas */}
        {isDirty && (
          <span className="flex items-center gap-1 rounded-full bg-feedback-warning-bg px-2 py-0.5 text-[10px] font-medium text-feedback-warning-fg">
            <span className="h-1.5 w-1.5 rounded-full bg-feedback-warning-fg" />
            Não salvo
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Undo/Redo */}
        <div className="flex gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default text-sm text-content-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-30"
            title="Desfazer (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-default text-sm text-content-secondary transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-30"
            title="Refazer (Ctrl+Y)"
          >
            ↷
          </button>
        </div>

        {/* Limpar mês */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearMonth}
          className="text-xs text-feedback-danger-fg hover:bg-feedback-danger-bg/30"
        >
          Limpar
        </Button>

        {/* Salvar */}
        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className="min-w-[80px]"
        >
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

export const ScheduleHeader = memo(ScheduleHeaderInner);
