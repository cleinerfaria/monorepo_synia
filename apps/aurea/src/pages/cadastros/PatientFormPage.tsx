import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  Card,
  ButtonNew,
  TabButton,
  Input,
  DatePicker,
  Select,
  Loading,
  Breadcrumbs,
  SwitchNew,
} from '@/components/ui';

// Função de máscara para CPF
const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

// Função de validação de CPF (algoritmo dos dígitos verificadores)
const validateCPF = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, '');

  // CPF deve ter 11 dígitos
  if (digits.length !== 11) return false;

  // Verifica se todos os dígitos são iguais (CPFs inválidos conhecidos)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Calcula o primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;

  // Calcula o segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[10])) return false;

  return true;
};
import {
  usePatient,
  useCreatePatient,
  useUpdatePatient,
  usePatientAddresses,
  usePatientContacts,
  usePatientPayers,
  useSavePatientAddresses,
  useSavePatientContacts,
  useSavePatientPayers,
} from '@/hooks/usePatients';
import { useClients } from '@/hooks/useClients';
import { useForm } from 'react-hook-form';
import type {
  Client,
  PatientAddress,
  PatientContact,
  PatientPayer,
  GenderType,
} from '@/types/database';
import { useNavigationGuard } from '@/contexts/NavigationGuardContext';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import PatientAddressForm from '@/components/patient/PatientAddressForm';
import PatientContactForm from '@/components/patient/PatientContactForm';
import PatientPayerForm from '@/components/patient/PatientPayerForm';
import { differenceInYears, parse, differenceInMonths, differenceInDays } from 'date-fns';
import { todayDateOnly } from '@/lib/dateOnly';

type FormTab = 'basic' | 'address' | 'contact' | 'payers';

interface PatientFormData {
  code: string;
  name: string;
  cpf: string;
  birth_date: string;
  gender: GenderType | '';
  father_name: string;
  mother_name: string;
  phone: string;
  email: string;
  address: string;
  billing_client_id: string;
  active: boolean;
}

