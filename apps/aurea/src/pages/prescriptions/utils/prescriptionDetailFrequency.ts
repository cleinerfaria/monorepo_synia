import { differenceInCalendarDays, parse } from 'date-fns'

export const ALL_WEEK_DAYS: number[] = [1, 2, 3, 4, 5, 6, 7]
export const SHIFT_ORDER = ['M', 'T', 'N'] as const

export function parseDateOnly(value: string): Date {
  return parse(value, 'yyyy-MM-dd', new Date())
}

export function calculateInclusiveDays(startDate: string, endDate: string): number {
  const totalDays = differenceInCalendarDays(parseDateOnly(endDate), parseDateOnly(startDate)) + 1
  return totalDays > 0 ? totalDays : 0
}

export function normalizeTimeValue(value?: string | null): string {
  return value ? value.slice(0, 5) : ''
}

export function parseTimeChecks(value?: string | string[] | null): string[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.map((item) => normalizeTimeValue(item.trim())).filter(Boolean)
  }

  return value
    .split(',')
    .map((item) => normalizeTimeValue(item.trim()))
    .filter(Boolean)
}

export function parseShiftCodes(value?: string | string[] | null): string[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.map((item) => item.trim().toUpperCase()).filter(Boolean)
  }

  return value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item === 'M' || item === 'T' || item === 'N')
}

export function parseWeekDays(value: unknown): number[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isFinite(item))
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => Number(item)).filter((item) => Number.isFinite(item))
      }
    } catch {
      // fallback for formats like "{1,2,3}"
    }
    return trimmed
      .replace(/[{}]/g, '')
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item))
  }

  return []
}

export function formatTimeChecks(values: string[]): string[] | null {
  const cleaned = values.map((item) => item.trim()).filter(Boolean)
  return cleaned.length > 0 ? cleaned : null
}

export function formatShiftChecks(values: string[]): string[] | null {
  const cleaned = values.map((item) => item.trim().toUpperCase()).filter(Boolean)
  return cleaned.length > 0 ? cleaned : null
}

export function sortWeekDays(values: number[]): number[] {
  return [...values].sort((a, b) => a - b)
}

export function sortShifts(values: string[]): string[] {
  return SHIFT_ORDER.filter((shift) => values.includes(shift))
}
