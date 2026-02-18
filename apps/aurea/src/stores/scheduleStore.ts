import { create } from 'zustand';
import type {
  ScheduleRegime,
  ScheduleAssignment,
  ScheduleHistoryEntry,
  AutoFillConfig,
  BatchSelectionPreset,
  DayAssignmentsMap,
  SlotType,
} from '@/types/schedule';
import { generateDefaultSlots, getSlotTimes } from '@/types/schedule';

// =====================================================
// Helpers
// =====================================================

function mapToRecord(map: DayAssignmentsMap): Record<string, ScheduleAssignment[]> {
  const record: Record<string, ScheduleAssignment[]> = {};
  map.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function recordToMap(record: Record<string, ScheduleAssignment[]>): DayAssignmentsMap {
  return new Map(Object.entries(record));
}

function cloneMap(map: DayAssignmentsMap): DayAssignmentsMap {
  const newMap: DayAssignmentsMap = new Map();
  map.forEach((value, key) => {
    newMap.set(
      key,
      value.map((a) => ({ ...a }))
    );
  });
  return newMap;
}

/** Gerar todos os dias de um mes: YYYY-MM-DD[] */
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

function isDateLocked(date: string, minEditableDate: string | null): boolean {
  return !!minEditableDate && date < minEditableDate;
}

function mergeShiftAssignmentInDay(
  existing: ScheduleAssignment[],
  incoming: ScheduleAssignment,
  slotType: SlotType
): ScheduleAssignment[] {
  if (slotType === '24h') {
    return [incoming];
  }

  // Para 12h, atualiza apenas o slot equivalente (mesma janela de horario) e preserva o restante.
  const next = existing.map((assignment) => ({ ...assignment }));
  const targetStart = incoming.start_at;
  const targetEnd = incoming.end_at;
  const replaceIndex = next.findIndex(
    (assignment) => assignment.start_at === targetStart && assignment.end_at === targetEnd
  );

  if (replaceIndex >= 0) {
    next[replaceIndex] = incoming;
  } else {
    next.push(incoming);
  }

  next.sort((a, b) => a.start_at.localeCompare(b.start_at));
  return next;
}

// =====================================================
// Store
// =====================================================

interface ScheduleStoreState {
  // Contexto
  patientId: string | null;
  padId: string | null; // pad.id
  padItemId: string | null; // pad_items.id (tipo shift)
  year: number;
  month: number;
  regime: ScheduleRegime;
  startTime: string; // HH:MM
  minEditableDate: string | null; // YYYY-MM-DD

  // Draft
  assignments: DayAssignmentsMap;
  originalAssignments: DayAssignmentsMap;
  isDirty: boolean;

  // Selecao
  selectedDates: Set<string>;

  // Historico undo/redo
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
    startTime: string,
    minEditableDate: string | null,
    padId: string | null,
    padItemId: string | null,
    serverAssignments: ScheduleAssignment[]
  ): void;
  setMonth(year: number, month: number): void;

  // Atribuicoes
  addAssignment(date: string, professionalId: string, startAt: string, endAt: string): void;
  removeAssignment(date: string, index: number): void;
  updateAssignment(
    date: string,
    index: number,
    changes: Partial<Pick<ScheduleAssignment, 'professional_id' | 'start_at' | 'end_at'>>
  ): void;
  moveAssignment(fromDate: string, fromIndex: number, toDate: string): void;
  copyAssignment(fromDate: string, fromIndex: number, toDate: string): void;
  swapDayAssignments(dateA: string, dateB: string): void;
  swapAssignments(dateA: string, indexA: number, dateB: string, indexB: number): void;

  // Lote
  toggleDateSelection(date: string): void;
  selectDateRange(dates: string[]): void;
  clearSelection(): void;
  applyBatchPreset(preset: BatchSelectionPreset): void;
  applyBatchAssignment(professionalId: string, slotType?: SlotType): void;

  // Auto-preencher
  generateAutoFillPreview(config: AutoFillConfig): DayAssignmentsMap;
  applyAutoFill(preview: DayAssignmentsMap): void;

  // Semana
  duplicateWeek(sourceWeekStart: string): void;

  // Clear
  clearMonth(): void;

  // Undo/Redo
  undo(): void;
  redo(): void;

  // Salvar
  getFullAssignments(): ScheduleAssignment[];
  markSaved(): void;

  // UI
  toggleSidebar(): void;
  setSaving(saving: boolean): void;
}

export type ScheduleStore = ScheduleStoreState & ScheduleStoreActions;

const MAX_HISTORY = 50;

