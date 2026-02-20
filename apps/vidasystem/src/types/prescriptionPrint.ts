export type PrescriptionWeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type PrescriptionPrintOrientation = 'portrait' | 'landscape';

export interface PrescriptionWeekColumn {
  date: string;
  dayLabel: string;
  dayShortLabel: string;
  dayMonthLabel: string;
  weekDay: PrescriptionWeekStartDay;
}

export interface PrescriptionPrintGridCell {
  mark: string;
}

export type PrescriptionPrintGridSnapshot = PrescriptionPrintGridCell[];

export interface PrescriptionPrintItemSnapshotPayload {
  source_prescription_item_id: string | null;
  order_index: number;
  description_snapshot: string;
  route_snapshot: string;
  frequency_snapshot: string;
  grid_snapshot: PrescriptionPrintGridSnapshot;
}

export interface PrescriptionPrintPatientSnapshot {
  name: string;
  operadora: string;
  birth_date: string | null;
  age_label: string;
  cpf: string | null;
}

export interface PrescriptionPrintSnapshot {
  id: string;
  prescription_id: string;
  print_number: string;
  period_start: string;
  period_end: string;
  week_start_day: PrescriptionWeekStartDay;
  patient_snapshot: PrescriptionPrintPatientSnapshot;
  notes_snapshot: string | null;
  metadata_snapshot: {
    professional_name?: string | null;
    professional_title?: string | null;
    professional_council?: string | null;
    professional_signature_path?: string | null;
    period_label?: string | null;
    page_orientation?: PrescriptionPrintOrientation | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
  created_by: string;
  created_by_name: string | null;
  items: Array<{
    id: string;
    source_prescription_item_id: string | null;
    order_index: number;
    description_snapshot: string;
    route_snapshot: string | null;
    frequency_snapshot: string | null;
    grid_snapshot: PrescriptionPrintGridSnapshot;
    created_at: string;
  }>;
}

export interface PrescriptionPrintHistoryItem {
  id: string;
  print_number: string;
  period_start: string;
  period_end: string;
  week_start_day: PrescriptionWeekStartDay;
  created_at: string;
  created_by: string;
  created_by_name: string | null;
}

export interface PrescriptionPrintSourceItem {
  id: string;
  item_type: 'medication' | 'material' | 'diet' | 'procedure' | 'equipment';
  product_id?: string | null;
  equipment_id?: string | null;
  procedure_id?: string | null;
  quantity?: number | null;
  frequency_mode?: 'every' | 'times_per' | 'shift' | null;
  times_value?: number | null;
  times_unit?: 'day' | 'week' | 'month' | 'hour' | null;
  interval_minutes?: number | null;
  time_start?: string | null;
  time_checks?: string[] | string | null;
  week_days?: number[] | string | null;
  route_id?: string | null;
  is_prn?: boolean | null;
  is_active?: boolean | null;
  start_date?: string | null;
  end_date?: string | null;
  instructions_use?: string | null;
  components?: Array<{
    quantity?: number | null;
    product?: {
      name?: string | null;
      concentration?: string | null;
      unit_stock?: { symbol?: string | null } | null;
      unit_prescription?: { symbol?: string | null } | null;
    } | null;
  }> | null;
  product?: {
    name: string;
    concentration?: string | null;
    unit_stock?: { symbol?: string | null } | null;
    unit_prescription?: { symbol?: string | null } | null;
  } | null;
  equipment?: {
    name: string;
  } | null;
  procedure?: {
    name: string;
  } | null;
}
