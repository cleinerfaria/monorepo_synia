import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  Card,
  Button,
  Breadcrumbs,
  Loading,
  DatePicker,
  TimePicker,
  Select,
  SwitchNew,
  Textarea,
} from '@/components/ui';
import {
  usePatientDemand,
  useCreateDemand,
  useUpdateDemand,
  type CreateDemandData,
} from '@/hooks/usePatientDemands';
import { usePatients } from '@/hooks/usePatients';
import { useForm } from 'react-hook-form';
import { useNavigationGuard } from '@/contexts/NavigationGuardContext';
import toast from 'react-hot-toast';

const HOURS_OPTIONS = [4, 6, 12, 24] as const;

interface PadFormData {
  patient_id: string;
  start_date: string;
  end_date: string;
  start_time: string;
  hours_per_day: string;
  is_split: boolean;
  notes: string;
}

export default function PadFormPage() {
  const { demandId } = useParams<{ demandId: string }>();
  const navigate = useNavigate();
  const isEditing = !!demandId;

  const {
    setHasUnsavedChanges: setGlobalUnsavedChanges,
    safeNavigate,
    handleLinkClick: handleBreadcrumbNavigate,
  } = useNavigationGuard();

  const [noEndDate, setNoEndDate] = useState(true);

  const { data: demand, isLoading: isLoadingDemand } = usePatientDemand(
    isEditing ? demandId : undefined
  );
  const { data: patients = [] } = usePatients();
  const createDemand = useCreateDemand();
  const updateDemand = useUpdateDemand();

  const patientOptions = useMemo(
    () =>
      patients
        .filter((p) => p.active)
        .map((p) => ({ value: p.id, label: p.name })),
    [patients]
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
      start_date: '',
      end_date: '',
      start_time: '',
      hours_per_day: '12',
      is_split: false,
      notes: '',
    },
  });

  const hoursPerDay = Number(watch('hours_per_day'));
  const isSplitValue = watch('is_split');
  const startTimeValue = watch('start_time');
  const startDateValue = watch('start_date');
  const endDateValue = watch('end_date');

  const canSplit = hoursPerDay === 12 || hoursPerDay === 24;

  // Reset is_split when hours_per_day changes and split is not allowed
  useEffect(() => {
    if (!canSplit && isSplitValue) {
      setValue('is_split', false, { shouldDirty: true });
    }
  }, [canSplit, isSplitValue, setValue]);

  // Load demand data into form when editing
  useEffect(() => {
    if (isEditing && demand) {
      setNoEndDate(!demand.end_date);
      reset({
        patient_id: demand.patient_id,
        start_date: demand.start_date,
        end_date: demand.end_date || '',
        start_time: demand.start_time.slice(0, 5),
        hours_per_day: String(demand.hours_per_day),
        is_split: demand.is_split,
        notes: demand.notes || '',
      });
    }
  }, [isEditing, demand, reset]);

  // Sync unsaved changes with navigation guard
  useEffect(() => {
    setGlobalUnsavedChanges(isDirty);
    return () => {
      setGlobalUnsavedChanges(false);
    };
  }, [isDirty, setGlobalUnsavedChanges]);

  // Browser close/reload alert
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
    const demandData: CreateDemandData = {
      patient_id: data.patient_id,
      start_date: data.start_date,
      end_date: noEndDate ? null : data.end_date || null,
      start_time: data.start_time,
      hours_per_day: Number(data.hours_per_day),
      is_split: canSplit ? data.is_split : false,
      notes: data.notes || null,
    };

    try {
      if (isEditing) {
        await updateDemand.mutateAsync({ id: demandId!, ...demandData });
      } else {
        await createDemand.mutateAsync(demandData);
      }
      setGlobalUnsavedChanges(false);
      navigate('/prontuario/pad');
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

  const breadcrumbItems = [
    { label: 'PAD', href: '/prontuario/pad' },
    { label: isEditing ? 'Editar Escala' : 'Nova Escala' },
  ];

  const splitDescription = useMemo(() => {
    if (!canSplit) return '';
    if (hoursPerDay === 24) return 'Gerar 2 turnos de 12h ao invés de 1 turno de 24h';
    if (hoursPerDay === 12) return 'Gerar 2 turnos de 6h ao invés de 1 turno de 12h';
    return '';
  }, [canSplit, hoursPerDay]);

  if (isEditing && isLoadingDemand) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
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
            disabled={createDemand.isPending || updateDemand.isPending}
            label={isEditing ? 'Salvar Alterações' : 'Criar Escala'}
          />
        </div>
      </div>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Paciente */}
          <Select
            label="Paciente"
            options={patientOptions}
            {...register('patient_id', { required: 'Paciente é obrigatório' })}
            error={errors.patient_id?.message}
            required
            disabled={isEditing}
          />

          {/* Período */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <DatePicker
              label="Data de Início"
              placeholder="Selecione"
              value={startDateValue}
              {...register('start_date', { required: 'Data de início é obrigatória' })}
              error={errors.start_date?.message}
              required
            />
            <div>
              <DatePicker
                label="Data de Término"
                placeholder="Selecione"
                value={endDateValue}
                {...register('end_date', {
                  validate: (value) => {
                    if (noEndDate) return true;
                    if (!value) return 'Data de término é obrigatória';
                    const start = watch('start_date');
                    if (start && value < start)
                      return 'Término deve ser após o início';
                    return true;
                  },
                })}
                error={errors.end_date?.message}
                disabled={noEndDate}
                required={!noEndDate}
              />
            </div>
            <div className="flex items-end pb-1">
              <SwitchNew
                label="Sem data de término"
                checked={noEndDate}
                onChange={(e) => {
                  setNoEndDate(e.target.checked);
                  if (e.target.checked) {
                    setValue('end_date', '', { shouldDirty: true });
                  }
                }}
              />
            </div>
          </div>

          {/* Configuração diária */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TimePicker
              label="Horário de Início"
              placeholder="--:--"
              value={startTimeValue}
              {...register('start_time', { required: 'Horário é obrigatório' })}
              error={errors.start_time?.message}
              required
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Horas por dia <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {HOURS_OPTIONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setValue('hours_per_day', String(h), { shouldDirty: true })}
                    className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      hoursPerDay === h
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              {errors.hours_per_day && (
                <p className="mt-1 text-sm text-red-500">{errors.hours_per_day.message}</p>
              )}
            </div>
          </div>

          {/* Divisão de turno */}
          <div className="flex items-center gap-4">
            <SwitchNew
              label="Dividir turno"
              checked={isSplitValue}
              disabled={!canSplit}
              onChange={(e) => {
                setValue('is_split', e.target.checked, { shouldDirty: true });
              }}
            />
            {splitDescription && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {splitDescription}
              </span>
            )}
          </div>

          {/* Observações */}
          <Textarea
            label="Observações"
            placeholder="Observações opcionais sobre esta escala..."
            {...register('notes')}
            rows={3}
          />
        </form>
      </Card>
    </div>
  );
}
