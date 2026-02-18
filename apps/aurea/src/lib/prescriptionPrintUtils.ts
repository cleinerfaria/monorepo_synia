import {
  addDays,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  format,
  startOfDay,
  subDays,
} from 'date-fns';
import type {
  PrescriptionPrintGridSnapshot,
  PrescriptionPrintPatientSnapshot,
  PrescriptionPrintSourceItem,
  PrescriptionWeekColumn,
  PrescriptionWeekStartDay,
} from '@/types/prescriptionPrint';

const WEEK_DAYS_FULL = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
const WEEK_DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const SHIFT_ORDER = ['M', 'T', 'N'];

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
}

function parseDateInput(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseIsoDate(value);
  }
  const parsed = new Date(value);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0);
}

function formatIsoDate(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}

function parseNullableDate(value?: string | null): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseIsoDate(value);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0);
}

function parseWeekDays(values: PrescriptionPrintSourceItem['week_days']): number[] {
  if (!values) return [];
  if (Array.isArray(values)) {
    return values.map((day) => Number(day)).filter((day) => day >= 1 && day <= 7);
  }
  const raw = values.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((day) => Number(day)).filter((day) => day >= 1 && day <= 7);
    }
  } catch {
    // Fallback para formato do Postgres: {1,2,3}
  }

  return raw
    .replace(/[{}]/g, '')
    .split(',')
    .map((day) => Number(day.trim()))
    .filter((day) => day >= 1 && day <= 7);
}

function mapDateToPrescriptionWeekDay(date: Date): number {
  return date.getDay() + 1;
}

