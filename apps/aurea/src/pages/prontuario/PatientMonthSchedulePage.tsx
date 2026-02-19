import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Transition } from '@headlessui/react';
import { useScheduleStore } from '@/stores/scheduleStore';
import {
  usePatientMonthSchedule,
  useScheduleProfessionals,
  useSaveSchedule,
  useSchedulePatient,
} from '@/hooks/usePatientSchedule';
import { generateDefaultSlots } from '@/types/schedule';
import type { ScheduleAssignment } from '@/types/schedule';
import { ScheduleHeader } from '@/components/schedule/ScheduleHeader';
import { ScheduleCalendarGrid } from '@/components/schedule/ScheduleCalendarGrid';
import { ScheduleSidebar } from '@/components/schedule/ScheduleSidebar';
import { AutoFillModal } from '@/components/schedule/AutoFillModal';
import { ProfessionalPicker } from '@/components/schedule/ProfessionalPicker';
import { Loading } from '@/components/ui';
import { Breadcrumbs } from '@/components/ui';
import toast from 'react-hot-toast';

const SCHEDULE_PROFESSIONAL_COLORS = [
  '#0057B8',
  '#E65100',
  '#0B8F3A',
  '#C2185B',
  '#6A1B9A',
  '#00838F',
  '#B26A00',
  '#37474F',
] as const;

