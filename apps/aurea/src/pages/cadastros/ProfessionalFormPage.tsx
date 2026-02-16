import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  Card,
  Button,
  Input,
  Select,
  Loading,
  Breadcrumbs,
  SwitchNew,
  TabButton,
} from '@/components/ui';
import {
  useProfessional,
  useCreateProfessional,
  useUpdateProfessional,
} from '@/hooks/useProfessionals';
import { useForm } from 'react-hook-form';
import { useNavigationGuard } from '@/contexts/NavigationGuardContext';
import { useAuthStore } from '@/stores/authStore';
import {
  getProfessionalSignatureSignedUrl,
  saveProfessionalSignature,
  validateProfessionalSignatureFile,
} from '@/lib/professionalSignatureStorage';
import toast from 'react-hot-toast';

interface ProfessionalFormData {
  code: string;
  name: string;
  role: string;
  council_type: string;
  council_number: string;
  council_uf: string;
  phone: string;
  email: string;
  active: boolean;
}

type FormTab = 'basic' | 'council' | 'contact';

const UF_OPTIONS = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
].map((uf) => ({ value: uf, label: uf }));

const COUNCIL_OPTIONS = [
  { value: 'CRM', label: 'CRM - Medicina' },
  { value: 'COREN', label: 'COREN - Enfermagem' },
  { value: 'CREFITO', label: 'CREFITO - Fisioterapia' },
  { value: 'CRN', label: 'CRN - NutriÃ§Ã£o' },
  { value: 'CRF', label: 'CRF - FarmÃ¡cia' },
  { value: 'CRP', label: 'CRP - Psicologia' },
  { value: 'CREFONO', label: 'CREFONO - Fonoaudiologia' },
  { value: 'CRESS', label: 'CRESS - ServiÃ§o Social' },
  { value: 'CRO', label: 'CRO - Odontologia' },
  { value: 'OUTRO', label: 'Outro' },
];

const ROLE_OPTIONS = [
  { value: 'MÃ©dico', label: 'MÃ©dico' },
  { value: 'Enfermeiro', label: 'Enfermeiro' },
  { value: 'TÃ©cnico de Enfermagem', label: 'TÃ©cnico de Enfermagem' },
  { value: 'Fisioterapeuta', label: 'Fisioterapeuta' },
  { value: 'Nutricionista', label: 'Nutricionista' },
  { value: 'FarmacÃªutico', label: 'FarmacÃªutico' },
  { value: 'PsicÃ³logo', label: 'PsicÃ³logo' },
  { value: 'FonoaudiÃ³logo', label: 'FonoaudiÃ³logo' },
  { value: 'Assistente Social', label: 'Assistente Social' },
  { value: 'Cuidador', label: 'Cuidador' },
  { value: 'Outro', label: 'Outro' },
];

const formatPhoneInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';

  if (digits.length <= 2) return `(${digits}`;

  const area = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length <= 6) return `(${area}) ${rest}`;

  if (digits.length <= 10) {
    const prefix = rest.slice(0, 4);
    const suffix = rest.slice(4);
    return `(${area}) ${prefix}${suffix ? `-${suffix}` : ''}`;
  }

  const prefix = rest.slice(0, 5);
  const suffix = rest.slice(5);
  return `(${area}) ${prefix}${suffix ? `-${suffix}` : ''}`;
};

