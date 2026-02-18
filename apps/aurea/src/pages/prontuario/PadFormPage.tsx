import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Card,
  Button,
  Breadcrumbs,
  Loading,
  DatePicker,
  TimePicker,
  Select,
  Textarea,
  Modal,
  ModalFooter,
  Input,
  Badge,
} from '@/components/ui';
import {
  usePatientDemand,
  useCreateDemand,
  useUpdateDemand,
  type CreatePadData as CreateDemandData,
} from '@/hooks/usePatientDemands';
import {
  usePadItems,
  useCreatePadItem,
  useUpdatePadItem,
  useDeletePadItem,
  type PadItemType,
  type PadItemFrequency,
  type PadItemWithProfession,
} from '@/hooks/usePadItems';
import { usePatients, usePatientPayers } from '@/hooks/usePatients';
import { useCompanyUnits } from '@/hooks/useCompanyUnits';
import { useProfessionals, useProfessions } from '@/hooks/useProfessionals';
import { usePadServices } from '@/hooks/usePadServices';
import { useForm } from 'react-hook-form';
import { useNavigationGuard } from '@/contexts/NavigationGuardContext';

interface PadFormData {
  patient_id: string;
  patient_payer_id: string;
  company_unit_id: string;
  professional_id: string;
  pad_service_id: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  notes: string;
}

interface PadItemFormData {
  type: PadItemType;
  profession_id: string;
  hours_per_day: string;
  shift_duration_hours: string;
  frequency: PadItemFrequency;
  quantity: string;
}

interface PadItemFormErrors {
  profession_id?: string;
  hours_per_day?: string;
  shift_duration_hours?: string;
  frequency?: string;
  quantity?: string;
}

interface ProfessionOptionSource {
  id: string;
  name: string;
}

interface ProfessionalOptionSource {
  id: string;
  name: string;
  active?: boolean | null;
}

interface CompanyUnitOptionSource {
  id: string;
  name: string;
  trade_name: string | null;
  is_active: boolean | null;
}

interface PatientPayerOptionSource {
  id: string;
  active: boolean;
  is_primary: boolean;
  client?: {
    id: string;
    name: string;
  } | null;
}

interface PadServiceOptionSource {
  id: string;
  name: string;
  active: boolean;
}

const PAD_ITEM_TYPE_OPTIONS: Array<{ value: PadItemType; label: string }> = [
  { value: 'shift', label: 'Plantão' },
  { value: 'visit', label: 'Visita' },
  { value: 'session', label: 'Sessão' },
];

const FREQUENCY_OPTIONS: Array<{ value: PadItemFrequency; label: string }> = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'bimonthly', label: 'Bimestral' },
  { value: 'quarterly', label: 'Trimestral' },
];

const PAD_ITEM_TYPE_LABEL: Record<PadItemType, string> = {
  shift: 'Plantão',
  visit: 'Visita',
  session: 'Sessão',
};

const PAD_ITEM_FREQUENCY_LABEL: Record<PadItemFrequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
};

const DEFAULT_PAD_ITEM_FORM: PadItemFormData = {
  type: 'shift',
  profession_id: '',
  hours_per_day: '12',
  shift_duration_hours: '12',
  frequency: 'weekly',
  quantity: '1',
};

