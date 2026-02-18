import { useEffect, useMemo, useRef, useState } from 'react';
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
  TabButton,
} from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Building, SwatchBook, Landmark, Layers, Plus, Pencil } from 'lucide-react';
import {
  type CompanyUnit,
  type CompanyUnitType,
  useCompanyUnits,
  useCreateCompanyUnit,
  useUpdateCompanyUnit,
} from '@/hooks/useCompanyUnits';

type ActiveTab = 'company' | 'fiscal' | 'parent' | 'theme';

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
  postal_code: string;
  address: string;
  neiborhood: string;
  number: string;
  city: string;
  state: string;
  complement: string;
  unit_type: CompanyUnitType;
  is_active: boolean;
}

const emptyUnitForm: CompanyUnitFormData = {
  name: '',
  trade_name: '',
  document: '',
  postal_code: '',
  address: '',
  neiborhood: '',
  number: '',
  city: '',
  state: '',
  complement: '',
  unit_type: 'filial',
  is_active: true,
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('company');
  const [isUploadingCollapsed, setIsUploadingCollapsed] = useState(false);
  const [isUploadingExpanded, setIsUploadingExpanded] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<CompanyUnit | null>(null);
  const fileInputCollapsedRef = useRef<HTMLInputElement>(null);
  const fileInputExpandedRef = useRef<HTMLInputElement>(null);

  // Image crop states
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropAspect, setCropAspect] = useState(1);
  const [cropType, setCropType] = useState<'collapsed' | 'expanded' | null>(null);

  const { primaryColor, setPrimaryColor, theme, setTheme } = useTheme();
  const { company } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: units = [], isLoading: isLoadingUnits } = useCompanyUnits();
  const createUnit = useCreateCompanyUnit();
  const updateUnit = useUpdateCompanyUnit();

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

  const linkedUnit = useMemo<CompanyUnit | undefined>(
    () => units.find((unit) => unit.id === company?.company_unit_id),
    [units, company?.company_unit_id]
  );

  const hasMatrizUnit = useMemo(
    () => units.some((unit) => unit.unit_type === 'matriz'),
    [units]
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

  const handleLinkUnit = (unitId: string) => {
    if (unitId === company?.company_unit_id) return;
    updateCompany.mutate({ company_unit_id: unitId });
  };

  const handleOpenCreateUnitModal = () => {
    setEditingUnit(null);
    unitForm.reset({
      ...emptyUnitForm,
      unit_type: hasMatrizUnit ? 'filial' : 'matriz',
    });
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnitModal = (unit: CompanyUnit) => {
    setEditingUnit(unit);
    unitForm.reset({
      name: unit.name || '',
      trade_name: unit.trade_name || '',
      document: unit.document || '',
      postal_code: unit.postal_code || '',
      address: unit.address || '',
      neiborhood: unit.neiborhood || '',
      number: unit.number || '',
      city: unit.city || '',
      state: unit.state || '',
      complement: unit.complement || '',
      unit_type: unit.unit_type || 'filial',
      is_active: unit.is_active ?? true,
    });
    setIsUnitModalOpen(true);
  };

  const handleCloseUnitModal = () => {
    setIsUnitModalOpen(false);
    setEditingUnit(null);
    unitForm.reset({
      ...emptyUnitForm,
      unit_type: hasMatrizUnit ? 'filial' : 'matriz',
    });
  };

  const handleUnitSubmit = async (data: CompanyUnitFormData) => {
    const payload = {
      name: data.name.trim(),
      trade_name: toNull(data.trade_name),
      document: toNull(data.document),
      postal_code: toNull(data.postal_code),
      address: toNull(data.address),
      neiborhood: toNull(data.neiborhood),
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

    const created = await createUnit.mutateAsync(payload);
    updateCompany.mutate({ company_unit_id: created.id });
    handleCloseUnitModal();
  };

  // Upload logo collapsed (quadrada)
  const handleLogoCollapsedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company?.id) return;

    // Read file and open crop modal
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropAspect(1); // Quadrado
      setCropType('collapsed');
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  // Upload logo expanded (2:1)
  const handleLogoExpandedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company?.id) return;

    // Read file and open crop modal
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropAspect(2 / 1); // Proporção 2:1
      setCropType('expanded');
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  // Handle cropped image
  const handleCroppedImage = async (croppedBlob: Blob) => {
    if (!company?.id || !cropType) return;

    const isCollapsed = cropType === 'collapsed';
    const setLoading = isCollapsed ? setIsUploadingCollapsed : setIsUploadingExpanded;

    setLoading(true);
    try {
      const fileExt = 'png';
      const fileName = isCollapsed
        ? `${company.id}_collapsed.${fileExt}`
        : `${company.id}_expanded.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, croppedBlob, { upsert: true, contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('company-logos').getPublicUrl(fileName);

      // Add timestamp to force browser cache refresh
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;

      const updateField = isCollapsed ? 'logo_url_collapsed' : 'logo_url_expanded';

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
      setLoading(false);
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
    { id: 'parent' as const, name: 'Organização', icon: Layers },
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

  const { name: unitActiveName, ref: unitActiveRef, onBlur: unitActiveOnBlur } =
    unitForm.register('is_active');
  const unitIsActive = unitForm.watch('is_active');
  const unitTypeValue = unitForm.watch('unit_type');
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
            {/* Logo Quadrada (Menu Colapsado) */}
            <Card>
              <CardHeader>
                <CardTitle>Logo Quadrada (Menu Colapsado)</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Formato: Quadrado (1:1) • Recomendado: 512x512px
                </p>
                <div className="mx-auto mb-4 flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800">
                  {company?.logo_url_collapsed ? (
                    <img
                      src={company.logo_url_collapsed}
                      alt="Logo Quadrada"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Building className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputCollapsedRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleLogoCollapsedUpload}
                />
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={() => fileInputCollapsedRef.current?.click()}
                  isLoading={isUploadingCollapsed}
                >
                  Alterar Logo Quadrada
                </Button>
              </CardContent>
            </Card>

            {/* Logo Expandida (Menu Expandido) */}
            <Card>
              <CardHeader>
                <CardTitle>Logo Expandida (Menu Expandido)</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  Formato: Retangular (2:1) • Recomendado: 600x300px
                </p>
                <div className="mx-auto mb-4 flex h-32 w-64 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800">
                  {company?.logo_url_expanded ? (
                    <img
                      src={company.logo_url_expanded}
                      alt="Logo Expandida"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Building className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputExpandedRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleLogoExpandedUpload}
                />
                <Button
                  variant="neutral"
                  size="sm"
                  onClick={() => fileInputExpandedRef.current?.click()}
                  isLoading={isUploadingExpanded}
                >
                  Alterar Logo Expandida
                </Button>
              </CardContent>
            </Card>
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

      {/* Parent Tab */}
      {activeTab === 'parent' && (
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
            <CardContent>
              {isLoadingUnits && (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Carregando unidades...
                </div>
              )}

              {!isLoadingUnits && units.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  Nenhuma unidade cadastrada. Clique em "Adicionar Unidade" para começar.
                </div>
              )}

              {!isLoadingUnits && units.length > 0 && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {units.map((unit) => {
                    const isLinked = company?.company_unit_id === unit.id;
                    return (
                      <Card
                        key={unit.id}
                        className={isLinked ? 'border-primary-500 ring-primary-500 ring-1' : ''}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <CardTitle className="text-base">{unit.trade_name || unit.name}</CardTitle>
                              {unit.trade_name && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{unit.name}</p>
                              )}
                            </div>
                            <Badge variant={unit.unit_type === 'matriz' ? 'info' : 'neutral'}>
                              {UNIT_TYPE_LABEL[unit.unit_type]}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                            <p>CNPJ: {unit.document || '-'}</p>
                            <p>
                              Cidade: {unit.city || '-'}
                              {unit.state ? `/${unit.state}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <Badge variant={unit.is_active === false ? 'neutral' : 'success'}>
                              {unit.is_active === false ? 'Inativa' : 'Ativa'}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                icon={<Pencil className="h-4 w-4" />}
                                onClick={() => handleOpenEditUnitModal(unit)}
                              >
                                Editar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={isLinked ? 'neutral' : 'solid'}
                                onClick={() => handleLinkUnit(unit.id)}
                                isLoading={updateCompany.isPending && !isLinked}
                                disabled={isLinked}
                              >
                                {isLinked ? 'Vinculada' : 'Vincular'}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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
      >
        <form onSubmit={unitForm.handleSubmit(handleUnitSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="Razão Social"
              {...unitForm.register('name', { required: 'Razão social é obrigatória' })}
              error={unitForm.formState.errors.name?.message}
              required
            />
            <Input label="Nome Fantasia" {...unitForm.register('trade_name')} />
            <Input label="CNPJ" {...unitForm.register('document')} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Input label="CEP" {...unitForm.register('postal_code')} />
            <Input label="Endereço" {...unitForm.register('address')} />
            <Input label="Bairro" {...unitForm.register('neiborhood')} />
            <Input label="Número" {...unitForm.register('number')} />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input label="Cidade" {...unitForm.register('city')} />
            <Input label="Estado" {...unitForm.register('state')} />
            <Input label="Complemento" {...unitForm.register('complement')} />
          </div>

          <Select
            label="Tipo da Unidade"
            options={UNIT_TYPE_OPTIONS}
            value={unitTypeValue}
            {...unitForm.register('unit_type', { required: 'Tipo da unidade é obrigatória' })}
            error={unitForm.formState.errors.unit_type?.message}
            required
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <Switch
              label={unitTypeValue === 'matriz' ? 'Status da Matriz' : 'Status da Filial'}
              showStatus
              name={unitActiveName}
              ref={unitActiveRef}
              onBlur={unitActiveOnBlur}
              checked={!!unitIsActive}
              onChange={(e) => unitForm.setValue('is_active', e.target.checked, { shouldDirty: true })}
            />
            <Badge variant={unitTypeValue === 'matriz' ? 'info' : 'neutral'}>
              {UNIT_TYPE_LABEL[unitTypeValue || 'filial']}
            </Badge>
          </div>

          <ModalFooter>
            <Button type="button" variant="outline" showIcon={false} onClick={handleCloseUnitModal}>
              Cancelar
            </Button>
            <Button
              type="submit"
              showIcon={false}
              isLoading={createUnit.isPending || updateUnit.isPending}
            >
              {editingUnit ? 'Salvar Unidade' : 'Adicionar Unidade'}
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
          title={cropType === 'collapsed' ? 'Recortar Logo Quadrada' : 'Recortar Logo Expandida'}
        />
      )}
    </div>
  );
}

