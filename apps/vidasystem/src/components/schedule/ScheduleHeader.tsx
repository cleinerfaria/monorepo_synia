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
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
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
          <h1 className="text-content-primary text-lg font-bold md:text-xl">Escala Mensal</h1>
          {patientName && <p className="text-content-secondary text-sm">{patientName}</p>}
        </div>

        {/* Navegação de mês */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPreviousMonth}
            className="border-border-default text-content-secondary hover:bg-surface-hover flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
            title="Mês anterior"
          >
            ‹
          </button>
          <span className="text-content-primary min-w-[140px] text-center text-sm font-semibold">
            {monthLabel}
          </span>
          <button
            onClick={onNextMonth}
            className="border-border-default text-content-secondary hover:bg-surface-hover flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
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
          className="border-border-default text-content-secondary hover:bg-surface-hover flex h-8 w-8 items-center justify-center rounded-lg border transition-colors lg:hidden"
          title="Painel lateral"
        >
          ☰
        </button>

        {/* Regime badge */}
        <span className="border-border-default bg-surface-canvas text-content-muted rounded-full border px-2 py-0.5 text-[10px] font-medium">
          {regime}
        </span>

        {/* Indicador de alterações não salvas */}
        {isDirty && (
          <span className="bg-feedback-warning-bg text-feedback-warning-fg flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
            <span className="bg-feedback-warning-fg h-1.5 w-1.5 rounded-full" />
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
            className="border-border-default text-content-secondary hover:bg-surface-hover flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            title="Desfazer (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="border-border-default text-content-secondary hover:bg-surface-hover flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-30"
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
          className="text-feedback-danger-fg hover:bg-feedback-danger-bg/30 text-xs"
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
