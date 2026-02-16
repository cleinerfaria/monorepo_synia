import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { Button, DatePicker, Modal, ModalFooter, Select } from '@/components/ui';
import { buildPrescriptionWeekColumns } from '@/lib/prescriptionPrintUtils';
import type {
  PrescriptionPrintOrientation,
  PrescriptionWeekStartDay,
} from '@/types/prescriptionPrint';

export type PrescriptionPrintAction = 'print' | 'preview' | 'download';

interface PrescriptionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (params: {
    weekStartDay: PrescriptionWeekStartDay;
    periodStart: string;
    periodEnd: string;
    action: PrescriptionPrintAction;
    orientation: PrescriptionPrintOrientation;
  }) => void;
  isGenerating?: boolean;
  generatingAction?: PrescriptionPrintAction | null;
  canPrint?: boolean;
}

const WEEK_START_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terca-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sabado' },
];

const ORIENTATION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'landscape', label: 'Paisagem' },
  { value: 'portrait', label: 'Retrato' },
];

const WEEK_DAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'] as const;

function formatIsoDate(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

function getCurrentDateOnly(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
}

function buildPeriodFromWeekStart(weekStartDay: PrescriptionWeekStartDay): {
  periodStart: string;
  periodEnd: string;
} {
  const today = getCurrentDateOnly();
  const daysUntilWeekStart = (weekStartDay - today.getDay() + 7) % 7 || 7;
  const periodStart = addDays(today, daysUntilWeekStart);
  const periodEnd = addDays(periodStart, 6);

  return {
    periodStart: formatIsoDate(periodStart),
    periodEnd: formatIsoDate(periodEnd),
  };
}

export function PrescriptionPrintModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating = false,
  canPrint = true,
}: PrescriptionPrintModalProps) {
  const defaultPeriod = useMemo(() => buildPeriodFromWeekStart(0), []);
  const [referenceDate, setReferenceDate] = useState(defaultPeriod.periodStart);
  const [weekStartDay, setWeekStartDay] = useState<PrescriptionWeekStartDay>(0);
  const [periodEndDate, setPeriodEndDate] = useState(defaultPeriod.periodEnd);
  const [orientation, setOrientation] = useState<PrescriptionPrintOrientation>('landscape');

  useEffect(() => {
    if (!isOpen) return;
    setWeekStartDay(0);
    const nextPeriod = buildPeriodFromWeekStart(0);
    setReferenceDate(nextPeriod.periodStart);
    setPeriodEndDate(nextPeriod.periodEnd);
    setOrientation('landscape');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const nextPeriod = buildPeriodFromWeekStart(weekStartDay);
    setReferenceDate(nextPeriod.periodStart);
    setPeriodEndDate(nextPeriod.periodEnd);
  }, [isOpen, weekStartDay]);

  const periodInfo = useMemo(() => {
    if (!referenceDate) return null;
    const periodStartDate = parseIsoDate(referenceDate);
    const weekStartIso = formatIsoDate(periodStartDate);
    const maxPeriodEndIso = formatIsoDate(addDays(periodStartDate, 13));
    const requestedPeriodEnd = periodEndDate.trim();
    const clampedPeriodEnd = requestedPeriodEnd
      ? [requestedPeriodEnd, maxPeriodEndIso].sort()[0]
      : '';
    const effectivePeriodEnd = clampedPeriodEnd < weekStartIso ? weekStartIso : clampedPeriodEnd;
    const calendarPeriodEnd = effectivePeriodEnd || weekStartIso;
    const weekColumns = buildPrescriptionWeekColumns(
      periodStartDate,
      parseIsoDate(calendarPeriodEnd)
    );
    const periodColumns = weekColumns.filter(
      (column) => column.date >= weekStartIso && column.date <= calendarPeriodEnd
    );

    return {
      periodStart: weekStartIso,
      periodEnd: effectivePeriodEnd,
      periodEndMax: maxPeriodEndIso,
      periodStartLabel: periodColumns[0]?.dayMonthLabel || '',
      periodEndLabel: effectivePeriodEnd
        ? periodColumns[periodColumns.length - 1]?.dayMonthLabel || ''
        : '',
      days: periodColumns.map((column) => ({
        id: `${column.date}-${column.weekDay}`,
        weekDay: column.weekDay,
        dayShortLabel: column.dayShortLabel,
        dayMonthLabel: column.dayMonthLabel,
      })),
    };
  }, [referenceDate, periodEndDate]);

  const calendarRows = useMemo(() => {
    if (!periodInfo?.days.length) return [];

    if (periodInfo.days.length === 7 && periodInfo.days[0].weekDay === 1) {
      type CalendarCell = (typeof periodInfo.days)[number] | null;
      const firstRow: CalendarCell[] = Array.from({ length: 7 }, () => null);
      const secondRow: CalendarCell[] = Array.from({ length: 7 }, () => null);

      for (let index = 0; index < 5; index += 1) {
        firstRow[index + 1] = periodInfo.days[index] || null;
      }

      secondRow[6] = periodInfo.days[5] || null;
      secondRow[0] = periodInfo.days[6] || null;

      return [firstRow, secondRow];
    }

    const leadingCells = Array.from({ length: periodInfo.days[0].weekDay }, () => null);
    const cells = [...leadingCells, ...periodInfo.days];
    const trailingCount = (7 - (cells.length % 7)) % 7;
    const trailingCells = Array.from({ length: trailingCount }, () => null);
    const normalizedCells = [...cells, ...trailingCells];

    return Array.from({ length: normalizedCells.length / 7 }, (_, rowIndex) =>
      normalizedCells.slice(rowIndex * 7, rowIndex * 7 + 7)
    );
  }, [periodInfo]);

  useEffect(() => {
    if (!periodInfo) return;
    if (!periodEndDate) return;
    if (periodEndDate !== periodInfo.periodEnd) {
      setPeriodEndDate(periodInfo.periodEnd);
    }
  }, [periodInfo, periodEndDate]);

  const handleGenerate = (action: PrescriptionPrintAction) => {
    if (!periodInfo || !canPrint || !periodInfo.periodEnd) return;
    onGenerate({
      weekStartDay,
      periodStart: periodInfo.periodStart,
      periodEnd: periodInfo.periodEnd,
      action,
      orientation,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Imprimir PrescriÃ§Ã£o"
      description="Escolha perÃ­odo de 1 a 14 dias e a orientaÃ§Ã£o da pÃ¡gina."
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Select
            label="Dia inicial da semana"
            value={String(weekStartDay)}
            options={WEEK_START_OPTIONS}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setWeekStartDay(Number(event.target.value) as PrescriptionWeekStartDay)
            }
          />
          <DatePicker
            label="Data inicial"
            value={referenceDate}
            displayMode="compact"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setReferenceDate(event.target.value)
            }
          />
          <DatePicker
            label="Data final"
            value={periodEndDate}
            min={periodInfo?.periodStart}
            max={periodInfo?.periodEndMax}
            displayMode="compact"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setPeriodEndDate(event.target.value)
            }
          />
          <Select
            label="OrientaÃ§Ã£o"
            value={orientation}
            options={ORIENTATION_OPTIONS}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setOrientation(event.target.value as PrescriptionPrintOrientation)
            }
          />
        </div>

        <div className="border-border bg-surface-elevated/80 shadow-soft rounded-2xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-content-primary text-sm font-semibold">Intervalo calculado</p>
            <span className="border-primary-500/30 bg-primary-500/10 text-primary-700 dark:text-primary-300 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium">
              {periodInfo?.periodStartLabel || '--'} a {periodInfo?.periodEndLabel || '--'}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-7 gap-2">
              {WEEK_DAY_HEADERS.map((dayHeader) => (
                <span
                  key={dayHeader}
                  className="text-content-muted text-center text-[11px] font-semibold uppercase tracking-wide"
                >
                  {dayHeader}
                </span>
              ))}
            </div>
            {calendarRows.length ? (
              <div className="space-y-2">
                {calendarRows.map((row, rowIndex) => (
                  <div key={`week-row-${rowIndex}`} className="grid grid-cols-7 gap-2">
                    {row.map((day, columnIndex) =>
                      day ? (
                        <span
                          key={day.id}
                          className="border-border bg-surface-card text-content-secondary inline-flex min-h-11 items-center justify-center rounded-lg border px-2 py-1 text-center text-xs"
                        >
                          <span className="font-semibold">{day.dayMonthLabel}</span>
                        </span>
                      ) : (
                        <span
                          key={`empty-${rowIndex}-${columnIndex}`}
                          aria-hidden
                          className="border-border/60 bg-surface-card/40 min-h-11 rounded-lg border border-dashed"
                        />
                      )
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-content-muted text-xs">Sem dias calculados.</span>
            )}
          </div>
          {!canPrint && (
            <p className="text-feedback-danger-fg mt-3 text-sm">
              Seu perfil nÃ£o possui permissÃ£o para imprimir prescriÃ§Ãµes.
            </p>
          )}
        </div>
      </div>

      <ModalFooter>
        <Button
          variant="neutral"
          onClick={onClose}
          label="Cancelar"
          size="md"
          showIcon={false}
        ></Button>
        <Button
          variant="neutral"
          label="Visualizar"
          size="md"
          showIcon={false}
          onClick={() => handleGenerate('preview')}
          disabled={!canPrint || isGenerating || !periodInfo?.periodEnd}
        >
          Visualizar
        </Button>
        <Button
          label="Imprimir"
          size="md"
          showIcon={false}
          onClick={() => handleGenerate('download')}
          disabled={!canPrint || isGenerating || !periodInfo?.periodEnd}
        >
          Imprimir
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default PrescriptionPrintModal;
