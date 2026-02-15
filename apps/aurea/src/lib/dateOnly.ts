import { format, isValid, parse } from 'date-fns';
import type { FormatOptions } from 'date-fns';

const DATE_ONLY_REGEX = /^(\d{4}-\d{2}-\d{2})/;

function extractDateOnly(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(DATE_ONLY_REGEX);
  return match ? match[1] : trimmed;
}

export function parseDateOnly(value: string): Date {
  return parse(extractDateOnly(value), 'yyyy-MM-dd', new Date());
}

export function parseDateOnlyOrNull(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = parseDateOnly(value);
  return isValid(parsed) ? parsed : null;
}

export function formatDateOnly(
  value: string | null | undefined,
  outputPattern: string = 'dd/MM/yyyy',
  options?: FormatOptions
): string {
  const parsed = parseDateOnlyOrNull(value);
  if (!parsed) return '';
  return format(parsed, outputPattern, options);
}

export function todayDateOnly(): string {
  return format(new Date(), 'yyyy-MM-dd');
}
