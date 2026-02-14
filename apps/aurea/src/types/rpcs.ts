import type { PrescriptionPrintSnapshot, PrescriptionWeekStartDay } from '@/types/prescriptionPrint'

export interface ListPrescriptionPrintsRow {
  id: string
  print_number: string
  period_start: string
  period_end: string
  week_start_day: PrescriptionWeekStartDay
  created_at: string
  created_by: string
  created_by_name: string | null
}

export interface CreateOrUpsertPrescriptionResult {
  prescription_id: string
  upserted: boolean
}

export type GetPrescriptionPrintSnapshotResult = PrescriptionPrintSnapshot
