// =====================================================
// Escala Mensal Visual do Paciente — Types
// =====================================================

/** Tipo de slot de plantao (usado como template para auto-preenchimento) */
export type SlotType = '24h' | '12h_day' | '12h_night' | '8h_morning' | '8h_afternoon' | '8h_night';

/** Configuracao de regime de horas */
export type ScheduleRegime = '24h' | '12h' | '8h';

/** Dados do profissional na escala (leve) */
export interface ScheduleProfessional {
  id: string;
  name: string;
  social_name: string | null;
  role: string | null;
  profession_code?: string | null;
  active: boolean;
  email: string | null;
  phone: string | null;
  color: string | null;
  is_substitute: boolean;
}

/** Uma atribuicao de plantao — profissional atribuido a um dia com horarios */
export interface ScheduleAssignment {
  id?: string;
  date: string; // YYYY-MM-DD
  professional_id: string;
  start_at: string; // ISO 8601 timestamp (obrigatorio)
  end_at: string; // ISO 8601 timestamp (obrigatorio)
}

/** Escala mensal carregada do backend */
export interface PatientMonthSchedule {
  patient_id: string;
  pad_id: string | null; // pad.id ativo
  pad_item_id: string | null; // pad_items.id (tipo shift) ativo
  start_date: string | null; // YYYY-MM-DD do PAD ativo (limite minimo editavel)
  year: number;
  month: number; // 1-12
  regime: ScheduleRegime;
  start_time: string; // HH:MM — horario inicial do plantao (ex: "07:00")
  assignments: ScheduleAssignment[];
}

/** Payload para upsert de escala */
export interface UpsertSchedulePayload {
  patient_id: string;
  pad_item_id: string; // pad_items.id (tipo shift) — obrigatorio
  year: number;
  month: number;
  assignments: Array<{
    date: string;
    professional_id: string;
    start_at: string;
    end_at: string;
  }>;
}

/** Payload de swap */
export interface SwapAssignmentPayload {
  patient_id: string;
  date_a: string;
  date_b: string;
  index_a: number;
  index_b: number;
}

// =====================================================
// Estado da grade (draft local)
// =====================================================

/** Mapa: "YYYY-MM-DD" → ScheduleAssignment[] */
export type DayAssignmentsMap = Map<string, ScheduleAssignment[]>;

// =====================================================
// Auto-preenchimento
// =====================================================

/** Configuracao de auto-preenchimento */
export interface AutoFillConfig {
  /** IDs dos profissionais na rotacao (ordem importa) */
  rotation: string[];
  /** ID do folguista/curinga (cobre folgas da rotacao) */
  substituteId: string | null;
  /** Tipo de turno aplicado no auto-preenchimento */
  shiftType: '24h' | '12h_day' | '12h_night';
  /** Padrao semanal: quantos dias seguidos cada profissional fica antes de trocar */
  daysPerProfessional: number;
  /** Dias da semana para incluir (0=Dom, 1=Seg, ..., 6=Sab). Default: todos */
  weekdays: number[];
}

// =====================================================
// Selecao e lote
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
// Acoes de historico (undo/redo)
// =====================================================

export interface ScheduleHistoryEntry {
  /** Snapshot do mapa inteiro */
  assignments: Record<string, ScheduleAssignment[]>;
  /** Descricao legivel */
  label: string;
}

// =====================================================
// Resumo do mes
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
// Slots por regime (usados como template)
// =====================================================

/** Retorna o maximo de horas por dia baseado no regime */
export function getRegimeMaxHours(regime: ScheduleRegime): number {
  switch (regime) {
    case '24h':
      return 24;
    case '12h':
      return 24;
    case '8h':
      return 24;
  }
}

export const SLOTS_BY_REGIME: Record<ScheduleRegime, SlotType[]> = {
  '24h': ['24h'],
  '12h': ['12h_day', '12h_night'],
  '8h': ['8h_morning', '8h_afternoon', '8h_night'],
};

export const SLOT_LABELS: Record<SlotType, string> = {
  '24h': '24h',
  '12h_day': 'Diurno',
  '12h_night': 'Noturno',
  '8h_morning': 'Manha',
  '8h_afternoon': 'Tarde',
  '8h_night': 'Noite',
};

/**
 * Gerar horarios para um slot baseado no regime e hora inicial configurada.
 * Retorna { start, end } em formato ISO 8601
 */
export function getSlotTimes(
  slot: SlotType,
  date: string,
  startTime = '07:00'
): { start: string; end: string } {
  const dayStr = date;
  const [startHour, startMin] = startTime.split(':').map(Number);

  function makeTimestamp(dayOffset: number, hour: number, minute: number): string {
    const d = new Date(`${dayStr}T00:00:00`);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  }

  switch (slot) {
    case '24h':
      return {
        start: makeTimestamp(0, startHour, startMin),
        end: makeTimestamp(1, startHour, startMin),
      };
    case '12h_day':
      return {
        start: makeTimestamp(0, startHour, startMin),
        end: makeTimestamp(0, startHour + 12, startMin),
      };
    case '12h_night':
      return {
        start: makeTimestamp(0, startHour + 12, startMin),
        end: makeTimestamp(1, startHour, startMin),
      };
    case '8h_morning':
      return {
        start: makeTimestamp(0, startHour, startMin),
        end: makeTimestamp(0, startHour + 8, startMin),
      };
    case '8h_afternoon':
      return {
        start: makeTimestamp(0, startHour + 8, startMin),
        end: makeTimestamp(0, startHour + 16, startMin),
      };
    case '8h_night':
      return {
        start: makeTimestamp(0, startHour + 16, startMin),
        end: makeTimestamp(1, startHour, startMin),
      };
  }
}

/**
 * Gerar assignments padrao para um dia baseado no regime.
 * Retorna array de assignments sem professional_id preenchido.
 */
export function generateDefaultSlots(
  date: string,
  regime: ScheduleRegime,
  startTime = '07:00'
): Array<{ start_at: string; end_at: string }> {
  const slots = SLOTS_BY_REGIME[regime];
  return slots.map((slot) => {
    const { start, end } = getSlotTimes(slot, date, startTime);
    return { start_at: start, end_at: end };
  });
}