export default function ProfessionalFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id && id !== 'novo';

  const {
    setHasUnsavedChanges,
    safeNavigate,
    handleLinkClick: handleBreadcrumbNavigate,
  } = useNavigationGuard();

  const [activeTab, setActiveTab] = useState<FormTab>('basic');
  const [phoneValue, setPhoneValue] = useState('');
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(null);
  const [signaturePath, setSignaturePath] = useState<string | null>(null);
  const [removeSignatureOnSave, setRemoveSignatureOnSave] = useState(false);
  const [isLoadingSignaturePreview, setIsLoadingSignaturePreview] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const signatureObjectUrlRef = useRef<string | null>(null);

  const { data: professional, isLoading } = useProfessional(isEditing ? id : undefined);
  const createProfessional = useCreateProfessional();
  const updateProfessional = useUpdateProfessional();
  const { company } = useAuthStore();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfessionalFormData>({
    defaultValues: {
      code: '',
      name: '',
      role: '',
      council_type: '',
      council_number: '',
      council_uf: '',
      phone: '',
      email: '',
      active: true,
    },
  });

  const roleValue = watch('role');
  const councilTypeValue = watch('council_type');
  const councilUfValue = watch('council_uf');
  const activeValue = watch('active');
  const hasSignaturePendingChanges = Boolean(signatureFile) || removeSignatureOnSave;
  const { ref: activeRef, name: activeName, onBlur: activeOnBlur } = register('active');

  const clearSignatureObjectUrl = useCallback(() => {
    if (signatureObjectUrlRef.current) {
      URL.revokeObjectURL(signatureObjectUrlRef.current);
      signatureObjectUrlRef.current = null;
    }
  }, []);

  const loadSignaturePreview = useCallback(async (path: string) => {
    setIsLoadingSignaturePreview(true);
    try {
      const signedUrl = await getProfessionalSignatureSignedUrl(path);
      setSignaturePreviewUrl(signedUrl);
    } catch (error) {
      console.error('Error loading professional signature preview:', error);
      setSignaturePreviewUrl(null);
      toast.error('Nao foi possivel carregar a assinatura do profissional.');
    } finally {
      setIsLoadingSignaturePreview(false);
    }
  }, []);

  useEffect(() => {
    setHasUnsavedChanges(isDirty || hasSignaturePendingChanges);
    return () => {
      setHasUnsavedChanges(false);
    };
  }, [isDirty, hasSignaturePendingChanges, setHasUnsavedChanges]);

  useEffect(() => {
    return () => {
      if (signatureObjectUrlRef.current) {
        URL.revokeObjectURL(signatureObjectUrlRef.current);
        signatureObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty || hasSignaturePendingChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, hasSignaturePendingChanges]);

  useEffect(() => {
    if (isEditing && professional) {
      const formattedPhone = formatPhoneInput(professional.phone || '');
      reset({
        code: professional.code || '',
        name: professional.name,
        role: professional.role || '',
        council_type: professional.council_type || '',
        council_number: professional.council_number || '',
        council_uf: professional.council_uf || '',
        phone: formattedPhone,
        email: professional.email || '',
        active: professional.active ?? true,
      });
      setPhoneValue(formattedPhone);
      clearSignatureObjectUrl();
      setSignatureFile(null);
      setRemoveSignatureOnSave(false);
      setSignaturePath(professional.signature_path || null);
      if (professional.signature_path) {
        void loadSignaturePreview(professional.signature_path);
      } else {
        setSignaturePreviewUrl(null);
      }
    } else if (!isEditing) {
      reset({
        code: '',
        name: '',
        role: '',
        council_type: '',
        council_number: '',
        council_uf: '',
        phone: '',
        email: '',
        active: true,
      });
      setPhoneValue('');
      clearSignatureObjectUrl();
      setSignatureFile(null);
      setRemoveSignatureOnSave(false);
      setSignaturePath(null);
      setSignaturePreviewUrl(null);
    }
  }, [isEditing, professional, reset, clearSignatureObjectUrl, loadSignaturePreview]);

  const handleSignatureFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileValidationError = validateProfessionalSignatureFile(file);
    if (fileValidationError) {
      toast.error(fileValidationError);
      event.target.value = '';
      return;
    }

    clearSignatureObjectUrl();
    const previewObjectUrl = URL.createObjectURL(file);
    signatureObjectUrlRef.current = previewObjectUrl;

    setSignatureFile(file);
    setSignaturePreviewUrl(previewObjectUrl);
    setRemoveSignatureOnSave(false);
    event.target.value = '';
  };

  const handleRemoveSignature = () => {
    clearSignatureObjectUrl();
    setSignatureFile(null);
    setSignaturePreviewUrl(null);
    setRemoveSignatureOnSave(!!signaturePath);
  };

  const onSubmit = async (data: ProfessionalFormData) => {
    const payload = {
      code: data.code || null,
      name: data.name,
      role: data.role || null,
      council_type: data.council_type || null,
      council_number: data.council_number || null,
      council_uf: data.council_uf || null,
      phone: phoneValue || null,
      email: data.email || null,
      active: data.active,
    };

    let savedProfessional: { id: string; signature_path?: string | null } | null = null;

    try {
      if (isEditing && professional) {
        savedProfessional = await updateProfessional.mutateAsync({
          id: professional.id,
          ...payload,
        });
      } else {
        savedProfessional = await createProfessional.mutateAsync(payload);
      }
    } catch {
      return;
    }

    if (!savedProfessional) return;

    const hasSignatureChanges = Boolean(signatureFile) || removeSignatureOnSave;

    if (hasSignatureChanges) {
      if (!company?.id) {
        toast.error('Nao foi possivel identificar a empresa para salvar a assinatura.');
        return;
      }

      setIsSavingSignature(true);
      try {
        await saveProfessionalSignature({
          companyId: company.id,
          professionalId: savedProfessional.id,
          currentSignaturePath: signaturePath,
          signatureFile,
          removeCurrent: removeSignatureOnSave,
        });
      } catch (error) {
        console.error('Error saving professional signature:', error);
        toast.error('Profissional salvo, mas houve erro ao salvar a assinatura.');
        return;
      } finally {
        setIsSavingSignature(false);
      }
    }

    setHasUnsavedChanges(false);
    navigate('/profissionais');
  };

  const handleBack = () => {
    safeNavigate('/profissionais');
  };

  const breadcrumbItems = [
    { label: 'Profissionais', href: '/profissionais' },
    { label: isEditing ? professional?.name || 'Carregando...' : 'Novo Profissional' },
  ];

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com Breadcrumbs e BotÃµes */}
      <div className="flex items-center justify-between px-4 lg:px-4">
        <Breadcrumbs items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
        <div className="flex items-center gap-3">
          <Button
            onClick={handleBack}
            variant="outline"
            size="md"
            icon={<ArrowLeft className="h-4 w-4" />}
            label="Voltar"
          />
          <Button
            onClick={handleSubmit(onSubmit)}
            variant="solid"
            showIcon={false}
            disabled={
              createProfessional.isPending || updateProfessional.isPending || isSavingSignature
            }
            label={isEditing ? 'Salvar AlteraÃ§Ãµes' : 'Cadastrar Profissional'}
          />
        </div>
      </div>

      <Card padding="none">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex px-6">
            <TabButton active={activeTab === 'basic'} onClick={() => setActiveTab('basic')}>
              Dados Cadastrais
            </TabButton>
            <TabButton active={activeTab === 'council'} onClick={() => setActiveTab('council')}>
              RemuneraÃ§Ã£o
            </TabButton>
            <TabButton active={activeTab === 'contact'} onClick={() => setActiveTab('contact')}>
              Escala
            </TabButton>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Input
                    label="CÃ³digo Externo"
                    placeholder="CÃ³digo do sistema externo"
                    {...register('code')}
                  />
                  <Input
                    label="Nome Completo"
                    placeholder="Nome do profissional"
                    {...register('name', { required: 'Nome Ã© obrigatÃ³rio' })}
                    error={errors.name?.message}
                    required
                  />
                  <Select
                    label="FunÃ§Ã£o"
                    options={ROLE_OPTIONS}
                    placeholder="Selecione..."
                    value={roleValue}
                    {...register('role')}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Select
                    label="Conselho"
                    options={COUNCIL_OPTIONS}
                    placeholder="Selecione..."
                    value={councilTypeValue}
                    {...register('council_type')}
                  />
                  <Input label="NÃºmero" placeholder="123456" {...register('council_number')} />
                  <Select
                    label="UF"
                    options={UF_OPTIONS}
                    placeholder="UF"
                    value={councilUfValue}
                    {...register('council_uf')}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Telefone"
                    placeholder="(00) 00000-0000"
                    {...register('phone')}
                    inputMode="numeric"
                    value={phoneValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const formatted = formatPhoneInput(e.target.value);
                      setPhoneValue(formatted);
                      setValue('phone', formatted, { shouldDirty: true });
                    }}
                  />
                  <Input
                    label="E-mail"
                    type="email"
                    placeholder="email@exemplo.com"
                    {...register('email')}
                  />
                </div>

                <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Assinatura para impressao
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Envie um arquivo PNG com fundo transparente (maximo 2MB). Esta assinatura sera
                      usada na impressao de prescricoes e relatorios.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex h-24 w-full items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 p-2 md:w-64 dark:border-gray-600 dark:bg-gray-900/40">
                      {isLoadingSignaturePreview ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Carregando assinatura...
                        </span>
                      ) : signaturePreviewUrl ? (
                        <img
                          src={signaturePreviewUrl}
                          alt="Assinatura do profissional"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Nenhuma assinatura selecionada
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <input
                        type="file"
                        ref={signatureInputRef}
                        className="hidden"
                        accept="image/png"
                        onChange={handleSignatureFileChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        showIcon={false}
                        onClick={() => signatureInputRef.current?.click()}
                        label="Selecionar PNG"
                      />
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        showIcon={false}
                        onClick={handleRemoveSignature}
                        disabled={!signaturePreviewUrl && !signaturePath && !signatureFile}
                        label="Remover assinatura"
                      />
                    </div>
                  </div>

                  {signatureFile && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Arquivo selecionado: {signatureFile.name}
                    </p>
                  )}

                  {removeSignatureOnSave && !signatureFile && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      A assinatura atual sera removida quando voce salvar.
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <SwitchNew
                    label="Status"
                    showStatus
                    className="w-fit"
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

            {activeTab === 'council' && (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Funcionalidade em desenvolvimento.
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Funcionalidade em desenvolvimento.
              </div>
            )}
          </form>
        </div>
      </Card>
    </div>
  );
}