function parseTimeChecks(values: PrescriptionPrintSourceItem['time_checks']): string[] {
  if (!values) return [];
  if (Array.isArray(values)) {
    return values.map((value) => String(value).trim()).filter(Boolean);
  }
  return values
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function sortShiftChecks(values: string[]): string[] {
  const normalized = values.map((value) => value.toUpperCase());
  return SHIFT_ORDER.filter((shift) => normalized.includes(shift));
}

function convertTimeToShiftCode(time: string): string | null {
  // Normalize time to HH:MM format (remove seconds if present)
  const normalized = time.includes(':') ? time.split(':').slice(0, 2).join(':') : time;

  const timeToShift: Record<string, string> = {
    '07:00': 'M',
    '13:00': 'T',
    '19:00': 'N',
  };

  return timeToShift[normalized] || null;
}

function normalizeTimeToken(value: string): string {
  const trimmed = value.trim().toUpperCase();
  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (!timeMatch) return trimmed;

  const rawHour = Number(timeMatch[1] ?? '0');
  const minutes = timeMatch[2] ?? '00';
  const hour = String(Math.max(0, Math.min(rawHour, 24))).padStart(2, '0');

  if (minutes === '00') {
    return hour;
  }

  return `${hour}:${minutes}`;
}

function generateEveryModeChecks(item: PrescriptionPrintSourceItem): string[] {
  if (!item.interval_minutes || item.interval_minutes <= 0 || item.interval_minutes >= 1440) {
    return [];
  }
  if (!item.time_start) return [];

  const match = item.time_start.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return [];

  const baseHour = Number(match[1] ?? '0');
  const baseMinute = Number(match[2] ?? '0');
  const baseTotal = baseHour * 60 + baseMinute;
  if (baseTotal < 0 || baseTotal >= 1440) return [];

  const checks: string[] = [];
  for (let elapsed = 0; elapsed < 1440; elapsed += item.interval_minutes) {
    const total = (baseTotal + elapsed) % 1440;
    const hour = String(Math.floor(total / 60)).padStart(2, '0');
    const minute = String(total % 60).padStart(2, '0');
    checks.push(normalizeTimeToken(`${hour}:${minute}`));
  }

  return checks;
}

function isItemWithinPeriod(
  item: PrescriptionPrintSourceItem,
  periodStart: Date,
  periodEnd: Date
): boolean {
  const normalizedPeriodStart = startOfDay(periodStart);
  const normalizedPeriodEnd = startOfDay(periodEnd);
  const itemStart = parseNullableDate(item.start_date);
  const itemEnd = parseNullableDate(item.end_date);
  if (itemStart && startOfDay(itemStart) > normalizedPeriodEnd) return false;
  if (itemEnd && startOfDay(itemEnd) < normalizedPeriodStart) return false;
  return true;
}

function _isItemApplicableOnDate(item: PrescriptionPrintSourceItem, targetDate: Date): boolean {
  const targetDay = startOfDay(targetDate);
  const itemStart = parseNullableDate(item.start_date);
  const itemEnd = parseNullableDate(item.end_date);
  if (itemStart && targetDay < startOfDay(itemStart)) return false;
  if (itemEnd && targetDay > startOfDay(itemEnd)) return false;

  const weekDays = parseWeekDays(item.week_days);
  if (weekDays.length === 0) return true;
  return weekDays.includes(mapDateToPrescriptionWeekDay(targetDate));
}

function resolveTimesPerUnitLabel(timesUnit?: string | null): string {
  if (timesUnit === 'day') return 'DIA';
  if (timesUnit === 'week') return 'SEM';
  if (timesUnit === 'month') return 'MES';
  if (timesUnit === 'hour') return 'H';
  return '';
}

export function calculatePrescriptionWeekPeriod(
  referenceDate: string | Date,
  weekStartDay: PrescriptionWeekStartDay
): { periodStart: Date; periodEnd: Date } {
  const parsedReference = parseDateInput(referenceDate);
  const offset = (parsedReference.getDay() - weekStartDay + 7) % 7;
  const periodStart = subDays(parsedReference, offset);
  const periodEnd = addDays(periodStart, 6);
  return { periodStart, periodEnd };
}

export function buildPrescriptionWeekColumns(
  periodStart: Date,
  periodEnd?: Date
): PrescriptionWeekColumn[] {
  const normalizedStart = parseDateInput(periodStart);
  const normalizedEnd = periodEnd ? parseDateInput(periodEnd) : addDays(normalizedStart, 6);
  const totalDays = Math.min(14, Math.max(1, differenceInDays(normalizedEnd, normalizedStart) + 1));

  return Array.from({ length: totalDays }, (_, index) => {
    const date = addDays(normalizedStart, index);
    const weekDay = date.getDay() as PrescriptionWeekStartDay;
    return {
      date: formatIsoDate(date),
      weekDay,
      dayLabel: WEEK_DAYS_FULL[weekDay] ?? '',
      dayShortLabel: WEEK_DAYS_SHORT[weekDay] ?? '',
      dayMonthLabel: format(date, 'dd/MM'),
    };
  });
}

export function formatPrescriptionPrintFrequency(item: PrescriptionPrintSourceItem): string {
  if (item.frequency_mode === 'shift') {
    const checks = parseTimeChecks(item.time_checks);
    const shiftCodes = checks
      .map((check) => convertTimeToShiftCode(check))
      .filter((code) => code !== null) as string[];
    const shifts = sortShiftChecks(shiftCodes);
    if (shifts.length > 0) {
      return `${shifts.length}xDIA`;
    }
    return item.times_value ? `${item.times_value}xDIA` : 'DIA';
  }

  if (item.frequency_mode === 'times_per') {
    const value = item.times_value || 0;
    const unit = resolveTimesPerUnitLabel(item.times_unit);
    if (!value || !unit) return '-';
    if (unit === 'DIA') return `${value}xDIA`;
    return `${value}x/${unit}`;
  }

  if (item.frequency_mode === 'every') {
    if (item.interval_minutes && item.interval_minutes < 1440) {
      if (item.interval_minutes % 60 === 0) {
        const hours = item.interval_minutes / 60;
        return `${hours}/${hours}h`;
      }
      return `${item.interval_minutes}/${item.interval_minutes}min`;
    }

    if (item.times_value && item.times_unit) {
      const unit = resolveTimesPerUnitLabel(item.times_unit);
      if (unit) return `${item.times_value}/${item.times_value}${unit}`;
    }
  }

  return '-';
}

export function getPrescriptionGridValueForDate(
  item: PrescriptionPrintSourceItem,
  targetDate: Date
): string {
  const targetDay = startOfDay(targetDate);
  // Verificar se a medicação está dentro do período da própria prescrição
  const itemStart = parseNullableDate(item.start_date);
  const itemEnd = parseNullableDate(item.end_date);
  const isWithinDateRange =
    (!itemStart || targetDay >= startOfDay(itemStart)) &&
    (!itemEnd || targetDay <= startOfDay(itemEnd));

  // Se não está dentro do período, hachurar
  if (!isWithinDateRange) return '###HATCHED###';

  // Verificar dias da semana
  const weekDays = parseWeekDays(item.week_days);
  const isWeekDayApplicable =
    weekDays.length === 0 || weekDays.includes(mapDateToPrescriptionWeekDay(targetDate));

  // Se o dia da semana não é aplicável, hachurar
  if (!isWeekDayApplicable) return '###HATCHED###';

  // Se chegou até aqui, é um dia válido - aplicar lógica normal
  if (item.is_prn) return 'SN';

  const checks = parseTimeChecks(item.time_checks);
  if (item.frequency_mode === 'shift') {
    // Convert times to shift codes for shift mode
    const shiftCodes = checks
      .map((check) => convertTimeToShiftCode(check))
      .filter((code) => code !== null) as string[];
    const shifts = sortShiftChecks(shiftCodes);
    if (shifts.length > 0) return shifts.join(' ');
  }

  const normalizedChecks = checks.map(normalizeTimeToken);
  if (normalizedChecks.length > 0) return normalizedChecks.join(' ');

  if (item.frequency_mode === 'every') {
    const generatedChecks = generateEveryModeChecks(item);
    if (generatedChecks.length > 0) return generatedChecks.join(' ');
  }

  return '';
}

export function buildPrescriptionPrintGridSnapshot(
  item: PrescriptionPrintSourceItem,
  weekColumns: PrescriptionWeekColumn[]
): PrescriptionPrintGridSnapshot {
  return weekColumns.map((column) => {
    const targetDate = parseIsoDate(column.date);
    return {
      mark: getPrescriptionGridValueForDate(item, targetDate),
    };
  });
}

export function filterPrescriptionItemsForWeek(
  items: PrescriptionPrintSourceItem[],
  periodStart: Date,
  periodEnd: Date
): PrescriptionPrintSourceItem[] {
  return items.filter(
    (item) => item.is_active !== false && isItemWithinPeriod(item, periodStart, periodEnd)
  );
}

function resolveItemName(item: PrescriptionPrintSourceItem): string {
  if (item.item_type === 'equipment') return item.equipment?.name || 'Equipamento';
  if (item.item_type === 'procedure') return item.procedure?.name || 'Procedimento';
  return item.product?.name || 'Produto';
}

function resolveItemConcentration(item: PrescriptionPrintSourceItem): string {
  return item.product?.concentration ? `${item.product.concentration}` : '';
}

function resolveItemUnit(item: PrescriptionPrintSourceItem): string {
  return item.product?.unit_prescription?.symbol || item.product?.unit_stock?.symbol || 'UN';
}

function resolveComponentUnit(
  component: NonNullable<PrescriptionPrintSourceItem['components']>[number]
): string {
  return (
    component.product?.unit_prescription?.symbol || component.product?.unit_stock?.symbol || 'UN'
  );
}

function formatComponentSnapshotLine(
  component: NonNullable<PrescriptionPrintSourceItem['components']>[number]
): string {
  const componentName = component.product?.name || 'Componente';
  const componentConcentration = component.product?.concentration
    ? ` ${component.product.concentration}`
    : '';
  const componentQuantity =
    component.quantity != null ? ` - ${component.quantity} ${resolveComponentUnit(component)}` : '';
  return `* ${componentName}${componentConcentration}${componentQuantity}`;
}

export function formatPrescriptionItemDescriptionSnapshot(
  item: PrescriptionPrintSourceItem
): string {
  const name = resolveItemName(item);
  const concentration = resolveItemConcentration(item);
  const quantity = item.quantity != null ? ` ${item.quantity} ${resolveItemUnit(item)}` : '';
  const instructions = item.instructions_use?.trim();
  const header = `${name}${concentration ? ` ${concentration}` : ''}${quantity}`.trim();
  const headerWithInstructions = instructions ? `${header} - ${instructions}` : header;

  const componentLines = (item.components || [])
    .map((component) => formatComponentSnapshotLine(component))
    .filter(Boolean);

  if (componentLines.length === 0) {
    return headerWithInstructions;
  }

  return [headerWithInstructions, ...componentLines].join('\n');
}

export function formatPrescriptionRouteSnapshot(
  item: PrescriptionPrintSourceItem,
  routeById: Map<string, { name: string; abbreviation?: string | null }>
): string {
  if (!item.route_id) return '-';
  const route = routeById.get(item.route_id);
  if (!route) return '-';
  return route.abbreviation || route.name;
}

export function formatPrescriptionAgeLabel(
  birthDate: string | null | undefined,
  referenceDate: string | Date
): string {
  if (!birthDate) return '';

  const birth = parseNullableDate(birthDate);
  if (!birth) return '';

  const reference = parseDateInput(referenceDate);
  const years = differenceInYears(reference, birth);

  const afterLastBirthday = new Date(birth);
  afterLastBirthday.setFullYear(afterLastBirthday.getFullYear() + years);
  const months = differenceInMonths(reference, afterLastBirthday);

  const afterLastMonth = new Date(afterLastBirthday);
  afterLastMonth.setMonth(afterLastMonth.getMonth() + months);
  const days = differenceInDays(reference, afterLastMonth);

  return `${years}a ${months}m ${days}d`;
}

function resolveOperadoraName(patient: {
  billing_client?: { name?: string | null } | null;
  patient_payer?: Array<{
    is_primary?: boolean | null;
    client?: { name?: string | null } | null;
  }> | null;
}): string {
  const primaryPayer = patient.patient_payer?.find((payer) => payer?.is_primary);
  const payerName = primaryPayer?.client?.name || patient.patient_payer?.[0]?.client?.name;
  return payerName || patient.billing_client?.name || 'Nao informado';
}

export function buildPrescriptionPrintPatientSnapshot(
  prescription: {
    patient?: {
      name?: string | null;
      cpf?: string | null;
      birth_date?: string | null;
      billing_client?: { name?: string | null } | null;
      patient_payer?: Array<{
        is_primary?: boolean | null;
        client?: { name?: string | null } | null;
      }> | null;
    } | null;
  },
  referenceDate: string | Date
): PrescriptionPrintPatientSnapshot {
  const patient = prescription.patient || null;

  return {
    name: patient?.name || 'Paciente nao informado',
    operadora: patient ? resolveOperadoraName(patient) : 'Nao informado',
    birth_date: patient?.birth_date || null,
    age_label: formatPrescriptionAgeLabel(patient?.birth_date, referenceDate),
    cpf: patient?.cpf || null,
  };
}
