import { create } from 'zustand';
import type {
  SlotType,
  ScheduleRegime,
  ScheduleAssignment,
  ScheduleHistoryEntry,
  AutoFillConfig,
  BatchSelectionPreset,
  AssignmentMap,
  ScheduleAssignmentDataMap,
} from '@/types/schedule';
import { assignmentKey, parseAssignmentKey, SLOTS_BY_REGIME } from '@/types/schedule';

// =====================================================
// Helpers
// =====================================================

function mapToRecord(map: AssignmentMap): Record<string, string[]> {
  const record: Record<string, string[]> = {};
  map.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function recordToMap(record: Record<string, string[]>): AssignmentMap {
  return new Map(Object.entries(record));
}

function cloneMap(map: AssignmentMap): AssignmentMap {
  const newMap: AssignmentMap = new Map();
  map.forEach((value, key) => {
    newMap.set(key, [...value]); // Clone o array também
  });
  return newMap;
}

/** Gerar todos os dias de um mês: YYYY-MM-DD[] */
function getDaysInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push(`${yyyy}-${mm}-${dd}`);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay();
}

// =====================================================
// Store
// =====================================================

interface ScheduleStoreState {
  // Contexto
  patientId: string | null;
  year: number;
  month: number;
  regime: ScheduleRegime;

  // Draft
  assignments: AssignmentMap;
  originalAssignments: AssignmentMap;
  assignmentsData: ScheduleAssignmentDataMap; // Dados completos com horas
  isDirty: boolean;

  // Seleção
  selectedDates: Set<string>;

  // Histórico undo/redo
  history: ScheduleHistoryEntry[];
  historyIndex: number;

  // UI
  isSidebarOpen: boolean;
  isSaving: boolean;
}

interface ScheduleStoreActions {
  // Init
  initialize(
    patientId: string,
    year: number,
    month: number,
    regime: ScheduleRegime,
    serverAssignments: ScheduleAssignment[]
  ): void;
  setMonth(year: number, month: number): void;

  // Atribuições
  assignProfessional(date: string, slot: SlotType, professionalId: string): void;
  removeProfessional(date: string, slot: SlotType): void;
  moveProfessional(fromDate: string, toDate: string, slot: SlotType): void;
  copyProfessional(fromDate: string, toDate: string, slot: SlotType): void;
  swapProfessionals(dateA: string, dateB: string, slot: SlotType): void;

  // Lote
  toggleDateSelection(date: string): void;
  selectDateRange(dates: string[]): void;
  clearSelection(): void;
  applyBatchPreset(preset: BatchSelectionPreset): void;
  applyBatchAssignment(professionalId: string, slot: SlotType): void;

  // Auto-preencher
  generateAutoFillPreview(config: AutoFillConfig): AssignmentMap;
  applyAutoFill(preview: AssignmentMap): void;

  // Semana
  duplicateWeek(sourceWeekStart: string): void;

  // Clear
  clearMonth(): void;

  // Undo/Redo
  undo(): void;
  redo(): void;

  // Salvar
  getDiff(): ScheduleAssignment[];
  getFullAssignments(): ScheduleAssignment[];
  markSaved(): void;

  // UI
  toggleSidebar(): void;
  setSaving(saving: boolean): void;
}

export type ScheduleStore = ScheduleStoreState & ScheduleStoreActions;

const MAX_HISTORY = 50;