export default function PatientFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id && id !== 'novo';

  // Contexto de navegação protegida
  const {
    setHasUnsavedChanges: setGlobalUnsavedChanges,
    safeNavigate,
    handleLinkClick: handleBreadcrumbNavigate,
  } = useNavigationGuard();
  const { company } = useAuthStore();

  // Estado de abas e formulário
  const [activeTab, setActiveTab] = useState<FormTab>('basic');
  const [localUnsavedChanges, setLocalUnsavedChanges] = useState(false);
  const [patientAge, setPatientAge] = useState<{
    years: number;
    months: number;
    days: number;
  } | null>(null);

  // Função para calcular idade detalhada a partir da data de nascimento
  const calculateAge = (
    birthDateStr: string
  ): { years: number; months: number; days: number } | null => {
    if (!birthDateStr) return null;
    try {
      const birthDate = parse(birthDateStr, 'yyyy-MM-dd', new Date());
      const today = new Date();

      const years = differenceInYears(today, birthDate);
      // Para calcular meses, precisamos ajustar para depois do último aniversário
      const afterLastBirthday = new Date(birthDate);
      afterLastBirthday.setFullYear(afterLastBirthday.getFullYear() + years);
      const months = differenceInMonths(today, afterLastBirthday);

      // Para calcular dias, precisamos ajustar para depois do último mês
      const afterLastMonth = new Date(afterLastBirthday);
      afterLastMonth.setMonth(afterLastMonth.getMonth() + months);
      const days = differenceInDays(today, afterLastMonth);

      return { years, months, days };
    } catch {
      return null;
    }
  };

  // Função para formatar a exibição da idade
  const formatAge = (age: { years: number; months: number; days: number } | null): string => {
    if (!age) return '';

    if (age.years === 0) {
      // Recém-nascido: mostrar meses e dias
      if (age.months === 0) {
        return `${age.days} ${age.days === 1 ? 'dia' : 'dias'}`;
      }
      return `${age.months} ${age.months === 1 ? 'mês' : 'meses'} e ${age.days} ${age.days === 1 ? 'dia' : 'dias'}`;
    } else {
      // Maior de 1 ano: mostrar anos e meses
      return `${age.years} ${age.years === 1 ? 'ano' : 'anos'} e ${age.months} ${age.months === 1 ? 'mês' : 'meses'}`;
    }
  };

  // Busca o paciente se estiver editando
  const { data: patient, isLoading: isLoadingPatient } = usePatient(isEditing ? id : undefined);

  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();

  const { data: clientsData = [] } = useClients();
  const clients = clientsData as Client[];

  // Estados para dados relacionados
  const [addresses, setAddresses] = useState<PatientAddress[]>([]);
  const [contacts, setContacts] = useState<PatientContact[]>([]);
  const [payers, setPayers] = useState<PatientPayer[]>([]);

  // Hooks para carregar dados relacionados (somente ao editar)
  const { data: existingAddresses = [] } = usePatientAddresses(isEditing ? id : undefined);
  const { data: existingContacts = [] } = usePatientContacts(isEditing ? id : undefined);
  const { data: existingPayers = [] } = usePatientPayers(isEditing ? id : undefined);

  // Hooks para salvar dados relacionados
  const saveAddresses = useSavePatientAddresses();
  const saveContacts = useSavePatientContacts();
  const savePayers = useSavePatientPayers();

  const [selectedClientId, setSelectedClientId] = useState('');
  const [cpfValue, setCpfValue] = useState('');
  const [cpfError, setCpfError] = useState<string | undefined>(undefined);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<PatientFormData>({
    defaultValues: {
      code: '',
      name: '',
      cpf: '',
      birth_date: '',
      gender: '',
      father_name: '',
      mother_name: '',
      phone: '',
      email: '',
      address: '',
      billing_client_id: '',
      active: true,
    },
  });

  const {
    ref: birthDateRef,
    min: _birthDateMin,
    max: _birthDateMax,
    ...birthDateField
  } = register('birth_date');

  // Assistir mudanças na data de nascimento
  const birthDate = watch('birth_date');
  const gender = watch('gender');
  const activeValue = watch('active');
  const { ref: activeRef, name: activeName, onBlur: activeOnBlur } = register('active');

  // Handler para aplicar máscara de CPF
  const handleCPFChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCPF(e.target.value);
      setCpfValue(formatted);
      setValue('cpf', formatted, { shouldDirty: true });
      // Limpa o erro enquanto está digitando
      if (cpfError) setCpfError(undefined);
    },
    [setValue, cpfError]
  );

  // Validação de CPF ao sair do campo
  const handleCPFBlur = useCallback(() => {
    if (cpfValue) {
      const digits = cpfValue.replace(/\D/g, '');
      if (digits.length > 0 && digits.length < 11) {
        setCpfError('CPF incompleto');
      } else if (digits.length === 11 && !validateCPF(cpfValue)) {
        setCpfError('CPF inválido');
      } else {
        setCpfError(undefined);
      }
    } else {
      setCpfError(undefined);
    }
  }, [cpfValue]);

  // Funções para salvar dados relacionados individualmente
  const handleSaveAddresses = async (addressesToSave: PatientAddress[]) => {
    if (!isEditing || !id) {
      toast.error('É necessário salvar o paciente primeiro');
      return;
    }

    try {
      await saveAddresses.mutateAsync({
        patientId: id,
        addresses: addressesToSave,
      });
      toast.success('Endereços salvos com sucesso!');
    } catch {
      toast.error('Erro ao salvar endereços');
    }
  };

  const handleSaveContacts = async (contactsToSave: PatientContact[]) => {
    if (!isEditing || !id) {
      toast.error('É necessário salvar o paciente primeiro');
      return;
    }

    try {
      await saveContacts.mutateAsync({
        patientId: id,
        contacts: contactsToSave,
      });
      toast.success('Contatos salvos com sucesso!');
    } catch {
      toast.error('Erro ao salvar contatos');
    }
  };

  const handleSavePayers = async (payersToSave: PatientPayer[]) => {
    if (!isEditing || !id) {
      toast.error('É necessário salvar o paciente primeiro');
      return;
    }

    try {
      await savePayers.mutateAsync({
        patientId: id,
        payers: payersToSave,
      });
      toast.success('Fontes pagadoras salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar fontes pagadoras');
    }
  };

  // Sincronizar estado de mudanças não salvas com o contexto global
  useEffect(() => {
    setGlobalUnsavedChanges(isDirty || localUnsavedChanges);
    return () => {
      setGlobalUnsavedChanges(false);
    };
  }, [isDirty, localUnsavedChanges, setGlobalUnsavedChanges]);

  // Atualizar idade quando data de nascimento muda
  useEffect(() => {
    if (birthDate) {
      setPatientAge(calculateAge(birthDate));
    } else {
      setPatientAge(null);
    }
  }, [birthDate]);

  // Alerta do browser ao fechar/recarregar a página
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty || localUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, localUnsavedChanges]);

  // Inicializa o formulário quando o paciente é carregado
  useEffect(() => {
    if (isEditing && patient) {
      const formattedCPF = patient.cpf ? formatCPF(patient.cpf) : '';

      reset({
        code: patient.code || '',
        name: patient.name,
        cpf: formattedCPF,
        birth_date: patient.birth_date || '',
        gender: (patient.gender || '') as PatientFormData['gender'],
        father_name: patient.father_name || '',
        mother_name: patient.mother_name || '',
        phone: patient.phone || '',
        email: patient.email || '',
        address: patient.address || '',
        billing_client_id: patient.billing_client_id || '',
        active: patient.active ?? true,
      });

      setCpfValue(formattedCPF);
      setSelectedClientId(patient.billing_client_id || '');
      // Calcular idade ao carregar o paciente
      if (patient.birth_date) {
        setPatientAge(calculateAge(patient.birth_date));
      }
    } else if (!isEditing) {
      // Novo paciente
      reset({
        code: '',
        name: '',
        cpf: '',
        birth_date: '',
        gender: '',
        father_name: '',
        mother_name: '',
        phone: '',
        email: '',
        address: '',
        billing_client_id: '',
        active: true,
      });

      setCpfValue('');
      setSelectedClientId('');
      setPatientAge(null);
    }
  }, [isEditing, patient, reset]);

  // Carregar dados relacionados ao editar
  useEffect(() => {
    if (isEditing && existingAddresses.length > 0) {
      setAddresses(existingAddresses);
    }
  }, [isEditing, existingAddresses]);

  useEffect(() => {
    if (isEditing && existingContacts.length > 0) {
      setContacts(existingContacts);
    }
  }, [isEditing, existingContacts]);

  useEffect(() => {
    if (isEditing && existingPayers.length > 0) {
      setPayers(existingPayers);
    }
  }, [isEditing, existingPayers]);

  const _clientOptions = [
    { value: '', label: 'Nenhum' },
    ...clients.filter((c) => c.active).map((c) => ({ value: c.id, label: c.name })),
  ];

  const genderOptions = [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Feminino' },
    { value: 'other', label: 'Outro' },
  ];

  const onSubmit = async (data: PatientFormData) => {
    // Validar CPF antes de salvar
    if (cpfValue) {
      const digits = cpfValue.replace(/\D/g, '');
      if (digits.length > 0 && digits.length < 11) {
        setCpfError('CPF incompleto');
        toast.error('CPF incompleto');
        return;
      }
      if (digits.length === 11 && !validateCPF(cpfValue)) {
        setCpfError('CPF inválido');
        toast.error('CPF inválido');
        return;
      }
    }

    const patientData = {
      ...data,
      code: data.code || null,
      cpf: cpfValue ? cpfValue.replace(/\D/g, '') : null, // Salvar apenas dígitos
      gender: data.gender || null,
      father_name: data.father_name || null,
      mother_name: data.mother_name || null,
      billing_client_id: selectedClientId || null,
    };

    try {
      let savedPatientId: string;

      if (isEditing && patient) {
        await updatePatient.mutateAsync({
          id: patient.id,
          ...patientData,
        });
        savedPatientId = patient.id;
      } else {
        const newPatient = await createPatient.mutateAsync(patientData);
        savedPatientId = newPatient.id;
      }

      // Salvar dados relacionados
      if (addresses.length > 0) {
        await saveAddresses.mutateAsync({
          patientId: savedPatientId,
          addresses,
        });
      }

      if (contacts.length > 0) {
        await saveContacts.mutateAsync({
          patientId: savedPatientId,
          contacts,
        });
      }

      if (payers.length > 0) {
        await savePayers.mutateAsync({
          patientId: savedPatientId,
          payers,
        });
      }

      setLocalUnsavedChanges(false);
      setGlobalUnsavedChanges(false);
      navigate('/pacientes');
    } catch {
      // Erro já tratado pelo hook
    }
  };

  const handleBack = () => {
    safeNavigate('/pacientes');
  };

  const breadcrumbItems = [
    { label: 'Pacientes', href: '/pacientes' },
    { label: isEditing ? patient?.name || 'Carregando...' : 'Novo Paciente' },
  ];

  if (isEditing && isLoadingPatient) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com Breadcrumbs e Botões */}
      <div className="flex items-center justify-between px-4 lg:px-4">
        <Breadcrumbs items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
        <div className="flex items-center gap-3">
          <ButtonNew
            onClick={handleBack}
            variant="outline"
            icon={<ArrowLeft className="h-5 w-5" />}
            showIcon
            label="Voltar"
          />
          <ButtonNew
            onClick={handleSubmit(onSubmit)}
            variant="solid"
            showIcon={false}
            disabled={createPatient.isPending || updatePatient.isPending}
            label={isEditing ? 'Salvar Alterações' : 'Cadastrar Paciente'}
          />
        </div>
      </div>

      {/* Tabs */}
      <Card padding="none">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex px-6">
            <TabButton active={activeTab === 'basic'} onClick={() => setActiveTab('basic')}>
              Dados Básicos
            </TabButton>
            <TabButton active={activeTab === 'address'} onClick={() => setActiveTab('address')}>
              Endereços
            </TabButton>
            <TabButton active={activeTab === 'contact'} onClick={() => setActiveTab('contact')}>
              Contatos
            </TabButton>
            <TabButton active={activeTab === 'payers'} onClick={() => setActiveTab('payers')}>
              Fontes Pagadoras
            </TabButton>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Aba: Dados Básicos */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                  <div className="md:col-span-1">
                    <Input label="Código" placeholder="Código" {...register('code')} />
                  </div>
                  <div className="md:col-span-5">
                    <Input
                      label="Nome Completo"
                      placeholder="Nome do paciente"
                      {...register('name', { required: 'Nome é obrigatório' })}
                      error={errors.name?.message}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                  <Select
                    label="Sexo"
                    options={genderOptions}
                    value={gender}
                    {...register('gender', { required: 'Sexo é obrigatório' })}
                    error={errors.gender?.message}
                    required
                  />
                  <Input
                    label="CPF"
                    placeholder="000.000.000-00"
                    value={cpfValue}
                    onChange={handleCPFChange}
                    onBlur={handleCPFBlur}
                    error={cpfError}
                  />
                  <div className="md:col-span-2">
                    <DatePicker
                      label="Data de Nascimento"
                      placeholder="Selecione uma data"
                      max={todayDateOnly()}
                      value={birthDate}
                      {...birthDateField}
                      ref={birthDateRef}
                    />
                  </div>
                  {patientAge !== null && (
                    <div className="flex flex-col justify-end">
                      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-center dark:border-blue-800 dark:bg-blue-900/20">
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                          {formatAge(patientAge)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Nome do Pai"
                    placeholder="Nome completo do pai"
                    {...register('father_name')}
                  />
                  <Input
                    label="Nome da Mãe"
                    placeholder="Nome completo da mãe"
                    {...register('mother_name')}
                  />
                </div>

                <div className="pt-2">
                  <SwitchNew
                    label="Status"
                    showStatus
                    name={activeName}
                    ref={activeRef}
                    onBlur={activeOnBlur}
                    checked={!!activeValue}
                    onChange={(e) => {
                      setValue('active', e.target.checked, { shouldDirty: true });
                    }}
                  />
                </div>
              </div>
            )}

            {/* Aba: Endereços */}
            {activeTab === 'address' && (
              <PatientAddressForm
                addresses={addresses}
                onChange={setAddresses}
                companyId={company?.id || ''}
                patientId={isEditing ? id : undefined}
                onSave={handleSaveAddresses}
                isSaving={saveAddresses.isPending}
              />
            )}

            {/* Aba: Contatos */}
            {activeTab === 'contact' && (
              <PatientContactForm
                contacts={contacts}
                onChange={setContacts}
                companyId={company?.id || ''}
                patientId={isEditing ? id : undefined}
                onSave={handleSaveContacts}
                isSaving={saveContacts.isPending}
              />
            )}

            {/* Aba: Fontes Pagadoras */}
            {activeTab === 'payers' && (
              <PatientPayerForm
                payers={payers}
                onChange={setPayers}
                companyId={company?.id || ''}
                patientId={isEditing ? id : undefined}
                clients={clients}
                onSave={handleSavePayers}
                isSaving={savePayers.isPending}
              />
            )}
          </form>
        </div>
      </Card>
    </div>
  );
}
