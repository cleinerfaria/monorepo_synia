// =====================================================
// Escala Mensal Visual do Paciente — Types
// =====================================================

/** Tipo de slot de plantão */
export type SlotType = '24h' | '12h_day' | '12h_night' | '8h_morning' | '8h_afternoon' | '8h_night';

/** Configuração de regime de horas */
export type ScheduleRegime = '24h' | '12h' | '8h';

/** Dados do profissional na escala (leve) */
export interface ScheduleProfessional {
  id: string;
  name: string;
  role: string | null;
  active: boolean;
  email: string | null;
  phone: string | null;
  color: string | null;
  is_substitute: boolean; // folguista/curinga
}

/** Uma atribuição de slot — profissional atribuído a um dia+slot */
export interface ScheduleAssignment {
  id?: string;
  date: string; // YYYY-MM-DD
  slot: SlotType;
  professional_id: string;
  start_at?: string; // ISO 8601 timestamp (opcional)
  end_at?: string; // ISO 8601 timestamp (opcional)
}

/** Escala mensal carregada do backend */
export interface PatientMonthSchedule {
  patient_id: string;
  year: number;
  month: number; // 1-12
  regime: ScheduleRegime;
  assignments: ScheduleAssignment[];
}

/** Payload para upsert de escala */
export interface UpsertSchedulePayload {
  patient_id: string;
  year: number;
  month: number;
  assignments: Array<{
    date: string;
    slot: SlotType;
    professional_id: string;
  }>;
}

/** Payload de swap */
export interface SwapAssignmentPayload {
  patient_id: string;
  date_a: string;
  date_b: string;
  slot: SlotType;
}

// =====================================================
// Estado da grade (draft local)
// =====================================================

/** Mapa: "YYYY-MM-DD::slot" → professional_id */
export type AssignmentMap = Map<string, string[]>; // Múltiplos profissionais por slot
export type ScheduleAssignmentDataMap = Map<string, ScheduleAssignment[]>; // Múltiplos dados

/** Gerar chave de referência para o mapa */
export function assignmentKey(date: string, slot: SlotType): string {
  return `${date}::${slot}`;
}

/** Extrair date e slot a partir da chave */
export function parseAssignmentKey(key: string): { date: string; slot: SlotType } {
  const [date, slot] = key.split('::');
  return { date, slot: slot as SlotType };
}

// =====================================================
// Auto-preenchimento
// =====================================================

/** Configuração de auto-preenchimento */
export interface AutoFillConfig {
  /** IDs dos profissionais na rotação (ordem importa) */
  rotation: string[];
  /** ID do folguista/curinga (cobre folgas da rotação) */
  substituteId: string | null;
  /** Padrão semanal: quantos dias seguidos cada profissional fica antes de trocar */
  daysPerProfessional: number;
  /** Dias da semana para incluir (0=Dom, 1=Seg, ..., 6=Sab). Default: todos */
  weekdays: number[];
}

// =====================================================
// Seleção e lote
// =====================================================

export type BatchSelectionPreset =
  | 'weekdays'
  | 'saturdays'
  | 'sundays'
  | 'even_days'
  | 'odd_days'
  | 'full_week'
  | 'full_month';

// =====================================================
// Ações de histórico (undo/redo)
// =====================================================

export interface ScheduleHistoryEntry {
  /** Snapshot do mapa inteiro */
  assignments: Record<string, string[]>;
  /** Descrição legível */
  label: string;
}

// =====================================================
// Resumo do mês
// =====================================================

export interface MonthSummary {
  professionalId: string;
  professionalName: string;
  totalDays: number;
  color: string | null;
}

// =====================================================
// Erros esperados do backend
// =====================================================

export type ScheduleApiError = 'NOT_AUTHORIZED' | 'VALIDATION_ERROR' | 'CONFLICT';

// =====================================================
// Slots por regime
// =====================================================

export const SLOTS_BY_REGIME: Record<ScheduleRegime, SlotType[]> = {
  '24h': ['24h'],
  '12h': ['12h_day', '12h_night'],
  '8h': ['8h_morning', '8h_afternoon', '8h_night'],
};

export const SLOT_LABELS: Record<SlotType, string> = {
  '24h': '24h',
  '12h_day': 'Diurno',
  '12h_night': 'Noturno',
  '8h_morning': 'Manhã',
  '8h_afternoon': 'Tarde',
  '8h_night': 'Noite',
};

/**
 * Calcular horários para um slot baseado no regime e hora do dia.
 * Retorna { start, end } em formato ISO 8601
 */
export function getSlotTimes(slot: SlotType, date: string): { start: string; end: string } {
  const dayStr = date; // YYYY-MM-DD
  const d = new Date(date + 'T00:00:00Z');
  const nextDay = new Date(d.getTime() + 86400000);
  const nextDayStr = nextDay.toISOString().split('T')[0];

  switch (slot) {
    case '24h':
      return { start: `${dayStr}T00:00:00Z`, end: `${nextDayStr}T00:00:00Z` };
    case '12h_day':
      return { start: `${dayStr}T07:00:00Z`, end: `${dayStr}T19:00:00Z` };
    case '12h_night':
      return { start: `${dayStr}T19:00:00Z`, end: `${nextDayStr}T07:00:00Z` };
    case '8h_morning':
      return { start: `${dayStr}T07:00:00Z`, end: `${dayStr}T15:00:00Z` };
    case '8h_afternoon':
      return { start: `${dayStr}T15:00:00Z`, end: `${dayStr}T23:00:00Z` };
    case '8h_night':
      return { start: `${dayStr}T23:00:00Z`, end: `${nextDayStr}T07:00:00Z` };
  }
}