export const useScheduleStore = create<ScheduleStore>((set, get) => {
  function pushHistory(label: string) {
    const state = get();
    const newEntry: ScheduleHistoryEntry = {
      assignments: mapToRecord(state.assignments),
      label,
    };
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

    if (original.size !== current.size) {
      dirty = true;
    } else {
      for (const [key, value] of current) {
        const origValue = original.get(key);
        if (!origValue || origValue.length !== value.length) {
          dirty = true;
          break;
        }
        for (let i = 0; i < value.length; i++) {
          const a = value[i];
          const b = origValue[i];
          if (
            a.professional_id !== b.professional_id ||
            a.start_at !== b.start_at ||
            a.end_at !== b.end_at
          ) {
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
    padId: null,
    padItemId: null,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    regime: '24h',
    startTime: '07:00',
    minEditableDate: null,
    assignments: new Map(),
    originalAssignments: new Map(),
    isDirty: false,
    selectedDates: new Set(),
    history: [],
    historyIndex: -1,
    isSidebarOpen: false,
    isSaving: false,

    // ===== Init =====
    initialize(
      patientId,
      year,
      month,
      regime,
      startTime,
      minEditableDate,
      padId,
      padItemId,
      serverAssignments
    ) {
      const map: DayAssignmentsMap = new Map();

      for (const a of serverAssignments) {
        if (!map.has(a.date)) {
          map.set(a.date, []);
        }
        map.get(a.date)!.push({ ...a });
      }

      // Ordenar por start_at dentro de cada dia
      for (const [, dayAssignments] of map) {
        dayAssignments.sort((a, b) => a.start_at.localeCompare(b.start_at));
      }

      const record = mapToRecord(map);
      set({
        patientId,
        padId,
        padItemId,
        year,
        month,
        regime,
        startTime,
        minEditableDate,
        assignments: cloneMap(map),
        originalAssignments: cloneMap(map),
        isDirty: false,
        selectedDates: new Set(),
        history: [{ assignments: record, label: 'Estado inicial' }],
        historyIndex: 0,
      });
    },

    setMonth(year, month) {
      set({ year, month, selectedDates: new Set() });
    },

    // ===== Atribuicoes =====
    addAssignment(date, professionalId, startAt, endAt) {
      const state = get();
      if (isDateLocked(date, state.minEditableDate)) return;
      const newMap = cloneMap(state.assignments);
      if (!newMap.has(date)) {
        newMap.set(date, []);
      }
      const dayAssignments = newMap.get(date)!;
      dayAssignments.push({
        date,
        professional_id: professionalId,
        start_at: startAt,
        end_at: endAt,
      });
      // Ordenar por start_at
      dayAssignments.sort((a, b) => a.start_at.localeCompare(b.start_at));
      set({ assignments: newMap });
      pushHistory(`Atribuir profissional em ${date}`);
      markDirty();
    },

    removeAssignment(date, index) {
      const state = get();
      if (isDateLocked(date, state.minEditableDate)) return;
      const newMap = cloneMap(state.assignments);
      const dayAssignments = newMap.get(date);
      if (dayAssignments && index >= 0 && index < dayAssignments.length) {
        dayAssignments.splice(index, 1);
        if (dayAssignments.length === 0) {
          newMap.delete(date);
        }
        set({ assignments: newMap });
        pushHistory(`Remover profissional de ${date}`);
        markDirty();
      }
    },

    updateAssignment(date, index, changes) {
      const state = get();
      if (isDateLocked(date, state.minEditableDate)) return;
      const newMap = cloneMap(state.assignments);
      const dayAssignments = newMap.get(date);
      if (dayAssignments && index >= 0 && index < dayAssignments.length) {
        Object.assign(dayAssignments[index], changes);
        // Re-ordenar por start_at
        dayAssignments.sort((a, b) => a.start_at.localeCompare(b.start_at));
        set({ assignments: newMap });
        pushHistory(`Editar atribuicao em ${date}`);
        markDirty();
      }
    },

    moveAssignment(fromDate, fromIndex, toDate) {
      const state = get();
      if (
        isDateLocked(fromDate, state.minEditableDate) ||
        isDateLocked(toDate, state.minEditableDate)
      ) {
        return;
      }
      const newMap = cloneMap(state.assignments);
      const fromDay = newMap.get(fromDate);
      if (!fromDay || fromIndex < 0 || fromIndex >= fromDay.length) return;

      const assignment = fromDay.splice(fromIndex, 1)[0];
      if (fromDay.length === 0) newMap.delete(fromDate);

      // Ajustar data do assignment
      assignment.date = toDate;
      // Recalcular timestamps mantendo os horarios mas mudando a data
      const fromDateObj = new Date(assignment.start_at);
      const toDateObj = new Date(toDate + 'T00:00:00');
      const dayDiff = Math.round(
        (toDateObj.getTime() - new Date(fromDate + 'T00:00:00').getTime()) / 86400000
      );
      const startDate = new Date(fromDateObj.getTime() + dayDiff * 86400000);
      const endDate = new Date(new Date(assignment.end_at).getTime() + dayDiff * 86400000);
      assignment.start_at = startDate.toISOString();
      assignment.end_at = endDate.toISOString();

      if (!newMap.has(toDate)) newMap.set(toDate, []);
      newMap.get(toDate)!.push(assignment);
      newMap.get(toDate)!.sort((a, b) => a.start_at.localeCompare(b.start_at));

      set({ assignments: newMap });
      pushHistory(`Mover de ${fromDate} para ${toDate}`);
      markDirty();
    },

    copyAssignment(fromDate, fromIndex, toDate) {
      const state = get();
      if (
        isDateLocked(fromDate, state.minEditableDate) ||
        isDateLocked(toDate, state.minEditableDate)
      ) {
        return;
      }
      const newMap = cloneMap(state.assignments);
      const fromDay = newMap.get(fromDate);
      if (!fromDay || fromIndex < 0 || fromIndex >= fromDay.length) return;

      const source = fromDay[fromIndex];
      const dayDiff = Math.round(
        (new Date(toDate + 'T00:00:00').getTime() - new Date(fromDate + 'T00:00:00').getTime()) /
          86400000
      );
      const startDate = new Date(new Date(source.start_at).getTime() + dayDiff * 86400000);
      const endDate = new Date(new Date(source.end_at).getTime() + dayDiff * 86400000);

      const newAssignment: ScheduleAssignment = {
        date: toDate,
        professional_id: source.professional_id,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
      };

      if (!newMap.has(toDate)) newMap.set(toDate, []);
      newMap.get(toDate)!.push(newAssignment);
      newMap.get(toDate)!.sort((a, b) => a.start_at.localeCompare(b.start_at));

      set({ assignments: newMap });
      pushHistory(`Copiar de ${fromDate} para ${toDate}`);
      markDirty();
    },

    swapDayAssignments(dateA, dateB) {
      const state = get();
      if (
        isDateLocked(dateA, state.minEditableDate) ||
        isDateLocked(dateB, state.minEditableDate)
      ) {
        return;
      }
      const newMap = cloneMap(state.assignments);
      const dayA = newMap.get(dateA) || [];
      const dayB = newMap.get(dateB) || [];

      // Recalcular timestamps
      const dayDiffAtoB = Math.round(
        (new Date(dateB + 'T00:00:00').getTime() - new Date(dateA + 'T00:00:00').getTime()) /
          86400000
      );

      const movedA = dayA.map((a) => ({
        ...a,
        date: dateB,
        start_at: new Date(new Date(a.start_at).getTime() + dayDiffAtoB * 86400000).toISOString(),
        end_at: new Date(new Date(a.end_at).getTime() + dayDiffAtoB * 86400000).toISOString(),
      }));

      const movedB = dayB.map((a) => ({
        ...a,
        date: dateA,
        start_at: new Date(new Date(a.start_at).getTime() - dayDiffAtoB * 86400000).toISOString(),
        end_at: new Date(new Date(a.end_at).getTime() - dayDiffAtoB * 86400000).toISOString(),
      }));

      if (movedA.length > 0) newMap.set(dateB, movedA);
      else newMap.delete(dateB);

      if (movedB.length > 0) newMap.set(dateA, movedB);
      else newMap.delete(dateA);

      set({ assignments: newMap });
      pushHistory(`Trocar ${dateA} <-> ${dateB}`);
      markDirty();
    },

    swapAssignments(dateA, indexA, dateB, indexB) {
      const state = get();
      if (
        isDateLocked(dateA, state.minEditableDate) ||
        isDateLocked(dateB, state.minEditableDate)
      ) {
        return;
      }

      if (dateA === dateB && indexA === indexB) {
        return;
      }

      const newMap = cloneMap(state.assignments);
      const dayA = newMap.get(dateA);
      const dayB = newMap.get(dateB);

      if (!dayA || !dayB) return;
      if (indexA < 0 || indexA >= dayA.length) return;
      if (indexB < 0 || indexB >= dayB.length) return;

      const assignmentA = dayA[indexA];
      const assignmentB = dayB[indexB];

      const professionalA = assignmentA.professional_id;
      assignmentA.professional_id = assignmentB.professional_id;
      assignmentB.professional_id = professionalA;

      set({ assignments: newMap });
      pushHistory(`Trocar plantoes ${dateA} e ${dateB}`);
      markDirty();
    },

    // ===== Selecao =====
    toggleDateSelection(date) {
      const state = get();
      if (isDateLocked(date, state.minEditableDate)) return;
      const newSet = new Set(state.selectedDates);
      if (newSet.has(date)) newSet.delete(date);
      else newSet.add(date);
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
          selected = days.filter((d) => parseInt(d.slice(8, 10), 10) % 2 === 0);
          break;
        case 'odd_days':
          selected = days.filter((d) => parseInt(d.slice(8, 10), 10) % 2 !== 0);
          break;
        case 'full_week': {
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

      const unlockedSelected = selected.filter(
        (date) => !isDateLocked(date, state.minEditableDate)
      );
      set({ selectedDates: new Set(unlockedSelected) });
    },

    applyBatchAssignment(professionalId, slotType) {
      const state = get();
      if (state.selectedDates.size === 0) return;

      const newMap = cloneMap(state.assignments);

      for (const date of state.selectedDates) {
        if (isDateLocked(date, state.minEditableDate)) continue;

        if (slotType) {
          const { start, end } = getSlotTimes(slotType, date, state.startTime);
          const incomingAssignment: ScheduleAssignment = {
            date,
            professional_id: professionalId,
            start_at: start,
            end_at: end,
          };

          const existingDayAssignments = newMap.get(date) || [];
          const mergedDayAssignments = mergeShiftAssignmentInDay(
            existingDayAssignments,
            incomingAssignment,
            slotType
          );
          newMap.set(date, mergedDayAssignments);
          continue;
        }

        const slots = generateDefaultSlots(date, state.regime, state.startTime);
        const dayAssignments: ScheduleAssignment[] = slots.map((s) => ({
          date,
          professional_id: professionalId,
          start_at: s.start_at,
          end_at: s.end_at,
        }));
        newMap.set(date, dayAssignments);
      }

      set({ assignments: newMap, selectedDates: new Set() });
      pushHistory(`Lote: ${state.selectedDates.size} dias`);
      markDirty();
    },

    // ===== Auto-preencher =====
    generateAutoFillPreview(config) {
      const state = get();
      const days = getDaysInMonth(state.year, state.month);
      const preview: DayAssignmentsMap = cloneMap(state.assignments);

      if (config.rotation.length === 0) return preview;

      const filteredDays = days.filter((d) => {
        if (isDateLocked(d, state.minEditableDate)) return false;
        const dow = getDayOfWeek(d);
        return config.weekdays.includes(dow);
      });

      let professionalIndex = 0;
      let daysCount = 0;

      for (const day of filteredDays) {
        const currentProfId = config.rotation[professionalIndex % config.rotation.length];
        const { start, end } = getSlotTimes(config.shiftType, day, state.startTime);
        const incomingAssignment: ScheduleAssignment = {
          date: day,
          professional_id: currentProfId,
          start_at: start,
          end_at: end,
        };

        const existingDayAssignments = preview.get(day) || [];
        const mergedDayAssignments = mergeShiftAssignmentInDay(
          existingDayAssignments,
          incomingAssignment,
          config.shiftType
        );
        preview.set(day, mergedDayAssignments);

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
      if (isDateLocked(sourceWeekStart, state.minEditableDate)) return;
      const days = getDaysInMonth(state.year, state.month);
      const newMap = cloneMap(state.assignments);

      const startIdx = days.indexOf(sourceWeekStart);
      if (startIdx < 0) return;

      const sourceDays = days.slice(startIdx, startIdx + 7);

      let targetStart = startIdx + 7;
      while (targetStart < days.length) {
        const targetDays = days.slice(targetStart, targetStart + 7);
        for (let i = 0; i < targetDays.length && i < sourceDays.length; i++) {
          if (
            isDateLocked(sourceDays[i], state.minEditableDate) ||
            isDateLocked(targetDays[i], state.minEditableDate)
          ) {
            continue;
          }
          const sourceAssignments = newMap.get(sourceDays[i]);
          if (sourceAssignments) {
            const dayDiff = Math.round(
              (new Date(targetDays[i] + 'T00:00:00').getTime() -
                new Date(sourceDays[i] + 'T00:00:00').getTime()) /
                86400000
            );
            const copied = sourceAssignments.map((a) => ({
              ...a,
              date: targetDays[i],
              start_at: new Date(new Date(a.start_at).getTime() + dayDiff * 86400000).toISOString(),
              end_at: new Date(new Date(a.end_at).getTime() + dayDiff * 86400000).toISOString(),
            }));
            newMap.set(targetDays[i], copied);
          } else {
            newMap.delete(targetDays[i]);
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
      const state = get();
      const preservedLocked: DayAssignmentsMap = new Map();
      state.assignments.forEach((value, key) => {
        if (isDateLocked(key, state.minEditableDate)) {
          preservedLocked.set(
            key,
            value.map((assignment) => ({ ...assignment }))
          );
        }
      });
      set({ assignments: preservedLocked });
      pushHistory('Limpar mes');
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
    getFullAssignments() {
      const state = get();
      const result: ScheduleAssignment[] = [];
      for (const [, dayAssignments] of state.assignments) {
        for (const assignment of dayAssignments) {
          result.push({ ...assignment });
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