export default function PadFormPage() {
  const { demandId } = useParams<{ demandId: string }>();
  const navigate = useNavigate();
  const isEditing = !!demandId;

  const {
    setHasUnsavedChanges: setGlobalUnsavedChanges,
    safeNavigate,
    handleLinkClick: handleBreadcrumbNavigate,
  } = useNavigationGuard();

  const [isPadItemModalOpen, setIsPadItemModalOpen] = useState(false);
  const [editingPadItem, setEditingPadItem] = useState<PadItemWithProfession | null>(null);
  const [padItemForm, setPadItemForm] = useState<PadItemFormData>(DEFAULT_PAD_ITEM_FORM);
  const [padItemErrors, setPadItemErrors] = useState<PadItemFormErrors>({});

  const currentPadId = demandId;

  const { data: demand, isLoading: isLoadingDemand } = usePatientDemand(
    isEditing ? demandId : undefined
  );
  const { data: patients = [] } = usePatients();
  const { data: companyUnits = [] } = useCompanyUnits();
  const { data: professionals = [] } = useProfessionals();
  const { data: professions = [] } = useProfessions();
  const { data: padServices = [] } = usePadServices();
  const { data: padItems = [], isLoading: isLoadingPadItems } = usePadItems(currentPadId);

  const createDemand = useCreateDemand();
  const updateDemand = useUpdateDemand();

  const createPadItem = useCreatePadItem();
  const updatePadItem = useUpdatePadItem();
  const deletePadItem = useDeletePadItem();

  const professionOptions = useMemo(
    () =>
      (professions as ProfessionOptionSource[]).map((profession) => ({
        value: profession.id,
        label: profession.name,
      })),
    [professions]
  );

  const companyUnitOptions = useMemo(
    () => {
      const activeOptions = (companyUnits as CompanyUnitOptionSource[])
        .filter((companyUnit) => companyUnit.is_active !== false)
        .map((companyUnit) => ({
          value: companyUnit.id,
          label: companyUnit.trade_name
            ? `${companyUnit.name} (${companyUnit.trade_name})`
            : companyUnit.name,
        }));

      if (!isEditing || !demand?.company_unit_id) {
        return activeOptions;
      }

      if (activeOptions.some((option) => option.value === demand.company_unit_id)) {
        return activeOptions;
      }

      const selectedCompanyUnit = (companyUnits as CompanyUnitOptionSource[]).find(
        (companyUnit) => companyUnit.id === demand.company_unit_id
      );

      if (!selectedCompanyUnit) {
        return activeOptions;
      }

      return [
        {
          value: selectedCompanyUnit.id,
          label: selectedCompanyUnit.trade_name
            ? `${selectedCompanyUnit.name} (${selectedCompanyUnit.trade_name})`
            : selectedCompanyUnit.name,
        },
        ...activeOptions,
      ];
    },
    [companyUnits, isEditing, demand]
  );

  const professionalOptions = useMemo(
    () => {
      const activeOptions = (professionals as ProfessionalOptionSource[])
        .filter((professional) => professional.active !== false)
        .map((professional) => ({
          value: professional.id,
          label: professional.name,
        }));

      if (!isEditing || !demand?.professional_id) {
        return activeOptions;
      }

      if (activeOptions.some((option) => option.value === demand.professional_id)) {
        return activeOptions;
      }

      const selectedProfessional = (professionals as ProfessionalOptionSource[]).find(
        (professional) => professional.id === demand.professional_id
      );

      if (!selectedProfessional) {
        return activeOptions;
      }

      return [
        { value: selectedProfessional.id, label: selectedProfessional.name },
        ...activeOptions,
      ];
    },
    [professionals, isEditing, demand]
  );

  const padServiceOptions = useMemo(
    () => {
      const activeOptions = (padServices as PadServiceOptionSource[])
        .filter((padService) => padService.active !== false)
        .map((padService) => ({
          value: padService.id,
          label: padService.name,
        }));

      if (!isEditing || !demand?.pad_service_id) {
        return activeOptions;
      }

      if (activeOptions.some((option) => option.value === demand.pad_service_id)) {
        return activeOptions;
      }

      const selectedPadService = (padServices as PadServiceOptionSource[]).find(
        (padService) => padService.id === demand.pad_service_id
      );

      if (!selectedPadService) {
        return activeOptions;
      }

      return [{ value: selectedPadService.id, label: selectedPadService.name }, ...activeOptions];
    },
    [padServices, isEditing, demand]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<PadFormData>({
    defaultValues: {
      patient_id: '',
      patient_payer_id: '',
      company_unit_id: '',
      professional_id: '',
      pad_service_id: '',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      notes: '',
    },
  });

  const startTimeValue = watch('start_time');
  const endTimeValue = watch('end_time');
  const startDateValue = watch('start_date');
  const endDateValue = watch('end_date');
  const patientIdValue = watch('patient_id');
  const patientPayerIdValue = watch('patient_payer_id');
  const companyUnitIdValue = watch('company_unit_id');
  const professionalIdValue = watch('professional_id');
  const padServiceIdValue = watch('pad_service_id');

  const { data: patientPayers = [] } = usePatientPayers(patientIdValue || undefined);

  const patientOptions = useMemo(() => {
    const activeOptions = patients
      .filter((patient) => patient.active)
      .map((patient) => ({ value: patient.id, label: patient.name }));

    if (!isEditing || !demand?.patient_id) {
      return activeOptions;
    }

    if (activeOptions.some((option) => option.value === demand.patient_id)) {
      return activeOptions;
    }

    const currentPatient =
      patients.find((patient) => patient.id === demand.patient_id) || demand.patient;

    if (!currentPatient) {
      return activeOptions;
    }

    return [{ value: currentPatient.id, label: currentPatient.name }, ...activeOptions];
  }, [patients, isEditing, demand]);

  const patientPayerOptions = useMemo(() => {
    const options = (patientPayers as PatientPayerOptionSource[])
      .filter((payer) => payer.active !== false && payer.client?.id)
      .map((payer) => ({
        value: payer.id,
        label: payer.is_primary ? `${payer.client?.name} (Principal)` : `${payer.client?.name}`,
      }));

    if (!isEditing || !demand?.patient_payer_id) {
      return options;
    }

    if (options.some((option) => option.value === demand.patient_payer_id)) {
      return options;
    }

    const currentPayer = (patientPayers as PatientPayerOptionSource[]).find(
      (payer) => payer.id === demand.patient_payer_id
    );

    if (!currentPayer?.client?.id) {
      return options;
    }

    return [
      {
        value: currentPayer.id,
        label: currentPayer.is_primary
          ? `${currentPayer.client.name} (Principal)`
          : currentPayer.client.name,
      },
      ...options,
    ];
  }, [patientPayers, isEditing, demand]);

  const getTimeFromTimestamp = (value: string | null | undefined): string => {
    if (!value) return '';
    const match = value.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : '';
  };

  useEffect(() => {
    if (isEditing && demand) {
      const startTime = demand.start_time.slice(0, 5);
      const startTimeFromTimestamp = getTimeFromTimestamp(demand.start_at);
      const endTimeFromTimestamp = getTimeFromTimestamp(demand.end_at);

      reset({
        patient_id: demand.patient_id,
        patient_payer_id: demand.patient_payer_id || '',
        company_unit_id: demand.company_unit_id || '',
        professional_id: demand.professional_id || '',
        pad_service_id: demand.pad_service_id || '',
        start_date: demand.start_date,
        end_date: demand.end_date || demand.start_date,
        start_time: startTimeFromTimestamp || startTime,
        end_time: endTimeFromTimestamp || startTime,
        notes: demand.notes || '',
      });
    }
  }, [isEditing, demand, reset]);

  useEffect(() => {
    if (!patientIdValue) {
      if (patientPayerIdValue) {
        setValue('patient_payer_id', '', { shouldDirty: false });
      }
      return;
    }

    if (patientPayerOptions.length === 1 && patientPayerOptions[0].value !== patientPayerIdValue) {
      setValue('patient_payer_id', patientPayerOptions[0].value, { shouldDirty: false });
      return;
    }

    if (
      patientPayerIdValue &&
      !patientPayerOptions.some((option) => option.value === patientPayerIdValue)
    ) {
      setValue('patient_payer_id', '', { shouldDirty: false });
    }
  }, [patientIdValue, patientPayerOptions, patientPayerIdValue, setValue]);

  useEffect(() => {
    setGlobalUnsavedChanges(isDirty);
    return () => {
      setGlobalUnsavedChanges(false);
    };
  }, [isDirty, setGlobalUnsavedChanges]);

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

  const onSubmit = async (data: PadFormData) => {
    const startAt = `${data.start_date}T${data.start_time}:00`;
    const endAt = `${data.end_date}T${data.end_time}:00`;

    const demandData: CreateDemandData = {
      patient_id: data.patient_id,
      patient_payer_id: data.patient_payer_id,
      company_unit_id: data.company_unit_id,
      professional_id: data.professional_id,
      pad_service_id: data.pad_service_id,
      start_date: data.start_date,
      end_date: data.end_date,
      start_time: data.start_time,
      start_at: startAt,
      end_at: endAt,
      notes: data.notes || null,
    };

    try {
      if (isEditing) {
        await updateDemand.mutateAsync({ id: demandId!, ...demandData });
        reset({
          patient_id: data.patient_id,
          patient_payer_id: data.patient_payer_id,
          company_unit_id: data.company_unit_id,
          professional_id: data.professional_id,
          pad_service_id: data.pad_service_id,
          start_date: data.start_date,
          end_date: data.end_date,
          start_time: data.start_time,
          end_time: data.end_time,
          notes: data.notes || '',
        });
      } else {
        const createdPad = await createDemand.mutateAsync(demandData);
        navigate(`/prontuario/pad/${createdPad.id}`, { replace: true });
      }
      setGlobalUnsavedChanges(false);
    } catch {
      // Error already handled by hook
    }
  };

  const handleBack = () => {
    safeNavigate('/prontuario/pad');
  };

  const handleDeactivate = async () => {
    if (!isEditing || !demandId) return;
    try {
      await updateDemand.mutateAsync({ id: demandId, is_active: false });
      navigate('/prontuario/pad');
    } catch {
      // Error already handled by hook
    }
  };

  const resetPadItemForm = (type: PadItemType = 'shift') => {
    if (type === 'shift') {
      setPadItemForm({
        ...DEFAULT_PAD_ITEM_FORM,
        type,
      });
      return;
    }

    setPadItemForm({
      ...DEFAULT_PAD_ITEM_FORM,
      type,
      hours_per_day: '',
      shift_duration_hours: '',
      frequency: 'weekly',
      quantity: '1',
    });
  };

  const handleOpenCreatePadItem = () => {
    setEditingPadItem(null);
    resetPadItemForm('shift');
    setPadItemErrors({});
    setIsPadItemModalOpen(true);
  };

  const handleOpenEditPadItem = (item: PadItemWithProfession) => {
    setEditingPadItem(item);
    setPadItemErrors({});
    setPadItemForm({
      type: item.type,
      profession_id: item.profession_id,
      hours_per_day: item.hours_per_day?.toString() || '',
      shift_duration_hours: item.shift_duration_hours?.toString() || '',
      frequency: item.frequency || 'weekly',
      quantity: item.quantity?.toString() || '1',
    });
    setIsPadItemModalOpen(true);
  };

  const handleClosePadItemModal = () => {
    setIsPadItemModalOpen(false);
    setEditingPadItem(null);
    setPadItemErrors({});
    resetPadItemForm('shift');
  };

  const handlePadItemFieldChange = (field: keyof PadItemFormData, value: string) => {
    if (field === 'type') {
      const nextType = value as PadItemType;
      if (nextType === 'shift') {
        setPadItemForm((prev) => ({
          ...prev,
          type: nextType,
          hours_per_day: prev.hours_per_day || '12',
          shift_duration_hours: prev.shift_duration_hours || '12',
        }));
      } else {
        setPadItemForm((prev) => ({
          ...prev,
          type: nextType,
          frequency: prev.frequency || 'weekly',
          quantity: prev.quantity || '1',
        }));
      }
    } else {
      setPadItemForm((prev) => ({ ...prev, [field]: value }));
    }

    setPadItemErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validatePadItemForm = () => {
    const nextErrors: PadItemFormErrors = {};

    if (!padItemForm.profession_id) {
      nextErrors.profession_id = 'Profissão é obrigatória';
    }

    if (padItemForm.type === 'shift') {
      const hoursPerDay = Number(padItemForm.hours_per_day);
      const shiftDuration = Number(padItemForm.shift_duration_hours);

      if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) {
        nextErrors.hours_per_day = 'Horas por dia deve ser maior que zero';
      }

      if (!Number.isFinite(shiftDuration) || shiftDuration <= 0) {
        nextErrors.shift_duration_hours = 'Duração do plantão deve ser maior que zero';
      }
    } else {
      const quantity = Number(padItemForm.quantity);

      if (!padItemForm.frequency) {
        nextErrors.frequency = 'Frequência é obrigatória';
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        nextErrors.quantity = 'Quantidade deve ser maior que zero';
      }
    }

    setPadItemErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSavePadItem = async () => {
    if (!currentPadId) return;
    if (!validatePadItemForm()) return;

    const itemPayload =
      padItemForm.type === 'shift'
        ? {
            type: padItemForm.type,
            profession_id: padItemForm.profession_id,
            hours_per_day: Number(padItemForm.hours_per_day),
            shift_duration_hours: Number(padItemForm.shift_duration_hours),
            frequency: null,
            quantity: null,
          }
        : {
            type: padItemForm.type,
            profession_id: padItemForm.profession_id,
            hours_per_day: null,
            shift_duration_hours: null,
            frequency: padItemForm.frequency,
            quantity: Number(padItemForm.quantity),
          };

    try {
      if (editingPadItem) {
        await updatePadItem.mutateAsync({
          id: editingPadItem.id,
          ...itemPayload,
        });
      } else {
        await createPadItem.mutateAsync({
          pad_id: currentPadId,
          ...itemPayload,
        });
      }

      handleClosePadItemModal();
    } catch {
      // Error already handled by hook
    }
  };

  const handleDeletePadItem = async (item: PadItemWithProfession) => {
    if (!window.confirm(`Deseja remover o item ${PAD_ITEM_TYPE_LABEL[item.type]}?`)) {
      return;
    }

    try {
      await deletePadItem.mutateAsync(item.id);
    } catch {
      // Error already handled by hook
    }
  };

  const getPadItemDescription = (item: PadItemWithProfession) => {
    if (item.type === 'shift') {
      const hoursPerDay = item.hours_per_day ?? 0;
      const shiftDuration = item.shift_duration_hours ?? 0;
      return `${hoursPerDay}h por dia - plantões de ${shiftDuration}h`;
    }

    const frequencyLabel = item.frequency ? PAD_ITEM_FREQUENCY_LABEL[item.frequency] : '-';
    return `${frequencyLabel} - quantidade ${item.quantity ?? 0}`;
  };

  const breadcrumbItems = [
    { label: 'PAD', href: '/prontuario/pad' },
    { label: isEditing ? 'Editar PAD' : 'Novo PAD' },
  ];

  const isPadFormSaving = createDemand.isPending || updateDemand.isPending;
  const isPadItemSaving = createPadItem.isPending || updatePadItem.isPending;

  if (isEditing && isLoadingDemand) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-4 lg:px-4">
        <Breadcrumbs items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
        <div className="flex items-center gap-3">
          <Button
            onClick={handleBack}
            variant="outline"
            icon={<ArrowLeft className="h-5 w-5" />}
            showIcon
            label="Voltar"
          />
          {isEditing && demand?.is_active && (
            <Button
              onClick={handleDeactivate}
              variant="danger"
              showIcon={false}
              disabled={updateDemand.isPending}
              label="Desativar"
            />
          )}
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="solid"
            showIcon={false}
            disabled={isPadFormSaving}
            label={isEditing ? 'Salvar Alterações' : 'Criar PAD'}
          />
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Select
            label="Paciente"
            options={patientOptions}
            value={patientIdValue}
            {...register('patient_id', { required: 'Paciente é obrigatório' })}
            error={errors.patient_id?.message}
            required
            disabled={isEditing}
          />

          <Select
            label="Fonte Pagadora"
            options={patientPayerOptions}
            value={patientPayerIdValue}
            {...register('patient_payer_id', { required: 'Fonte pagadora é obrigatória' })}
            error={errors.patient_payer_id?.message}
            required
            disabled={!patientIdValue || patientPayerOptions.length === 1}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Select
              label="Unidade"
              options={companyUnitOptions}
              value={companyUnitIdValue}
              {...register('company_unit_id', { required: 'Unidade é obrigatória' })}
              error={errors.company_unit_id?.message}
              required
            />

            <Select
              label="Profissional Responsável"
              options={professionalOptions}
              value={professionalIdValue}
              {...register('professional_id', { required: 'Profissional responsável é obrigatório' })}
              error={errors.professional_id?.message}
              required
            />

            <Select
              label="Tipo de Assistência"
              options={padServiceOptions}
              value={padServiceIdValue}
              {...register('pad_service_id', { required: 'Tipo de assistência é obrigatório' })}
              error={errors.pad_service_id?.message}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {(() => {
              const { onChange, onBlur, name } = register('start_date', {
                required: 'Data inicial é obrigatória',
              });
              return (
                <DatePicker
                  label="Data Inicial"
                  placeholder="Selecione"
                  value={startDateValue}
                  onChange={onChange}
                  onBlur={onBlur}
                  name={name}
                  error={errors.start_date?.message}
                  required
                />
              );
            })()}

            {(() => {
              const { onChange, onBlur, name } = register('start_time', {
                required: 'Horário inicial é obrigatório',
              });
              return (
                <TimePicker
                  label="Hora Inicial"
                  placeholder="--:--"
                  value={startTimeValue}
                  onChange={onChange}
                  onBlur={onBlur}
                  name={name}
                  error={errors.start_time?.message}
                  required
                />
              );
            })()}

            {(() => {
              const { onChange, onBlur, name } = register('end_date', {
                required: 'Data final é obrigatória',
                validate: (value) => {
                  const start = watch('start_date');
                  if (start && value < start) return 'Data final deve ser após a data inicial';
                  return true;
                },
              });
              return (
                <DatePicker
                  label="Data Final"
                  placeholder="Selecione"
                  value={endDateValue}
                  onChange={onChange}
                  onBlur={onBlur}
                  name={name}
                  error={errors.end_date?.message}
                  required
                />
              );
            })()}

            {(() => {
              const { onChange, onBlur, name } = register('end_time', {
                required: 'Horário final é obrigatório',
                validate: (value) => {
                  const startDate = watch('start_date');
                  const endDate = watch('end_date');
                  const startTime = watch('start_time');

                  if (!startDate || !endDate || !startTime || !value) return true;
                  if (startDate === endDate && value <= startTime) {
                    return 'Horário final deve ser maior que o inicial';
                  }
                  return true;
                },
              });
              return (
                <TimePicker
                  label="Hora Final"
                  placeholder="--:--"
                  value={endTimeValue}
                  onChange={onChange}
                  onBlur={onBlur}
                  name={name}
                  error={errors.end_time?.message}
                  required
                />
              );
            })()}
          </div>

          <Textarea
            label="Observações"
            placeholder="Observações opcionais sobre este PAD..."
            {...register('notes')}
            rows={3}
          />
        </form>
      </Card>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Itens do PAD</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure os itens de atendimento por tipo: plantão, visita ou sessão.
              </p>
            </div>
            <Button
              type="button"
              variant="solid"
              icon={<Plus className="h-4 w-4" />}
              showIcon
              label="Adicionar item"
              onClick={handleOpenCreatePadItem}
              disabled={!currentPadId}
            />
          </div>

          {!currentPadId && (
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Salve o PAD para habilitar o gerenciamento de itens.
            </div>
          )}

          {currentPadId && isLoadingPadItems && (
            <div className="flex items-center justify-center py-6">
              <Loading size="md" />
            </div>
          )}

          {currentPadId && !isLoadingPadItems && padItems.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Nenhum item cadastrado para este PAD.
            </div>
          )}

          {currentPadId && !isLoadingPadItems && padItems.length > 0 && (
            <div className="space-y-3">
              {padItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">{PAD_ITEM_TYPE_LABEL[item.type]}</Badge>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.profession?.name || 'Profissão não encontrada'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {getPadItemDescription(item)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        icon={<Pencil className="h-4 w-4" />}
                        showIcon
                        label="Editar"
                        onClick={() => handleOpenEditPadItem(item)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        icon={<Trash2 className="h-4 w-4" />}
                        showIcon
                        label="Remover"
                        onClick={() => handleDeletePadItem(item)}
                        disabled={deletePadItem.isPending}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Modal
        isOpen={isPadItemModalOpen}
        onClose={handleClosePadItemModal}
        title={editingPadItem ? 'Editar Item do PAD' : 'Novo Item do PAD'}
        size="md"
      >
        <div className="space-y-4">
          <Select
            label="Tipo"
            options={PAD_ITEM_TYPE_OPTIONS}
            value={padItemForm.type}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              handlePadItemFieldChange('type', event.target.value)
            }
          />

          <Select
            label="Profissão"
            options={professionOptions}
            value={padItemForm.profession_id}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              handlePadItemFieldChange('profession_id', event.target.value)
            }
            error={padItemErrors.profession_id}
            required
          />

          {padItemForm.type === 'shift' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Horas por Dia"
                type="number"
                min={1}
                value={padItemForm.hours_per_day}
                onChange={(e) => handlePadItemFieldChange('hours_per_day', e.target.value)}
                error={padItemErrors.hours_per_day}
                required
              />
              <Input
                label="Duração do Plantão (h)"
                type="number"
                min={1}
                value={padItemForm.shift_duration_hours}
                onChange={(e) => handlePadItemFieldChange('shift_duration_hours', e.target.value)}
                error={padItemErrors.shift_duration_hours}
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Frequência"
                options={FREQUENCY_OPTIONS}
                value={padItemForm.frequency}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  handlePadItemFieldChange('frequency', event.target.value)
                }
                error={padItemErrors.frequency}
                required
              />
              <Input
                label="Quantidade"
                type="number"
                min={1}
                value={padItemForm.quantity}
                onChange={(e) => handlePadItemFieldChange('quantity', e.target.value)}
                error={padItemErrors.quantity}
                required
              />
            </div>
          )}
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            showIcon={false}
            onClick={handleClosePadItemModal}
            label="Cancelar"
          />
          <Button
            type="button"
            variant="solid"
            showIcon={false}
            onClick={handleSavePadItem}
            isLoading={isPadItemSaving}
            label={editingPadItem ? 'Salvar item' : 'Adicionar item'}
          />
        </ModalFooter>
      </Modal>
    </div>
  );
}

