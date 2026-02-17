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
import { assignmentKey } from '@/types/schedule';
import type { SlotType } from '@/types/schedule';
import { ScheduleHeader } from '@/components/schedule/ScheduleHeader';
import { ScheduleCalendarGrid } from '@/components/schedule/ScheduleCalendarGrid';
import { ScheduleSidebar } from '@/components/schedule/ScheduleSidebar';
import { AutoFillModal } from '@/components/schedule/AutoFillModal';
import { ProfessionalPicker } from '@/components/schedule/ProfessionalPicker';
import { Loading } from '@/components/ui';
import { Breadcrumbs } from '@/components/ui';

export default function PatientMonthSchedulePage() {
  const { patientId } = useParams<{ patientId: string }>();

  // Store
  const store = useScheduleStore();
  const {
    year,
    month,
    regime,
    isDirty,
    isSaving,
    assignments,
    assignmentsData,
    isSidebarOpen,
    historyIndex,
    history,
    initialize,
    setMonth,
    assignProfessional,
    removeProfessional,
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

  // UI State
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const [pickerState, setPickerState] = useState<{
    open: boolean;
    date: string;
    slot: SlotType;
  }>({ open: false, date: '', slot: '24h' });

  // Inicializar store com dados do servidor
  useEffect(() => {
    if (patientId && scheduleData) {
      initialize(
        patientId,
        scheduleData.year,
        scheduleData.month,
        scheduleData.regime,
        scheduleData.assignments
      );
    }
  }, [patientId, scheduleData, initialize]);

  // Atalhos de teclado (Ctrl+Z, Ctrl+Y, Ctrl+S)
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
  }, [undo, redo, isDirty]);

  // Handlers
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

  const handleSave = useCallback(async () => {
    if (!patientId || !isDirty) return;

    setSaving(true);
    try {
      const allAssignments = getFullAssignments();
      await saveSchedule.mutateAsync({
        patient_id: patientId,
        year,
        month,
        assignments: allAssignments,
      });
      markSaved();
    } finally {
      setSaving(false);
    }
  }, [patientId, isDirty, year, month, setSaving, getFullAssignments, saveSchedule, markSaved]);

  const handleSlotClick = useCallback(
    (date: string, slot: SlotType) => {
      setPickerState({ open: true, date, slot });
    },
    []
  );

  const handleProfessionalSelect = useCallback(
    (professionalId: string) => {
      if (pickerState.open) {
        assignProfessional(pickerState.date, pickerState.slot, professionalId);
      }
    },
    [pickerState, assignProfessional]
  );

  const handleProfessionalRemove = useCallback(() => {
    if (pickerState.open) {
      removeProfessional(pickerState.date, pickerState.slot);
    }
  }, [pickerState, removeProfessional]);

  const handleClearMonth = useCallback(() => {
    if (window.confirm('Tem certeza que deseja limpar todas as atribuições do mês?')) {
      clearMonth();
    }
  }, [clearMonth]);

  // Dados derivados
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const currentPickerProfId = useMemo(() => {
    if (!pickerState.open) return undefined;
    const profIds = assignments.get(assignmentKey(pickerState.date, pickerState.slot));
    return profIds?.[0]; // Retorna o primeiro profissional (se houver)
  }, [pickerState, assignments]);

  const isLoading = patientLoading || scheduleLoading || professionalsLoading;

  // Breadcrumbs
  const breadcrumbs = useMemo(
    () => [
      { label: 'Prontuário' },
      { label: 'PAD', href: '/prontuario/pad' },
      { label: 'Escala Mensal' },
    ],
    []
  );

  // Aviso de saída com alterações pendentes
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
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbs} className="mb-3" />

      {/* Header */}
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

      {/* Main layout: Calendar + Sidebar */}
      <div className="flex gap-4">
        {/* Calendar */}
        <div className="min-w-0 flex-1">
          <ScheduleCalendarGrid
            professionals={professionals}
            onSlotClick={handleSlotClick}
          />
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden w-[280px] shrink-0 overflow-hidden rounded-lg border border-border-default bg-surface-card lg:block">
          <ScheduleSidebar
            professionals={professionals}
            onAutoFillClick={() => setAutoFillOpen(true)}
          />
        </aside>
      </div>

      {/* Mobile drawer overlay */}
      <Transition show={isSidebarOpen}>
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <Transition.Child
            enter="transition-opacity duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className="absolute inset-0 bg-black/40"
              onClick={toggleSidebar}
            />
          </Transition.Child>

          {/* Drawer */}
          <Transition.Child
            enter="transition-transform duration-200"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition-transform duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <div className="absolute right-0 top-0 h-full w-[300px] border-l border-border-default bg-surface-card shadow-xl">
              {/* Drawer header */}
              <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
                <h2 className="text-sm font-semibold text-content-primary">Escalas</h2>
                <button
                  onClick={toggleSidebar}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-content-muted hover:bg-surface-hover"
                >
                  ✕
                </button>
              </div>
              <ScheduleSidebar
                professionals={professionals}
                onAutoFillClick={() => {
                  toggleSidebar();
                  setAutoFillOpen(true);
                }}
              />
            </div>
          </Transition.Child>
        </div>
      </Transition>

      {/* Modal de auto-preenchimento */}
      <AutoFillModal
        isOpen={autoFillOpen}
        onClose={() => setAutoFillOpen(false)}
        professionals={professionals}
      />

      {/* Modal professional picker */}
      <ProfessionalPicker
        isOpen={pickerState.open}
        onClose={() => setPickerState({ open: false, date: '', slot: '24h' })}
        professionals={professionals}
        date={pickerState.date}
        slot={pickerState.slot}
        currentProfessionalId={currentPickerProfId}
        onSelect={handleProfessionalSelect}
        onRemove={handleProfessionalRemove}
      />
    </div>
  );
}