export default function PatientMonthSchedulePage() {
  const { patientId } = useParams<{ patientId: string }>();

  // Store
  const store = useScheduleStore();
  const {
    year,
    month,
    regime,
    startTime,
    minEditableDate,
    padItemId,
    isDirty,
    isSaving,
    assignments,
    isSidebarOpen,
    historyIndex,
    history,
    initialize,
    setMonth,
    addAssignment,
    removeAssignment,
    updateAssignment,
    clearMonth,
    undo,
    redo,
    toggleSidebar,
    setSaving,
    markSaved,
    getFullAssignments,
  } = store;

  // Queries
  const { data: patient, isLoading: patientLoading } = useSchedulePatient(patientId);
  const { data: scheduleData, isLoading: scheduleLoading } = usePatientMonthSchedule(
    patientId,
    year,
    month
  );
  const { data: professionals = [], isLoading: professionalsLoading } = useScheduleProfessionals();

  // Mutation
  const saveSchedule = useSaveSchedule();

  const handleSave = useCallback(async () => {
    if (!patientId || !isDirty || !padItemId) return;

    setSaving(true);
    try {
      const allAssignments = getFullAssignments();
      await saveSchedule.mutateAsync({
        patient_id: patientId,
        pad_item_id: padItemId,
        year,
        month,
        assignments: allAssignments,
      });
      markSaved();
    } finally {
      setSaving(false);
    }
  }, [
    patientId,
    padItemId,
    isDirty,
    year,
    month,
    setSaving,
    getFullAssignments,
    saveSchedule,
    markSaved,
  ]);

  // UI State
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const [pickerState, setPickerState] = useState<{
    open: boolean;
    date: string;
    editIndex: number | null; // null = novo, number = editar existente
  }>({ open: false, date: '', editIndex: null });

  // Inicializar store com dados do servidor
  useEffect(() => {
    if (patientId && scheduleData) {
      initialize(
        patientId,
        scheduleData.year,
        scheduleData.month,
        scheduleData.regime,
        scheduleData.start_time,
        scheduleData.start_date,
        scheduleData.pad_id,
        scheduleData.pad_item_id,
        scheduleData.assignments
      );
    }
  }, [patientId, scheduleData, initialize]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          redo();
        } else if (e.key === 's') {
          e.preventDefault();
          if (isDirty) handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, isDirty, handleSave]);

  // Handlers de navegacao
  const handlePreviousMonth = useCallback(() => {
    const newMonth = month === 1 ? 12 : month - 1;
    const newYear = month === 1 ? year - 1 : year;
    setMonth(newYear, newMonth);
  }, [year, month, setMonth]);

  const handleNextMonth = useCallback(() => {
    const newMonth = month === 12 ? 1 : month + 1;
    const newYear = month === 12 ? year + 1 : year;
    setMonth(newYear, newMonth);
  }, [year, month, setMonth]);

  // Abrir picker para editar assignment existente
  const handleSlotClick = useCallback(
    (date: string, index: number) => {
      if (minEditableDate && date < minEditableDate) return;
      setPickerState({ open: true, date, editIndex: index });
    },
    [minEditableDate]
  );

  // Abrir picker para adicionar novo assignment
  const handleAddClick = useCallback(
    (date: string) => {
      if (minEditableDate && date < minEditableDate) return;
      setPickerState({ open: true, date, editIndex: null });
    },
    [minEditableDate]
  );

  // Selecionar profissional no picker
  const handleProfessionalSelect = useCallback(
    (professionalId: string, selectedStartAt: string, selectedEndAt: string) => {
      if (!pickerState.open) return;

      const currentEditAssignment =
        pickerState.editIndex !== null
          ? (assignments.get(pickerState.date)?.[pickerState.editIndex] ?? null)
          : null;
      const isKeepingCurrentProfessional =
        currentEditAssignment?.professional_id === professionalId;

      const isEligibleProfessional = professionals.some(
        (professional) =>
          professional.id === professionalId && professional.profession_code === 'tecnico'
      );

      if (!isEligibleProfessional && !isKeepingCurrentProfessional) {
        toast.error('Somente tecnicos de enfermagem podem ser adicionados na escala.');
        return;
      }

      if (pickerState.editIndex !== null) {
        // Editar existente
        updateAssignment(pickerState.date, pickerState.editIndex, {
          professional_id: professionalId,
          start_at: selectedStartAt,
          end_at: selectedEndAt,
        });
      } else {
        // Adicionar novo
        addAssignment(pickerState.date, professionalId, selectedStartAt, selectedEndAt);
      }
    },
    [pickerState, assignments, professionals, updateAssignment, addAssignment]
  );

  // Remover assignment do picker
  const handleProfessionalRemove = useCallback(() => {
    if (pickerState.open && pickerState.editIndex !== null) {
      removeAssignment(pickerState.date, pickerState.editIndex);
    }
  }, [pickerState, removeAssignment]);

  const handleClearMonth = useCallback(() => {
    if (window.confirm('Tem certeza que deseja limpar todas as atribuicoes do mes?')) {
      clearMonth();
    }
  }, [clearMonth]);

  // Dados derivados
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Assignment existente para o picker (quando editando)
  const existingPickerAssignment: ScheduleAssignment | null = useMemo(() => {
    if (!pickerState.open || pickerState.editIndex === null) return null;
    const dayAssignments = assignments.get(pickerState.date);
    return dayAssignments?.[pickerState.editIndex] ?? null;
  }, [pickerState, assignments]);

  // Horarios padrao para novos assignments
  const defaultTimes = useMemo(() => {
    if (!pickerState.open || !pickerState.date) {
      return { startAt: '', endAt: '' };
    }
    // Calcular proximo horario disponivel baseado nos assignments existentes
    const dayAssignments = assignments.get(pickerState.date) || [];
    if (dayAssignments.length > 0) {
      // Usar o end_at do ultimo assignment como start do proximo
      const lastAssignment = dayAssignments[dayAssignments.length - 1];
      const lastEnd = new Date(lastAssignment.end_at);
      // Calcular um end_at baseado no regime
      const slots = generateDefaultSlots(pickerState.date, regime, startTime);
      const slotDuration =
        new Date(slots[0].end_at).getTime() - new Date(slots[0].start_at).getTime();
      const newEnd = new Date(lastEnd.getTime() + slotDuration);
      return {
        startAt: lastEnd.toISOString(),
        endAt: newEnd.toISOString(),
      };
    }
    // Primeiro assignment do dia: usar horarios padrao do regime
    const slots = generateDefaultSlots(pickerState.date, regime, startTime);
    return {
      startAt: slots[0].start_at,
      endAt: slots[0].end_at,
    };
  }, [pickerState, assignments, regime, startTime]);

  const isLoading = patientLoading || scheduleLoading || professionalsLoading;

  const breadcrumbs = useMemo(
    () => [
      { label: 'Prontuario' },
      { label: 'Escalas', href: '/prontuario/escalas' },
      { label: 'Escala Mensal' },
    ],
    []
  );

  const professionalsWithPalette = useMemo(() => {
    const firstUsageOrder = new Map<string, number>();
    const allAssignments = Array.from(assignments.values()).flat();
    const sortedByStart = [...allAssignments].sort((a, b) => a.start_at.localeCompare(b.start_at));

    sortedByStart.forEach((assignment) => {
      if (!firstUsageOrder.has(assignment.professional_id)) {
        firstUsageOrder.set(assignment.professional_id, firstUsageOrder.size);
      }
    });

    return professionals.map((professional) => {
      const usageIndex = firstUsageOrder.get(professional.id);
      if (usageIndex === undefined) {
        return { ...professional, color: null };
      }

      return {
        ...professional,
        color: SCHEDULE_PROFESSIONAL_COLORS[usageIndex % SCHEDULE_PROFESSIONAL_COLORS.length],
      };
    });
  }, [professionals, assignments]);

  const scheduleEligibleProfessionals = useMemo(
    () =>
      professionalsWithPalette.filter((professional) => professional.profession_code === 'tecnico'),
    [professionalsWithPalette]
  );

  const pickerProfessionals = useMemo(() => {
    if (!existingPickerAssignment) return scheduleEligibleProfessionals;

    const alreadyEligible = scheduleEligibleProfessionals.some(
      (professional) => professional.id === existingPickerAssignment.professional_id
    );
    if (alreadyEligible) return scheduleEligibleProfessionals;

    const assignedProfessional = professionalsWithPalette.find(
      (professional) => professional.id === existingPickerAssignment.professional_id
    );
    if (!assignedProfessional) return scheduleEligibleProfessionals;

    return [assignedProfessional, ...scheduleEligibleProfessionals];
  }, [existingPickerAssignment, scheduleEligibleProfessionals, professionalsWithPalette]);

  // Aviso de saida com alteracoes pendentes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-full">
      <Breadcrumbs items={breadcrumbs} className="mb-3" />

      <ScheduleHeader
        patientName={patient?.name}
        year={year}
        month={month}
        regime={regime}
        isDirty={isDirty}
        isSaving={isSaving}
        canUndo={canUndo}
        canRedo={canRedo}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onSave={handleSave}
        onClearMonth={handleClearMonth}
        onUndo={undo}
        onRedo={redo}
        onToggleSidebar={toggleSidebar}
      />

      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <ScheduleCalendarGrid
            professionals={professionalsWithPalette}
            onSlotClick={handleSlotClick}
            onAddClick={handleAddClick}
            minEditableDate={minEditableDate}
          />
        </div>

        <aside className="border-border-default bg-surface-card hidden w-[280px] shrink-0 overflow-hidden rounded-lg border lg:block">
          <ScheduleSidebar
            professionals={scheduleEligibleProfessionals}
            onAutoFillClick={() => setAutoFillOpen(true)}
          />
        </aside>
      </div>

      {/* Mobile drawer overlay */}
      <Transition show={isSidebarOpen}>
        <div className="fixed inset-0 z-40 lg:hidden">
          <Transition.Child
            enter="transition-opacity duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="absolute inset-0 bg-black/40" onClick={toggleSidebar} />
          </Transition.Child>

          <Transition.Child
            enter="transition-transform duration-200"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <div className="border-border-default bg-surface-card absolute right-0 top-0 h-full w-[300px] border-l shadow-xl">
              <div className="border-border-default flex items-center justify-between border-b px-3 py-2">
                <h2 className="text-content-primary text-sm font-semibold">Escalas</h2>
                <button
                  onClick={toggleSidebar}
                  className="text-content-muted hover:bg-surface-hover flex h-8 w-8 items-center justify-center rounded-lg"
                >
                  ✕
                </button>
              </div>
              <ScheduleSidebar
                professionals={scheduleEligibleProfessionals}
                onAutoFillClick={() => {
                  toggleSidebar();
                  setAutoFillOpen(true);
                }}
              />
            </div>
          </Transition.Child>
        </div>
      </Transition>

      <AutoFillModal
        isOpen={autoFillOpen}
        onClose={() => setAutoFillOpen(false)}
        professionals={scheduleEligibleProfessionals}
      />

      <ProfessionalPicker
        isOpen={pickerState.open}
        onClose={() => setPickerState({ open: false, date: '', editIndex: null })}
        professionals={pickerProfessionals}
        date={pickerState.date}
        existingAssignment={existingPickerAssignment}
        defaultStartAt={defaultTimes.startAt}
        defaultEndAt={defaultTimes.endAt}
        onSelect={handleProfessionalSelect}
        onRemove={pickerState.editIndex !== null ? handleProfessionalRemove : null}
        dayAssignments={assignments.get(pickerState.date) || []}
        editIndex={pickerState.editIndex}
        scheduleStartTime={startTime}
        regime={regime}
      />
    </div>
  );
}
