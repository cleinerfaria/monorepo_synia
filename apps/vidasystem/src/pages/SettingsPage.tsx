import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  ImageCropper,
  Select,
  Badge,
  Modal,
  ModalFooter,
  Switch,
  SwitchNew,
  TabButton,
  DataTable,
  EmptyState,
  IconButton,
} from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Building, SwatchBook, Landmark, Layers, Plus, Pencil, Stethoscope } from 'lucide-react';
import { UF_OPTIONS, fetchAddressFromZip, formatZipInput } from '@/lib/addressZip';
import {
  type CompanyUnit,
  type CompanyUnitType,
  useCompanyUnits,
  useCreateCompanyUnit,
  useUpdateCompanyUnit,
} from '@/hooks/useCompanyUnits';
import {
  type PadService,
  useCreatePadService,
  usePadServices,
  useTogglePadServiceStatus,
  useUpdatePadService,
} from '@/hooks/usePadServices';

type ActiveTab = 'company' | 'fiscal' | 'organization' | 'services' | 'theme';
type LogoVariant = 'collapsed_dark' | 'collapsed_light' | 'expanded_dark' | 'expanded_light';

interface CompanyFormData {
  name: string;
  trade_name: string;
  document: string;
  email: string;
  website: string;
  state_registration: string;
}

interface FiscalFormData {
  care_modality: string;
  tax_regime: string;
  special_tax_regime: string;
  taxation_nature: string;
  cnae: string;
  cnes: string;
}

interface CompanyUnitFormData {
  name: string;
  trade_name: string;
  document: string;
  zip: string;
  street: string;
  district: string;
  number: string;
  city: string;
  state: string;
  complement: string;
  unit_type: CompanyUnitType;
  is_active: boolean;
}

interface PadServiceFormData {
  code: string;
  name: string;
  description: string;
  sort_order: number;
  active: boolean;
}

const emptyUnitForm: CompanyUnitFormData = {
  name: '',
  trade_name: '',
  document: '',
  zip: '',
  street: '',
  district: '',
  number: '',
  city: '',
  state: '',
  complement: '',
  unit_type: 'filial',
  is_active: true,
};

const emptyPadServiceForm: PadServiceFormData = {
  code: '',
  name: '',
  description: '',
  sort_order: 0,
  active: true,
};

const UNIT_TYPE_OPTIONS: Array<{ value: CompanyUnitType; label: string }> = [
  { value: 'matriz', label: 'Matriz' },
  { value: 'filial', label: 'Filial' },
];

const UNIT_TYPE_LABEL: Record<CompanyUnitType, string> = {
  matriz: 'Matriz',
  filial: 'Filial',
};

const toNull = (value: string) => (value?.trim() ? value.trim() : null);