export const useScheduleStore = create<ScheduleStore>((set, get) => {
  // Helper: push snapshot to undo history
  function pushHistory(label: string) {
    const state = get();
    const newEntry: ScheduleHistoryEntry = {
      assignments: mapToRecord(state.assignments),
      label,
    };

    // Drop future entries after current index
    const trimmedHistory = state.history.slice(0, state.historyIndex + 1);
    const newHistory = [...trimmedHistory, newEntry].slice(-MAX_HISTORY);

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  }

  function markDirty() {
    const state = get();
    const original = state.originalAssignments;
    const current = state.assignments;
    let dirty = false;

    // Compare sizes
    if (original.size !== current.size) {
      dirty = true;
    } else {
      for (const [key, value] of current) {
        const origValue = original.get(key);
        if (!origValue || origValue.length !== value.length) {
          dirty = true;
          break;
        }
        // Comparar arrays
        for (let i = 0; i < value.length; i++) {
          if (origValue[i] !== value[i]) {
            dirty = true;
            break;
          }
        }
        if (dirty) break;
      }
    }

    set({ isDirty: dirty });
  }

  return {
    // State
    patientId: null,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    regime: '24h',
    assignments: new Map(),
    originalAssignments: new Map(),
    assignmentsData: new Map(),
    isDirty: false,
    selectedDates: new Set(),
    history: [],
    historyIndex: -1,
    isSidebarOpen: false,
    isSaving: false,

    // ===== Init =====
    initialize(patientId, year, month, regime, serverAssignments) {
      const map: AssignmentMap = new Map();
      const dataMap: ScheduleAssignmentDataMap = new Map();

      for (const a of serverAssignments) {
        const key = assignmentKey(a.date, a.slot);

        // Adicionar ao array (múltiplos profissionais por slot)
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(a.professional_id);

        // Adicionar dados
        if (!dataMap.has(key)) {
          dataMap.set(key, []);
        }
        dataMap.get(key)!.push(a);
      }

      const record = mapToRecord(map);
      set({
        patientId,
        year,
        month,
        regime,
        assignments: cloneMap(map),
        originalAssignments: cloneMap(map),
        assignmentsData: new Map(dataMap),
        isDirty: false,
        selectedDates: new Set(),
        history: [{ assignments: record, label: 'Estado inicial' }],
        historyIndex: 0,
      });
    },

    setMonth(year, month) {
      set({ year, month, selectedDates: new Set() });
    },

    // ===== Atribuições =====
    assignProfessional(date, slot, professionalId) {
      const state = get();
      const newMap = cloneMap(state.assignments);
      const key = assignmentKey(date, slot);

      if (!newMap.has(key)) {
        newMap.set(key, []);
      }

      // Adicionar ao array (não replace)
      const profIds = newMap.get(key)!;
      if (!profIds.includes(professionalId)) {
        profIds.push(professionalId);
      }

      set({ assignments: newMap });
      pushHistory(`Atribuir profissional em ${date}`);
      markDirty();
    },

    removeProfessional(date, slot) {
      const state = get();
      const newMap = cloneMap(state.assignments);
      const key = assignmentKey(date, slot);

      if (newMap.has(key)) {
        const profIds = newMap.get(key)!;
        // Remover o primeiro (ou último?)
        profIds.shift();

        // Se ficou vazio, remover a chave
        if (profIds.length === 0) {
          newMap.delete(key);
        }

        set({ assignments: newMap });
        pushHistory(`Remover profissional de ${date}`);
        markDirty();
      }
    },

    moveProfessional(fromDate, toDate, slot) {
      const state = get();
      const newMap = cloneMap(state.assignments);
      const fromKey = assignmentKey(fromDate, slot);
      const toKey = assignmentKey(toDate, slot);
      const profIds = newMap.get(fromKey);
      if (profIds) {
        newMap.delete(fromKey);
        newMap.set(toKey, profIds);
        set({ assignments: newMap });
        pushHistory(`Mover de ${fromDate} para ${toDate}`);
        markDirty();
      }
    },

    copyProfessional(fromDate, toDate, slot) {
      const state = get();
      const newMap = cloneMap(state.assignments);
      const fromKey = assignmentKey(fromDate, slot);
      const toKey = assignmentKey(toDate, slot);
      const profIds = newMap.get(fromKey);
      if (profIds) {
        newMap.set(toKey, profIds);
        set({ assignments: newMap });
        pushHistory(`Copiar de ${fromDate} para ${toDate}`);
        markDirty();
      }
    },

    swapProfessionals(dateA, dateB, slot) {
      const state = get();
      const newMap = cloneMap(state.assignments);
      const keyA = assignmentKey(dateA, slot);
      const keyB = assignmentKey(dateB, slot);
      const profIdsA = newMap.get(keyA);
      const profIdsB = newMap.get(keyB);

      if (profIdsA) newMap.set(keyB, profIdsA);
      else newMap.delete(keyB);

      if (profIdsB) newMap.set(keyA, profIdsB);
      else newMap.delete(keyA);

      set({ assignments: newMap });
      pushHistory(`Trocar ${dateA} ↔ ${dateB}`);
      markDirty();
    },

    // ===== Seleção =====
    toggleDateSelection(date) {
      const state = get();
      const newSet = new Set(state.selectedDates);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      set({ selectedDates: newSet });
    },

    selectDateRange(dates) {
      set({ selectedDates: new Set(dates) });
    },

    clearSelection() {
      set({ selectedDates: new Set() });
    },

    applyBatchPreset(preset) {
      const state = get();
      const days = getDaysInMonth(state.year, state.month);
      let selected: string[] = [];

      switch (preset) {
        case 'weekdays':
          selected = days.filter((d) => {
            const dow = getDayOfWeek(d);
            return dow >= 1 && dow <= 5;
          });
          break;
        case 'saturdays':
          selected = days.filter((d) => getDayOfWeek(d) === 6);
          break;
        case 'sundays':
          selected = days.filter((d) => getDayOfWeek(d) === 0);
          break;
        case 'even_days':
          selected = days.filter((d) => {
            const day = parseInt(d.slice(8, 10), 10);
            return day % 2 === 0;
          });
          break;
        case 'odd_days':
          selected = days.filter((d) => {
            const day = parseInt(d.slice(8, 10), 10);
            return day % 2 !== 0;
          });
          break;
        case 'full_week': {
          // current week based on first selected date or today (starting on Sunday)
          const refDate =
            state.selectedDates.size > 0
              ? [...state.selectedDates][0]
              : new Date().toISOString().slice(0, 10);
          const ref = new Date(refDate + 'T12:00:00');
          const dow = ref.getDay();
          const sunday = new Date(ref);
          sunday.setDate(ref.getDate() - dow);
          for (let i = 0; i < 7; i++) {
            const d = new Date(sunday);
            d.setDate(sunday.getDate() + i);
            const formatted = d.toISOString().slice(0, 10);
            if (days.includes(formatted)) selected.push(formatted);
          }
          break;
        }
        case 'full_month':
          selected = days;
          break;
      }

      set({ selectedDates: new Set(selected) });
    },

    applyBatchAssignment(professionalId, slot) {
      const state = get();
      if (state.selectedDates.size === 0) return;

      const newMap = cloneMap(state.assignments);
      for (const date of state.selectedDates) {
        newMap.set(assignmentKey(date, slot), [professionalId]);
      }

      set({ assignments: newMap, selectedDates: new Set() });
      pushHistory(`Lote: ${state.selectedDates.size} dias`);
      markDirty();
    },

    // ===== Auto-preencher =====
    generateAutoFillPreview(config) {
      const state = get();
      const days = getDaysInMonth(state.year, state.month);
      const slots = SLOTS_BY_REGIME[state.regime];
      const preview: AssignmentMap = cloneMap(state.assignments);

      if (config.rotation.length === 0) return preview;

      const filteredDays = days.filter((d) => {
        const dow = getDayOfWeek(d);
        return config.weekdays.includes(dow);
      });

      let professionalIndex = 0;
      let daysCount = 0;

      for (const day of filteredDays) {
        for (const slot of slots) {
          const currentProfId = config.rotation[professionalIndex % config.rotation.length];
          preview.set(assignmentKey(day, slot), [currentProfId]);
        }

        daysCount++;
        if (daysCount >= config.daysPerProfessional) {
          daysCount = 0;
          professionalIndex++;
        }
      }

      return preview;
    },

    applyAutoFill(preview) {
      set({ assignments: preview });
      pushHistory('Auto-preencher aplicado');
      markDirty();
    },

    // ===== Duplicar semana =====
    duplicateWeek(sourceWeekStart) {
      const state = get();
      const days = getDaysInMonth(state.year, state.month);
      const slots = SLOTS_BY_REGIME[state.regime];
      const newMap = cloneMap(state.assignments);

      // Encontrar os 7 dias da semana fonte
      const startIdx = days.indexOf(sourceWeekStart);
      if (startIdx < 0) return;

      const sourceDays = days.slice(startIdx, startIdx + 7);

      // Aplicar para as semanas seguintes
      let targetStart = startIdx + 7;
      while (targetStart < days.length) {
        const targetDays = days.slice(targetStart, targetStart + 7);
        for (let i = 0; i < targetDays.length && i < sourceDays.length; i++) {
          for (const slot of slots) {
            const sourceKey = assignmentKey(sourceDays[i], slot);
            const targetKey = assignmentKey(targetDays[i], slot);
            const profIds = newMap.get(sourceKey);
            if (profIds) {
              newMap.set(targetKey, profIds);
            } else {
              newMap.delete(targetKey);
            }
          }
        }
        targetStart += 7;
      }

      set({ assignments: newMap });
      pushHistory('Duplicar semana');
      markDirty();
    },

    // ===== Clear =====
    clearMonth() {
      set({ assignments: new Map() });
      pushHistory('Limpar mês');
      markDirty();
    },

    // ===== Undo/Redo =====
    undo() {
      const state = get();
      if (state.historyIndex <= 0) return;
      const newIndex = state.historyIndex - 1;
      const entry = state.history[newIndex];
      set({
        assignments: recordToMap(entry.assignments),
        historyIndex: newIndex,
      });
      markDirty();
    },

    redo() {
      const state = get();
      if (state.historyIndex >= state.history.length - 1) return;
      const newIndex = state.historyIndex + 1;
      const entry = state.history[newIndex];
      set({
        assignments: recordToMap(entry.assignments),
        historyIndex: newIndex,
      });
      markDirty();
    },

    // ===== Salvar =====
    getDiff() {
      const state = get();
      const diffs: ScheduleAssignment[] = [];
      const allKeys = new Set([...state.assignments.keys(), ...state.originalAssignments.keys()]);

      for (const key of allKeys) {
        const current = state.assignments.get(key);
        const original = state.originalAssignments.get(key);

        if (JSON.stringify(current) !== JSON.stringify(original) && current) {
          const { date, slot } = parseAssignmentKey(key);
          for (const professionalId of current) {
            diffs.push({ date, slot, professional_id: professionalId });
          }
        }
      }

      return diffs;
    },

    getFullAssignments() {
      const state = get();
      const result: ScheduleAssignment[] = [];
      for (const [key, profIds] of state.assignments) {
        const { date, slot } = parseAssignmentKey(key);
        for (const professionalId of profIds) {
          result.push({ date, slot, professional_id: professionalId });
        }
      }
      return result;
    },

    markSaved() {
      const state = get();
      set({
        originalAssignments: cloneMap(state.assignments),
        isDirty: false,
      });
    },

    // ===== UI =====
    toggleSidebar() {
      set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
    },

    setSaving(saving) {
      set({ isSaving: saving });
    },
  };
});