// Formatação de CNPJ/CPF
const formatCnpjCpfInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14);

  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('company');
  const [isUploadingLogo, setIsUploadingLogo] = useState<Record<LogoVariant, boolean>>({
    collapsed_dark: false,
    collapsed_light: false,
    expanded_dark: false,
    expanded_light: false,
  });
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<CompanyUnit | null>(null);
  const [isPadServiceModalOpen, setIsPadServiceModalOpen] = useState(false);
  const [editingPadService, setEditingPadService] = useState<PadService | null>(null);
  const [postalCodeValue, setPostalCodeValue] = useState('');
  const [documentValue, setDocumentValue] = useState('');
  const [isZipLookupLoading, setIsZipLookupLoading] = useState(false);
  const fileInputCollapsedDarkRef = useRef<HTMLInputElement>(null);
  const fileInputCollapsedLightRef = useRef<HTMLInputElement>(null);
  const fileInputExpandedDarkRef = useRef<HTMLInputElement>(null);
  const fileInputExpandedLightRef = useRef<HTMLInputElement>(null);

  // Image crop states
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState(1);
  const [cropType, setCropType] = useState<LogoVariant | null>(null);

  const logoInputRefs: Record<LogoVariant, React.RefObject<HTMLInputElement>> = {
    collapsed_dark: fileInputCollapsedDarkRef,
    collapsed_light: fileInputCollapsedLightRef,
    expanded_dark: fileInputExpandedDarkRef,
    expanded_light: fileInputExpandedLightRef,
  };

  const { primaryColor, setPrimaryColor, theme, setTheme } = useTheme();
  const { company } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: units = [], isLoading: isLoadingUnits } = useCompanyUnits();
  const { data: padServices = [], isLoading: isLoadingPadServices } = usePadServices(true);
  const createUnit = useCreateCompanyUnit();
  const updateUnit = useUpdateCompanyUnit();
  const createPadService = useCreatePadService();
  const updatePadService = useUpdatePadService();
  const togglePadServiceStatus = useTogglePadServiceStatus();

  const companyForm = useForm<CompanyFormData>({
    defaultValues: {
      name: '',
      trade_name: '',
      document: '',
      email: '',
      website: '',
      state_registration: '',
    },
  });

  const fiscalForm = useForm<FiscalFormData>({
    defaultValues: {
      care_modality: '',
      tax_regime: '',
      special_tax_regime: '',
      taxation_nature: '',
      cnae: '',
      cnes: '',
    },
  });

  const unitForm = useForm<CompanyUnitFormData>({
    defaultValues: emptyUnitForm,
  });
  const padServiceForm = useForm<PadServiceFormData>({
    defaultValues: emptyPadServiceForm,
  });

  const linkedUnit = useMemo<CompanyUnit | undefined>(
    () => units.find((unit) => unit.id === company?.company_unit_id),
    [units, company?.company_unit_id]
  );

  const hasMatrizUnit = useMemo(() => units.some((unit) => unit.unit_type === 'matriz'), [units]);
  const nextPadServiceSortOrder = useMemo(
    () =>
      padServices.length > 0
        ? Math.max(...padServices.map((service) => service.sort_order)) + 1
        : 1,
    [padServices]
  );

  useEffect(() => {
    if (!company) return;

    companyForm.reset({
      name: company.name || '',
      trade_name: company.trade_name || '',
      document: company.document || '',
      email: company.email || '',
      website: company.website || '',
      state_registration: company.state_registration || '',
    });

    fiscalForm.reset({
      care_modality: company.care_modality || '',
      tax_regime: company.tax_regime || '',
      special_tax_regime: company.special_tax_regime || '',
      taxation_nature: company.taxation_nature || '',
      cnae: company.cnae || '',
      cnes: company.cnes || '',
    });
  }, [company, companyForm, fiscalForm]);

  const updateCompany = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!company?.id) throw new Error('Company not found');

      const { error } = await supabase.from('company').update(updates).eq('id', company.id);

      if (error) throw error;
      return updates;
    },
    onSuccess: (data) => {
      const authStore = useAuthStore.getState();
      authStore.updateCompany(data);

      queryClient.invalidateQueries({ queryKey: ['company'] });
    },
  });

  const handleCompanySubmit = (data: CompanyFormData) => {
    updateCompany.mutate({
      name: data.name,
      trade_name: toNull(data.trade_name),
      document: toNull(data.document),
      email: toNull(data.email),
      website: toNull(data.website),
      state_registration: toNull(data.state_registration),
    });
  };

  const handleFiscalSubmit = (data: FiscalFormData) => {
    updateCompany.mutate({
      care_modality: toNull(data.care_modality),
      tax_regime: toNull(data.tax_regime),
      special_tax_regime: toNull(data.special_tax_regime),
      taxation_nature: toNull(data.taxation_nature),
      cnae: toNull(data.cnae),
      cnes: toNull(data.cnes),
    });
  };

  const handleOpenCreateUnitModal = () => {
    setEditingUnit(null);
    unitForm.reset({
      ...emptyUnitForm,
      unit_type: hasMatrizUnit ? 'filial' : 'matriz',
    });
    setDocumentValue('');
    setPostalCodeValue('');
    setIsZipLookupLoading(false);
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnitModal = useCallback(
    (unit: CompanyUnit) => {
      const formattedDocument = formatCnpjCpfInput(unit.document || '');
      const formattedPostalCode = formatZipInput(unit.zip || '');

      setEditingUnit(unit);
      unitForm.reset({
        name: unit.name || '',
        trade_name: unit.trade_name || '',
        document: formattedDocument,
        zip: formattedPostalCode,
        street: unit.street || '',
        district: unit.district || '',
        number: unit.number || '',
        city: unit.city || '',
        state: unit.state || '',
        complement: unit.complement || '',
        unit_type: unit.unit_type || 'filial',
        is_active: unit.is_active ?? true,
      });
      setDocumentValue(formattedDocument);
      setPostalCodeValue(formattedPostalCode);
      setIsZipLookupLoading(false);
      setIsUnitModalOpen(true);
    },
    [unitForm]
  );

  const handlePostalCodeChange = async (value: string) => {
    const formattedZip = formatZipInput(value);
    setPostalCodeValue(formattedZip);
    unitForm.setValue('zip', formattedZip, { shouldDirty: true });

    const digits = formattedZip.replace(/\D/g, '');
    if (digits.length !== 8) {
      setIsZipLookupLoading(false);
      return;
    }

    setIsZipLookupLoading(true);
    const zipData = await fetchAddressFromZip(formattedZip);
    setIsZipLookupLoading(false);

    if (unitForm.watch('zip') !== formattedZip) return;
    if (!zipData) return;

    const mappedFields: Array<[keyof CompanyUnitFormData, string | undefined]> = [
      ['street', zipData.logradouro],
      ['district', zipData.bairro],
      ['city', zipData.localidade],
      ['state', zipData.uf],
      ['complement', zipData.complemento],
    ];

    mappedFields.forEach(([field, fieldValue]) => {
      if (!fieldValue) return;
      unitForm.setValue(field, fieldValue, { shouldDirty: true });
    });
  };

  const handleCloseUnitModal = () => {
    setIsUnitModalOpen(false);
    setEditingUnit(null);
    unitForm.reset({
      ...emptyUnitForm,
      unit_type: hasMatrizUnit ? 'filial' : 'matriz',
    });
    setDocumentValue('');
    setPostalCodeValue('');
    setIsZipLookupLoading(false);
  };

  const handleUnitSubmit = async (data: CompanyUnitFormData) => {
    if (!company?.id) return;

    const payload = {
      name: data.name.trim(),
      trade_name: toNull(data.trade_name),
      document: data.document ? data.document.replace(/\D/g, '') : null,
      zip: toNull(data.zip),
      street: toNull(data.street),
      district: toNull(data.district),
      number: toNull(data.number),
      city: toNull(data.city),
      state: toNull(data.state),
      complement: toNull(data.complement),
      unit_type: data.unit_type,
      is_active: data.is_active,
    };

    if (editingUnit) {
      await updateUnit.mutateAsync({ id: editingUnit.id, ...payload });
      handleCloseUnitModal();
      return;
    }

    const created = await createUnit.mutateAsync({ company_id: company.id, ...payload });
    updateCompany.mutate({ company_unit_id: created.id });
    handleCloseUnitModal();
  };

  const handleOpenCreatePadServiceModal = () => {
    setEditingPadService(null);
    padServiceForm.reset({
      ...emptyPadServiceForm,
      sort_order: nextPadServiceSortOrder,
    });
    setIsPadServiceModalOpen(true);
  };

  const handleOpenEditPadServiceModal = (service: PadService) => {
    setEditingPadService(service);
    padServiceForm.reset({
      code: service.code || '',
      name: service.name || '',
      description: service.description || '',
      sort_order: service.sort_order ?? 0,
      active: service.active ?? true,
    });
    setIsPadServiceModalOpen(true);
  };

  const handleClosePadServiceModal = () => {
    setIsPadServiceModalOpen(false);
    setEditingPadService(null);
    padServiceForm.reset({
      ...emptyPadServiceForm,
      sort_order: nextPadServiceSortOrder,
    });
  };

  const handlePadServiceSubmit = async (data: PadServiceFormData) => {
    const payload = {
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description,
      sort_order: data.sort_order,
      active: data.active,
    };

    try {
      if (editingPadService) {
        await updatePadService.mutateAsync({
          id: editingPadService.id,
          ...payload,
        });
      } else {
        await createPadService.mutateAsync(payload);
      }
      handleClosePadServiceModal();
    } catch {
      // Toast handled in hook
    }
  };

  const handleTogglePadService = async (service: PadService) => {
    try {
      await togglePadServiceStatus.mutateAsync({
        id: service.id,
        active: !service.active,
      });
    } catch {
      // Toast handled in hook
    }
  };

  const handleLogoUpload =
    (variant: LogoVariant) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !company?.id) return;

      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setCropAspect(variant.startsWith('collapsed') ? 1 : 2 / 1);
        setCropType(variant);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);

      e.target.value = '';
    };

  // Handle cropped image
  const handleCroppedImage = async (croppedBlob: Blob) => {
    if (!company?.id || !cropType) return;

    const updateField = `logo_url_${cropType}` as const;

    setIsUploadingLogo((prev) => ({
      ...prev,
      [cropType]: true,
    }));
    try {
      const fileExt = 'png';
      const fileName = `${company.id}_${cropType}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, croppedBlob, { upsert: true, contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('company-logos').getPublicUrl(fileName);

      // Add timestamp to force browser cache refresh
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      // Update database with URL including timestamp
      const { error: updateError } = await supabase
        .from('company')
        .update({ [updateField]: urlWithTimestamp })
        .eq('id', company.id);

      if (updateError) throw updateError;

      // Update authStore to reflect changes immediately
      const authStore = useAuthStore.getState();
      await authStore.updateCompany({ [updateField]: urlWithTimestamp });

      queryClient.invalidateQueries({ queryKey: ['company'] });
    } catch (error) {
      console.error(`Error uploading ${cropType} logo:`, error);
    } finally {
      setIsUploadingLogo((prev) => ({
        ...prev,
        [cropType]: false,
      }));
      setCropType(null);
    }
  };

  // Update primary color in database
  const savePrimaryColor = async (color: string) => {
    if (!company?.id) return;

    await supabase.from('company').update({ primary_color: color }).eq('id', company.id);

    // Update authStore to reflect changes immediately
    const authStore = useAuthStore.getState();
    await authStore.updateCompany({ primary_color: color });
  };

  // Update theme preference in database
  const saveThemePreference = async (themeValue: string) => {
    if (!company?.id) return;

    await supabase.from('company').update({ theme_preference: themeValue }).eq('id', company.id);

    // Update authStore to reflect changes immediately
    const authStore = useAuthStore.getState();
    await authStore.updateCompany({ theme_preference: themeValue });
  };

  const tabs = [
    { id: 'company' as const, name: 'Empresa', icon: Building },
    { id: 'fiscal' as const, name: 'Fiscal', icon: Landmark },
    { id: 'organization' as const, name: 'Organização', icon: Layers },
    { id: 'services' as const, name: 'Serviços PAD', icon: Stethoscope },
    { id: 'theme' as const, name: 'Aparência', icon: SwatchBook },
  ];

  const colorOptions = [
    { name: 'Azure', value: '#1aa2ff' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#10B981' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Rose', value: '#F43F5E' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Teal', value: '#56A6B4' },
  ];

  const {
    name: unitActiveName,
    ref: unitActiveRef,
    onBlur: unitActiveOnBlur,
  } = unitForm.register('is_active');
  const {
    name: serviceActiveName,
    ref: serviceActiveRef,
    onBlur: serviceActiveOnBlur,
  } = padServiceForm.register('active');
  const unitIsActive = unitForm.watch('is_active');
  const serviceIsActive = padServiceForm.watch('active');
  const unitTypeValue = unitForm.watch('unit_type');
  const isPadServiceSaving = createPadService.isPending || updatePadService.isPending;

  const unitColumns: ColumnDef<CompanyUnit>[] = useMemo(
    () => [
      {
        accessorKey: 'trade_name',
        header: 'Nome Fantasia',
        cell: ({ row }) => (
          <span className="text-gray-900 dark:text-white">{row.original.trade_name || '-'}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Razão Social',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'unit_type',
        header: 'Tipo',
        cell: ({ row }) => (
          <Badge variant={row.original.unit_type === 'matriz' ? 'info' : 'neutral'}>
            {UNIT_TYPE_LABEL[row.original.unit_type]}
          </Badge>
        ),
      },
      {
        accessorKey: 'document',
        header: 'CNPJ',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">{row.original.document || '-'}</span>
        ),
      },
      {
        accessorKey: 'city',
        header: 'Localização',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.city || '-'}
            {row.original.state ? `/${row.original.state}` : ''}
          </span>
        ),
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.is_active === false ? 'neutral' : 'success'}>
            {row.original.is_active === false ? 'Inativa' : 'Ativa'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <IconButton onClick={() => handleOpenEditUnitModal(row.original)}>
              <Pencil className="h-4 w-4" />
            </IconButton>
          </div>
        ),
      },
    ],
    [handleOpenEditUnitModal]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
          Configurações
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Configure sua empresa, aparência e usuários
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              icon={<tab.icon className="h-5 w-5" />}
              nowrap
              hoverBorder
            >
              {tab.name}
            </TabButton>
          ))}
        </nav>
      </div>

      {/* Company Tab */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          {/* Logos Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {([
              {
                variant: 'collapsed_dark' as const,
                title: 'Logo Quadrada - Tema Escuro',
                description: 'Formato: Quadrado (1:1) • Recomendado: 512x512px',
                imageUrl: company?.logo_url_collapsed_dark,
              },
              {
                variant: 'collapsed_light' as const,
                title: 'Logo Quadrada - Tema Claro',
                description: 'Formato: Quadrado (1:1) • Recomendado: 512x512px',
                imageUrl: company?.logo_url_collapsed_light,
              },
              {
                variant: 'expanded_dark' as const,
                title: 'Logo Expandida - Tema Escuro',
                description: 'Formato: Retangular (2:1) • Recomendado: 600x300px',
                imageUrl: company?.logo_url_expanded_dark,
              },
              {
                variant: 'expanded_light' as const,
                title: 'Logo Expandida - Tema Claro',
                description: 'Formato: Retangular (2:1) • Recomendado: 600x300px',
                imageUrl: company?.logo_url_expanded_light,
              },
            ] as const).map((logoConfig) => {
              const isCollapsed = logoConfig.variant.startsWith('collapsed');

              return (
                <Card key={logoConfig.variant}>
                  <CardHeader>
                    <CardTitle>{logoConfig.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                      {logoConfig.description}
                    </p>
                    <div
                      className={
                        isCollapsed
                          ? 'mx-auto mb-4 flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800'
                          : 'mx-auto mb-4 flex h-32 w-64 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800'
                      }
                    >
                      {logoConfig.imageUrl ? (
                        <img src={logoConfig.imageUrl} alt={logoConfig.title} className="h-full w-full object-contain" />
                      ) : (
                        <Building className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                    <input
                      type="file"
                      ref={logoInputRefs[logoConfig.variant]}
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoUpload(logoConfig.variant)}
                    />
                    <Button
                      variant="neutral"
                      size="sm"
                      onClick={() => logoInputRefs[logoConfig.variant].current?.click()}
                      isLoading={isUploadingLogo[logoConfig.variant]}
                    >
                      Alterar {isCollapsed ? 'Logo Quadrada' : 'Logo Expandida'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Company Form */}
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={companyForm.handleSubmit(handleCompanySubmit)} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input label="Nome Fantasia" {...companyForm.register('trade_name')} />
                  <Input
                    label="Razão Social"
                    {...companyForm.register('name', {
                      required: 'Razão Social é obrigatória',
                    })}
                    error={companyForm.formState.errors.name?.message}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Input
                    label="CNPJ"
                    placeholder="00.000.000/0000-00"
                    {...companyForm.register('document')}
                  />
                  <Input label="Email" type="email" {...companyForm.register('email')} />
                  <Input label="Site" {...companyForm.register('website')} />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Inscrição Estadual"
                    {...companyForm.register('state_registration')}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" isLoading={updateCompany.isPending} showIcon={false}>
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fiscal Tab */}
      {activeTab === 'fiscal' && (
        <Card>
          <CardHeader>
            <CardTitle>Dados Fiscais</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={fiscalForm.handleSubmit(handleFiscalSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  label="Modalidade de Atendimento"
                  {...fiscalForm.register('care_modality')}
                />
                <Input label="Regime Tributário" {...fiscalForm.register('tax_regime')} />
                <Input
                  label="Regime Tributário Especial"
                  {...fiscalForm.register('special_tax_regime')}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input label="Natureza de Tributação" {...fiscalForm.register('taxation_nature')} />
                <Input label="CNAE" {...fiscalForm.register('cnae')} />
                <Input label="CNES" {...fiscalForm.register('cnes')} />
              </div>

              <div className="flex justify-end">
                <Button type="submit" isLoading={updateCompany.isPending} showIcon={false}>
                  Salvar Dados Fiscais
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Organization Tab */}
      {activeTab === 'organization' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Unidades da Organização</CardTitle>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {linkedUnit
                      ? `Unidade vinculada: ${linkedUnit.trade_name || linkedUnit.name}`
                      : 'Nenhuma unidade vinculada a esta empresa.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="solid"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={handleOpenCreateUnitModal}
                >
                  Adicionar Unidade
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <DataTable
                data={units}
                columns={unitColumns}
                showPagination={false}
                isLoading={isLoadingUnits}
                onRowClick={handleOpenEditUnitModal}
                emptyState={
                  <EmptyState
                    title="Nenhuma unidade cadastrada"
                    description="Comece cadastrando sua primeira unidade da organização"
                    action={
                      <Button
                        onClick={handleOpenCreateUnitModal}
                        size="sm"
                        variant="solid"
                        label="Cadastrar Unidade"
                      />
                    }
                  />
                }
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* PAD Services Tab */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Serviços do PAD</CardTitle>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Cadastre os tipos gerais de assistência usados na criação do PAD.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="solid"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={handleOpenCreatePadServiceModal}
                >
                  Adicionar Serviço
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingPadServices && (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Carregando serviços...
                </div>
              )}

              {!isLoadingPadServices && padServices.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Nenhum serviço cadastrado. Clique em "Adicionar Serviço" para começar.
                </div>
              )}

              {!isLoadingPadServices && padServices.length > 0 && (
                <div className="space-y-3">
                  {padServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {service.name}
                          </p>
                          <Badge variant={service.active ? 'success' : 'neutral'}>
                            {service.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Código: {service.code} • Ordem: {service.sort_order}
                        </p>
                        {service.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {service.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          icon={<Pencil className="h-4 w-4" />}
                          onClick={() => handleOpenEditPadServiceModal(service)}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={service.active ? 'neutral' : 'solid'}
                          onClick={() => handleTogglePadService(service)}
                          isLoading={togglePadServiceStatus.isPending}
                        >
                          {service.active ? 'Inativar' : 'Ativar'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Color */}
          <Card>
            <CardHeader>
              <CardTitle>Cor Principal</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Escolha a cor principal do sistema. Esta cor será usada em botões, links e
                destaques.
              </p>
              <div className="flex flex-wrap gap-3">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => {
                      setPrimaryColor(color.value);
                      savePrimaryColor(color.value);
                    }}
                    className={`h-12 w-12 rounded-xl transition-transform hover:scale-110 ${
                      primaryColor === color.value
                        ? 'ring-2 ring-gray-900 ring-offset-2 dark:ring-white dark:ring-offset-gray-900'
                        : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Mode */}
          <Card>
            <CardHeader>
              <CardTitle>Modo de Exibição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Escolha entre modo claro, escuro ou automático (segue as configurações do sistema).
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light', label: 'Claro' },
                  { value: 'dark', label: 'Escuro' },
                  { value: 'system', label: 'Sistema' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTheme(option.value as any);
                      saveThemePreference(option.value);
                    }}
                    className={`rounded-xl border-2 px-4 py-3 font-medium transition-colors ${
                      theme === option.value
                        ? 'border-primary-500 bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white'
                        : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-gray-500'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Modal
        isOpen={isUnitModalOpen}
        onClose={handleCloseUnitModal}
        title={editingUnit ? 'Editar Unidade' : 'Adicionar Unidade'}
        size="lg"
        panelClassName="max-w-[calc(42rem+100px)]"
      >
        <div className="flex min-h-[400px] flex-col">
          <div className="flex-1 overflow-y-auto pt-4">
            <form onSubmit={unitForm.handleSubmit(handleUnitSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-6">
                  <Input
                    label="Razão Social"
                    placeholder="Nome oficial da unidade"
                    {...unitForm.register('name', { required: 'Razão social é obrigatória' })}
                    error={unitForm.formState.errors.name?.message}
                    required
                  />
                </div>
                <div className="md:col-span-6">
                  <Input
                    label="Nome Fantasia"
                    placeholder="Nome comercial"
                    {...unitForm.register('trade_name', {
                      required: 'Nome fantasia é obrigatório',
                    })}
                    error={unitForm.formState.errors.trade_name?.message}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-4">
                  <Input
                    label="CNPJ"
                    placeholder="00.000.000/0000-00"
                    inputMode="numeric"
                    {...unitForm.register('document')}
                    value={documentValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const formatted = formatCnpjCpfInput(e.target.value);
                      setDocumentValue(formatted);
                      unitForm.setValue('document', formatted, { shouldDirty: true });
                    }}
                  />
                </div>
                <div className="md:col-span-8">
                  <Select
                    label="Tipo da Unidade"
                    options={UNIT_TYPE_OPTIONS}
                    value={unitTypeValue}
                    {...unitForm.register('unit_type', {
                      required: 'Tipo da unidade é obrigatória',
                    })}
                    error={unitForm.formState.errors.unit_type?.message}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="relative md:col-span-3">
                    <Input
                      label="CEP"
                      placeholder="00000-000"
                      inputMode="numeric"
                      {...unitForm.register('zip')}
                      value={postalCodeValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        void handlePostalCodeChange(e.target.value);
                      }}
                    />
                    {isZipLookupLoading && (
                      <svg
                        className="text-primary-500 absolute right-3 top-7 h-4 w-4 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    )}
                  </div>
                  <div className="md:col-span-7">
                    <Input
                      label="Logradouro"
                      placeholder="Rua, Avenida, etc."
                      {...unitForm.register('street')}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input label="Número" placeholder="123" {...unitForm.register('number')} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-[repeat(24,minmax(0,1fr))]">
                  <div className="md:col-span-8">
                    <Input
                      label="Complemento"
                      placeholder="Apto, bloco, sala..."
                      {...unitForm.register('complement')}
                    />
                  </div>
                  <div className="md:col-span-6">
                    <Input label="Bairro" placeholder="Bairro" {...unitForm.register('district')} />
                  </div>
                  <div className="md:col-span-6">
                    <Input label="Cidade" placeholder="Cidade" {...unitForm.register('city')} />
                  </div>
                  <div className="md:col-span-4">
                    <Select
                      label="UF"
                      options={UF_OPTIONS}
                      value={unitForm.watch('state')}
                      {...unitForm.register('state')}
                    />
                  </div>
                </div>
              </div>

              <ModalFooter className="mt-4 !justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
                <SwitchNew
                  label={unitTypeValue === 'matriz' ? 'Status da Matriz' : 'Status da Filial'}
                  showStatus
                  name={unitActiveName}
                  ref={unitActiveRef}
                  onBlur={unitActiveOnBlur}
                  checked={!!unitIsActive}
                  onChange={(e) =>
                    unitForm.setValue('is_active', e.target.checked, { shouldDirty: true })
                  }
                />
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="neutral"
                    showIcon={false}
                    onClick={handleCloseUnitModal}
                    label="Cancelar"
                  />
                  <Button
                    type="submit"
                    showIcon={false}
                    isLoading={createUnit.isPending || updateUnit.isPending}
                  >
                    {editingUnit ? 'Salvar Unidade' : 'Adicionar Unidade'}
                  </Button>
                </div>
              </ModalFooter>
            </form>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPadServiceModalOpen}
        onClose={handleClosePadServiceModal}
        title={editingPadService ? 'Editar Serviço PAD' : 'Adicionar Serviço PAD'}
        size="lg"
      >
        <form onSubmit={padServiceForm.handleSubmit(handlePadServiceSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Código"
              placeholder="internacao_domiciliar"
              {...padServiceForm.register('code', {
                required: 'Código é obrigatório',
                validate: (value) => value.trim().length > 0 || 'Código é obrigatório',
              })}
              error={padServiceForm.formState.errors.code?.message}
              required
            />
            <Input
              label="Nome"
              placeholder="Internação Domiciliar"
              {...padServiceForm.register('name', {
                required: 'Nome é obrigatório',
                validate: (value) => value.trim().length > 0 || 'Nome é obrigatório',
              })}
              error={padServiceForm.formState.errors.name?.message}
              required
            />
          </div>

          <Input label="Descrição" {...padServiceForm.register('description')} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Ordem"
              type="number"
              min={0}
              {...padServiceForm.register('sort_order', {
                required: 'Ordem é obrigatória',
                valueAsNumber: true,
                min: { value: 0, message: 'Ordem deve ser maior ou igual a zero' },
              })}
              error={padServiceForm.formState.errors.sort_order?.message}
              required
            />

            <div className="flex items-end">
              <Switch
                label="Status do Serviço"
                showStatus
                name={serviceActiveName}
                ref={serviceActiveRef}
                onBlur={serviceActiveOnBlur}
                checked={!!serviceIsActive}
                onChange={(event) =>
                  padServiceForm.setValue('active', event.target.checked, { shouldDirty: true })
                }
              />
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              showIcon={false}
              onClick={handleClosePadServiceModal}
            >
              Cancelar
            </Button>
            <Button type="submit" showIcon={false} isLoading={isPadServiceSaving}>
              {editingPadService ? 'Salvar Serviço' : 'Adicionar Serviço'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
      {/* Image Crop Modal */}
      {imageToCrop && (
        <ImageCropper
          isOpen={isCropModalOpen}
          onClose={() => {
            setIsCropModalOpen(false);
            setImageToCrop(null);
            setCropType(null);
          }}
          imageSrc={imageToCrop}
          onCropComplete={handleCroppedImage}
          aspect={cropAspect}
          title={
            cropType
              ? cropType.startsWith('collapsed')
                ? 'Recortar Logo Quadrada'
                : 'Recortar Logo Expandida'
              : 'Recortar Logo'
          }
        />
      )}
    </div>
  );
}
