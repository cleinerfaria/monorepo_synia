import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  Box,
  X,
  Search,
  Table,
  Link,
  Star,
  ArrowLeft,
  Download,
  Info,
} from 'lucide-react';
import {
  Card,
  Button,
  Button,
  Modal,
  ModalFooter,
  Input,
  SearchableSelect,
  Textarea,
  Loading,
  RadioGroup,
  Badge,
  Alert,
  Breadcrumbs,
  TabButton,
  IconButton,
  SwitchNew,
} from '@/components/ui';
import { useProduct, useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import {
  usePresentations,
  useCreatePresentation,
  useUpdatePresentation,
  useDeletePresentation,
} from '@/hooks/usePresentations';
import {
  useActiveIngredients,
  useActiveIngredient,
  useSearchActiveIngredients,
  useCreateActiveIngredient,
} from '@/hooks/useActiveIngredients';
import { useManufacturers, useCreateManufacturer } from '@/hooks/useManufacturers';
import { useUnitsOfMeasure, useCreateUnitOfMeasure } from '@/hooks/useUnitsOfMeasure';
import { useProductGroups, useCreateProductGroup } from '@/hooks/useProductGroups';
import {
  useRefSources,
  useProductRefLinks,
  useSearchRefItemsUnified,
  useLinkProductToRefItem,
  useUnlinkProductFromRefItem,
  useSetPrimaryRefLink,
  fetchRefItemUnifiedByEan,
} from '@/hooks/useReferenceTables';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import type { ProductPresentation, RefSource, RefItemUnified } from '@/types/database';
import PresentationSearchModal from '@/components/product/PresentationSearchModal';
import { useNavigationGuard } from '@/contexts/NavigationGuardContext';
import { DEFAULT_PRODUCT_GROUP_COLOR } from '@/design-system/theme/constants';
import { formatDateOnly } from '@/lib/dateOnly';

type FormTab = 'data' | 'presentations' | 'references';

interface ProductFormData {
  code: string;
  name: string;
  description: string;
  unit_stock_id: string;
  unit_prescription_id: string;
  unit_prescription_factor: number;
  item_type: 'medication' | 'material' | 'diet';
  min_stock: number;
  active_ingredient_id: string;
  concentration: string;
  active: boolean;
  psychotropic: boolean;
  antibiotic: boolean;
  tuss_ref: string;
  tiss_ref: string;
}

interface PresentationFormData {
  name: string;
  barcode: string;
  conversion_factor: number;
  unit: string;
  manufacturer_id: string;
}

interface NewActiveIngredientFormData {
  name: string;
  description: string;
}

interface NewManufacturerFormData {
  name: string;
  trade_name: string;
  document: string;
}

interface NewGroupFormData {
  code: string;
  name: string;
  color: string;
}

interface NewUnitFormData {
  code: string;
  symbol: string;
  name: string;
  description: string;
}

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = id && id !== 'novo';

  const productsListPath = useMemo(() => {
    return location.search ? `/produtos${location.search}` : '/produtos';
  }, [location.search]);

  // Contexto de navegaÃ§Ã£o protegida
  const {
    setHasUnsavedChanges: setGlobalUnsavedChanges,
    safeNavigate,
    handleLinkClick: handleBreadcrumbNavigate,
  } = useNavigationGuard();

  const [activeTab, setActiveTab] = useState<FormTab>('data');
  const [isPresentationModalOpen, setIsPresentationModalOpen] = useState(false);
  const [isPresentationSearchModalOpen, setIsPresentationSearchModalOpen] = useState(false);
  const [isPresentationLinkModalOpen, setIsPresentationLinkModalOpen] = useState(false);
  const [isNewActiveIngredientModalOpen, setIsNewActiveIngredientModalOpen] = useState(false);
  const [isNewManufacturerModalOpen, setIsNewManufacturerModalOpen] = useState(false);
  const [isNewUnitModalOpen, setIsNewUnitModalOpen] = useState(false);

  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [selectedPresentation, setSelectedPresentation] = useState<ProductPresentation | null>(
    null
  );
  const [presentationLinkData, setPresentationLinkData] = useState<RefItemUnified | null>(null);
  const [selectedActiveIngredientId, setSelectedActiveIngredientId] = useState('');
  const [selectedStockUnitId, setSelectedStockUnitId] = useState('');
  const [selectedPrescriptionUnitId, setSelectedPrescriptionUnitId] = useState('');
  const [selectedPresentationUnit, setSelectedPresentationUnit] = useState('');
  const [selectedPresentationManufacturerId, setSelectedPresentationManufacturerId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Estado para sugestÃ£o de cadastro de fabricante
  const [suggestedManufacturer, setSuggestedManufacturer] = useState<{
    name: string;
    cnpj: string;
  } | null>(null);
  const [presentationForLinking, setPresentationForLinking] = useState<ProductPresentation | null>(
    null
  );

  // Estado para controlar erros de validaÃ§Ã£o manual
  const [unitStockError, setUnitStockError] = useState(false);
  const [unitPrescriptionError, setUnitPrescriptionError] = useState(false);

  // Estado para loading ao criar apresentaÃ§Ã£o a partir da ref
  const [isLoadingRefData, setIsLoadingRefData] = useState(false);

  // Busca o produto se estiver editando
  const { data: product, isLoading: isLoadingProduct } = useProduct(isEditing ? id : undefined);

  const createItem = useCreateProduct();
  const updateItem = useUpdateProduct();

  // Active ingredients - busca server-side para dropdown (suporta +1000 registros)
  const [activeIngredientSearchTerm, setActiveIngredientSearchTerm] = useState('');
  const { data: searchedActiveIngredients = [] } = useSearchActiveIngredients(
    activeIngredientSearchTerm
  );
  // Busca o item selecionado especificamente (para garantir que apareÃ§a no dropdown)
  const { data: selectedActiveIngredient } = useActiveIngredient(
    selectedActiveIngredientId || undefined
  );
  // TambÃ©m busca lista completa para filtros (limitada a 1000, mas ok para filtros)
  const { data: _activeIngredients = [] } = useActiveIngredients();
  const createActiveIngredient = useCreateActiveIngredient();
  const { data: manufacturers = [] } = useManufacturers();
  const createManufacturer = useCreateManufacturer();
  const { data: unitsOfMeasure = [] } = useUnitsOfMeasure();
  const createUnitOfMeasure = useCreateUnitOfMeasure();
  const { data: productGroups = [] } = useProductGroups();
  const createProductGroup = useCreateProductGroup();

  // Reference tables
  const [refSearchTerm, setRefSearchTerm] = useState('');
  const { data: refSources = [] } = useRefSources();
  const { data: productRefLinks = [], isLoading: isLoadingRefLinks } = useProductRefLinks(
    isEditing ? id : undefined
  );
  const { data: searchResults = [], isLoading: isSearchingRefs } =
    useSearchRefItemsUnified(refSearchTerm);
  const linkToRef = useLinkProductToRefItem();
  const unlinkFromRef = useUnlinkProductFromRefItem();
  const setPrimaryRef = useSetPrimaryRefLink();

  // Presentations hooks
  const { data: presentations = [] } = usePresentations(isEditing ? id : undefined);
  const createPresentation = useCreatePresentation();
  const updatePresentation = useUpdatePresentation();
  const deletePresentation = useDeletePresentation();

  // Estado local para rastrear mudanÃ§as nÃ£o salvas (alÃ©m do isDirty do formulÃ¡rio)
  const [localUnsavedChanges, setLocalUnsavedChanges] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProductFormData>();

  // Sincronizar estado de mudanÃ§as nÃ£o salvas com o contexto global
  useEffect(() => {
    setGlobalUnsavedChanges(isDirty || localUnsavedChanges);
    return () => {
      // Limpar ao desmontar o componente
      setGlobalUnsavedChanges(false);
    };
  }, [isDirty, localUnsavedChanges, setGlobalUnsavedChanges]);

  // Alerta do browser ao fechar/recarregar a pÃ¡gina
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

  const {
    register: registerPresentation,
    handleSubmit: handleSubmitPresentation,
    reset: resetPresentation,
    formState: { errors: presentationErrors },
  } = useForm<PresentationFormData>();

  const {
    register: registerNewActiveIngredient,
    handleSubmit: handleSubmitNewActiveIngredient,
    reset: resetNewActiveIngredient,
    formState: { errors: newActiveIngredientErrors },
  } = useForm<NewActiveIngredientFormData>();

  const {
    register: registerNewManufacturer,
    handleSubmit: handleSubmitNewManufacturer,
    reset: resetNewManufacturer,
    formState: { errors: newManufacturerErrors },
  } = useForm<NewManufacturerFormData>();

  const {
    register: registerNewGroup,
    handleSubmit: handleSubmitNewGroup,
    reset: resetNewGroup,
    formState: { errors: newGroupErrors },
  } = useForm<NewGroupFormData>();

  const {
    register: registerNewUnit,
    handleSubmit: handleSubmitNewUnit,
    reset: resetNewUnit,
    formState: { errors: newUnitErrors },
  } = useForm<NewUnitFormData>();

  const watchItemType = watch('item_type');
  const activeValue = watch('active');
  const { ref: activeRef, name: activeName, onBlur: activeOnBlur } = register('active');

  // Inicializa o formulÃ¡rio quando o produto Ã© carregado
  useEffect(() => {
    if (isEditing && product) {
      reset({
        code: product.code || '',
        name: product.name,
        description: product.description || '',
        unit_stock_id: product.unit_stock_id || '',
        unit_prescription_id: product.unit_prescription_id || '',
        unit_prescription_factor: product.unit_prescription_factor ?? 1,
        item_type: product.item_type as ProductFormData['item_type'],
        min_stock: product.min_stock || 0,
        active_ingredient_id: product.active_ingredient_id || '',
        concentration: product.concentration || '',
        active: product.active ?? true,
        psychotropic: product.psychotropic ?? false,
        antibiotic: product.antibiotic ?? false,
        tuss_ref: product.tuss_ref || '',
        tiss_ref: product.tiss_ref || '',
      });
      setSelectedActiveIngredientId(product.active_ingredient_id || '');
      setSelectedStockUnitId(product.unit_stock_id || '');
      setSelectedPrescriptionUnitId(product.unit_prescription_id || '');
      setSelectedGroupId(product.group_id || '');
    } else if (!isEditing) {
      // Novo produto
      reset({
        code: '',
        name: '',
        description: '',
        unit_stock_id: '',
        unit_prescription_id: '',
        unit_prescription_factor: 1,
        item_type: 'medication',
        min_stock: 0,
        active_ingredient_id: '',
        concentration: '',
        active: true,
        psychotropic: false,
        antibiotic: false,
        tuss_ref: '',
        tiss_ref: '',
      });
      setSelectedActiveIngredientId('');
      setSelectedStockUnitId('');
      setSelectedPrescriptionUnitId('');
      setSelectedGroupId('');
    }
  }, [isEditing, product, reset]);

  const openNewActiveIngredientModal = () => {
    resetNewActiveIngredient({
      name: '',
      description: '',
    });
    setIsNewActiveIngredientModalOpen(true);
  };

  const openNewManufacturerModal = (prefillData?: {
    name?: string;
    trade_name?: string;
    document?: string;
  }) => {
    resetNewManufacturer({
      name: prefillData?.name || '',
      trade_name: prefillData?.trade_name || '',
      document: prefillData?.document || '',
    });
    setIsNewManufacturerModalOpen(true);
  };

  const handleCreateActiveIngredient = async (data: NewActiveIngredientFormData) => {
    const newActiveIngredient = await createActiveIngredient.mutateAsync({
      name: data.name.toUpperCase(),
      description: data.description || null,
      active: true,
    });
    setSelectedActiveIngredientId(newActiveIngredient.id);
    setIsNewActiveIngredientModalOpen(false);
  };

  const handleCreateManufacturer = async (data: NewManufacturerFormData) => {
    const newManufacturer = await createManufacturer.mutateAsync({
      name: data.name,
      trade_name: data.trade_name || null,
      document: data.document || null,
      active: true,
    });
    setSelectedPresentationManufacturerId(newManufacturer.id);
    setSuggestedManufacturer(null);
    setIsNewManufacturerModalOpen(false);
  };

  const openNewGroupModal = () => {
    resetNewGroup({
      code: '',
      name: '',
      color: DEFAULT_PRODUCT_GROUP_COLOR,
    });
    setIsNewGroupModalOpen(true);
  };

  const handleCreateGroup = async (data: NewGroupFormData) => {
    const newGroup = await createProductGroup.mutateAsync({
      code: data.code || null,
      name: data.name,
      color: data.color || null,
      description: null,
      parent_id: null,
      icon: null,
      sort_order: null,
      active: true,
    });
    setSelectedGroupId(newGroup.id);
    setIsNewGroupModalOpen(false);
  };

  const openNewUnitModal = () => {
    resetNewUnit({
      code: '',
      symbol: '',
      name: '',
      description: '',
    });
    setIsNewUnitModalOpen(true);
  };

  const handleCreateUnit = async (data: NewUnitFormData) => {
    const newUnit = await createUnitOfMeasure.mutateAsync({
      code: data.code,
      symbol: data.symbol,
      name: data.name,
      description: data.description || null,
      active: true,
    });
    // Define a nova unidade como selecionada no campo de estoque
    setSelectedStockUnitId(newUnit.id);
    setIsNewUnitModalOpen(false);
  };

  const normalizeUpper = (value: string) => value.toUpperCase();

  const onSubmit = async (data: ProductFormData) => {
    // ValidaÃ§Ã£o manual da unidade jÃ¡ que estamos usando estado controlado
    if (!selectedStockUnitId) {
      setUnitStockError(true);
      toast.error('Preencha todos os campos obrigatÃ³rios');
      return;
    }
    setUnitStockError(false);

    if (!selectedPrescriptionUnitId) {
      setUnitPrescriptionError(true);
      toast.error('Preencha todos os campos obrigatÃ³rios');
      return;
    }
    setUnitPrescriptionError(false);

    const unitPrescriptionFactor =
      Number.isFinite(data.unit_prescription_factor) && data.unit_prescription_factor > 0
        ? data.unit_prescription_factor
        : 1;

    const payload = {
      code: data.code || null,
      name: normalizeUpper(data.name),
      description: data.description || null,
      unit_stock_id: selectedStockUnitId || null,
      unit_prescription_id: selectedPrescriptionUnitId || null,
      unit_prescription_factor: unitPrescriptionFactor,
      item_type: data.item_type,
      min_stock: data.min_stock || undefined,
      active_ingredient_id: selectedActiveIngredientId || null,
      concentration: data.concentration ? normalizeUpper(data.concentration) : null,
      group_id: selectedGroupId || null,
      active: data.active,
      psychotropic: data.psychotropic,
      antibiotic: data.antibiotic,
      tuss_ref: data.tuss_ref || null,
      tiss_ref: data.tiss_ref || null,
    };

    if (isEditing && product) {
      await updateItem.mutateAsync({ id: product.id, ...payload });
    } else {
      await createItem.mutateAsync(payload);
    }
    // Resetar estados de alteraÃ§Ãµes nÃ£o salvas antes de navegar
    setLocalUnsavedChanges(false);
    navigate(productsListPath);
  };

  // FunÃ§Ã£o para salvar sem sair da pÃ¡gina
  const onSaveWithoutExit = async (data: ProductFormData) => {
    // ValidaÃ§Ã£o manual da unidade jÃ¡ que estamos usando estado controlado
    if (!selectedStockUnitId) {
      setUnitStockError(true);
      toast.error('Preencha todos os campos obrigatÃ³rios');
      return;
    }
    setUnitStockError(false);

    if (!selectedPrescriptionUnitId) {
      setUnitPrescriptionError(true);
      toast.error('Preencha todos os campos obrigatÃ³rios');
      return;
    }
    setUnitPrescriptionError(false);

    const unitPrescriptionFactor =
      Number.isFinite(data.unit_prescription_factor) && data.unit_prescription_factor > 0
        ? data.unit_prescription_factor
        : 1;

    const payload = {
      code: data.code || null,
      name: normalizeUpper(data.name),
      description: data.description || null,
      unit_stock_id: selectedStockUnitId || null,
      unit_prescription_id: selectedPrescriptionUnitId || null,
      unit_prescription_factor: unitPrescriptionFactor,
      item_type: data.item_type,
      min_stock: data.min_stock || undefined,
      active_ingredient_id: selectedActiveIngredientId || null,
      concentration: data.concentration ? normalizeUpper(data.concentration) : null,
      group_id: selectedGroupId || null,
      active: data.active,
      psychotropic: data.psychotropic,
      antibiotic: data.antibiotic,
      tuss_ref: data.tuss_ref || null,
      tiss_ref: data.tiss_ref || null,
    };

    if (isEditing && product) {
      await updateItem.mutateAsync({ id: product.id, ...payload });
    } else {
      await createItem.mutateAsync(payload);
    }
    // Resetar estado de alteraÃ§Ãµes nÃ£o salvas mas permanecer na pÃ¡gina
    setLocalUnsavedChanges(false);
    toast.success(isEditing ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!');
  };

  const onSubmitPresentation = async (data: PresentationFormData) => {
    if (!product) return;

    const payload = {
      product_id: product.id,
      name: data.name,
      barcode: data.barcode || null,
      conversion_factor: data.conversion_factor,
      unit: selectedPresentationUnit || null,
      manufacturer_id: selectedPresentationManufacturerId || null,
    };

    if (selectedPresentation) {
      await updatePresentation.mutateAsync({
        id: selectedPresentation.id,
        ...payload,
      });
    } else {
      await createPresentation.mutateAsync(payload);
    }
    setSelectedPresentation(null);
    setSelectedPresentationManufacturerId('');
    setIsPresentationModalOpen(false);
    resetPresentation();
  };

  const handleDeletePresentation = async (presentation: ProductPresentation) => {
    if (!product) return;
    await deletePresentation.mutateAsync({
      id: presentation.id,
      productId: product.id,
    });
  };

  /**
   * Abre o modal para vincular uma apresentaÃ§Ã£o com as tabelas de referÃªncia
   * Busca o item no EAN e mostra as fontes disponÃ­veis (CMED, BrasÃ­ndice, Simpro)
   */
  const openLinkPresentationModal = async (presentation: ProductPresentation) => {
    if (!presentation.barcode) {
      toast.error('Esta apresentaÃ§Ã£o nÃ£o possui cÃ³digo de barras (EAN)');
      return;
    }

    // Abrir modal imediatamente com loading
    setPresentationForLinking(presentation);
    setPresentationLinkData(null);
    setIsPresentationLinkModalOpen(true);
    setIsLoadingRefData(true);

    try {
      const unifiedData = await fetchRefItemUnifiedByEan(presentation.barcode);

      if (!unifiedData) {
        toast.error('Item nÃ£o encontrado nas tabelas de referÃªncia');
        setIsPresentationLinkModalOpen(false);
        return;
      }

      setPresentationLinkData(unifiedData);
    } catch (error) {
      console.error('Erro ao buscar item para vinculaÃ§Ã£o:', error);
      toast.error('Erro ao buscar item nas tabelas de referÃªncia');
      setIsPresentationLinkModalOpen(false);
    } finally {
      setIsLoadingRefData(false);
    }
  };

  /**
   * Abre o modal de apresentaÃ§Ã£o prÃ©-preenchido com dados da view vw_ref_item_unified
   * Busca pelo EAN vinculado e preenche: nome, quantidade (fator de conversÃ£o), EAN (barcode), unidade
   */
  const _openPresentationFromRefItem = async (refItemEan: string) => {
    if (!product || !refItemEan) return;

    setIsLoadingRefData(true);
    try {
      const unifiedData = await fetchRefItemUnifiedByEan(refItemEan);

      console.warn('Dados da view unificada:', unifiedData);

      if (!unifiedData) {
        toast.error('Dados nÃ£o encontrados na view unificada');
        return;
      }

      handleSelectRefItemForPresentation(unifiedData);
    } catch (error) {
      console.error('Erro ao buscar dados da view unificada:', error);
      toast.error('Erro ao carregar dados da tabela de referÃªncia');
    } finally {
      setIsLoadingRefData(false);
    }
  };

  /**
   * Callback quando um item Ã© selecionado no modal de busca de apresentaÃ§Ãµes
   * Preenche os dados no formulÃ¡rio de apresentaÃ§Ã£o
   */
  const handleSelectRefItemForPresentation = useCallback(
    (item: RefItemUnified) => {
      if (!product) return;

      // Determinar a unidade de entrada baseado na unidade do item
      // Se a unidade for "ml", usar "Frasco", senÃ£o usar "Caixa"
      let unitId = '';
      const itemUnidade = item.unit?.toLowerCase() || '';

      if (itemUnidade === 'ml') {
        const frascoUnit = unitsOfMeasure.find(
          (u) => u.code.toLowerCase() === 'fr' || u.name.toLowerCase() === 'frasco'
        );
        if (frascoUnit) {
          unitId = frascoUnit.id;
        }
      }

      // Se nÃ£o encontrou Frasco ou a unidade nÃ£o Ã© ml, usar Caixa como padrÃ£o
      if (!unitId) {
        const caixaUnit = unitsOfMeasure.find(
          (u) => u.code.toLowerCase() === 'cx' || u.name.toLowerCase() === 'caixa'
        );
        if (caixaUnit) {
          unitId = caixaUnit.id;
        }
      }

      // Busca por CNPJ removida pois nÃ£o existe fabricante_cnpj em item
      let manufacturerId = '';

      // Se nÃ£o encontrou pelo CNPJ, tentar pelo nome
      if (!manufacturerId && item.manufacturer) {
        const matchedManufacturer = manufacturers.find(
          (m) =>
            m.trade_name?.toLowerCase() === item.manufacturer?.toLowerCase() ||
            m.name.toLowerCase() === item.manufacturer?.toLowerCase()
        );
        if (matchedManufacturer) {
          manufacturerId = matchedManufacturer.id;
        }
      }

      // Se nÃ£o encontrou fabricante, guardar sugestÃ£o para cadastro
      if (!manufacturerId && item.manufacturer) {
        setSuggestedManufacturer({
          name: item.manufacturer,
          cnpj: '',
        });
      } else {
        setSuggestedManufacturer(null);
      }

      // Converter quantidade para nÃºmero vÃ¡lido
      const quantidade = item.quantity ? Number(item.quantity) : 1;

      // Fechar o modal de busca
      setIsPresentationSearchModalOpen(false);

      // Preencher o formulÃ¡rio de apresentaÃ§Ã£o
      setSelectedPresentation(null);
      setSelectedPresentationUnit(unitId);
      setSelectedPresentationManufacturerId(manufacturerId);
      resetPresentation({
        name: item.name || '',
        barcode: item.ean || '',
        conversion_factor: quantidade > 0 ? quantidade : 1,
        unit: unitId,
        manufacturer_id: manufacturerId,
      });

      // Abrir o modal de ediÃ§Ã£o
      setIsPresentationModalOpen(true);
    },
    [product, unitsOfMeasure, manufacturers, resetPresentation]
  );

  const unitOptions = unitsOfMeasure.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.symbol})`,
  }));

  const breadcrumbItems = useMemo(
    () => [
      { label: 'Produtos', href: productsListPath },
      { label: isEditing ? product?.name || 'Carregando...' : 'Novo Produto' },
    ],
    [isEditing, product?.name, productsListPath]
  );

  if (isEditing && isLoadingProduct) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com Breadcrumbs e BotÃµes */}
      <div className="flex items-center justify-between px-4 lg:px-4">
        <Breadcrumbs items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
        <div className="flex items-center gap-1">
          <Button
            variant="neutral"
            label="Voltar"
            onClick={() => safeNavigate(productsListPath)}
            showIcon={true}
            icon={<ArrowLeft className="h-4 w-4" />}
          ></Button>
          <Button
            onClick={handleSubmit(onSubmit, () => {
              if (!selectedStockUnitId) {
                setUnitStockError(true);
              }
              if (!selectedPrescriptionUnitId) {
                setUnitPrescriptionError(true);
              }
              toast.error('Preencha todos os campos obrigatÃ³rios');
            })}
            variant="solid"
            showIcon={false}
            disabled={createItem.isPending || updateItem.isPending}
            label={isEditing ? 'Salvar AlteraÃ§Ãµes' : 'Criar Produto'}
          />
        </div>
      </div>

      {/* Tabs */}
      <Card padding="none">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6">
            <div className="flex">
              <TabButton active={activeTab === 'data'} onClick={() => setActiveTab('data')}>
                Dados do Produto
              </TabButton>
              {isEditing && (
                <>
                  <TabButton
                    active={activeTab === 'presentations'}
                    onClick={() => setActiveTab('presentations')}
                    icon={<Box className="h-4 w-4" />}
                    badge={
                      presentations.length > 0 ? (
                        <span className="ml-1 inline-flex items-center justify-center whitespace-nowrap rounded-full bg-gray-200 px-1.5 py-0.5 align-middle text-xs leading-4 dark:bg-gray-700">
                          {presentations.length}
                        </span>
                      ) : undefined
                    }
                  >
                    ApresentaÃ§Ãµes
                  </TabButton>
                  <TabButton
                    active={activeTab === 'references'}
                    onClick={() => setActiveTab('references')}
                    icon={<Table className="h-4 w-4" />}
                    badge={
                      productRefLinks.length > 0 ? (
                        <span className="ml-1 inline-flex items-center justify-center whitespace-nowrap rounded-full bg-gray-200 px-1.5 py-0.5 align-middle text-xs leading-4 dark:bg-gray-700">
                          {productRefLinks.length}
                        </span>
                      ) : undefined
                    }
                  >
                    Tabelas de ReferÃªncia
                  </TabButton>
                </>
              )}
            </div>

            {/* BotÃ£o de salvar no canto direito */}
            <button
              type="button"
              onClick={handleSubmit(onSaveWithoutExit, () => {
                if (!selectedStockUnitId) {
                  setUnitStockError(true);
                }
                if (!selectedPrescriptionUnitId) {
                  setUnitPrescriptionError(true);
                }
                toast.error('Preencha todos os campos obrigatÃ³rios');
              })}
              disabled={createItem.isPending || updateItem.isPending}
              className="border-primary-300/50 bg-primary-100/30 text-primary-800 hover:bg-primary-100/50 hover:text-primary-900 dark:border-primary-700/50 dark:bg-primary-900/40 dark:text-primary-300 dark:hover:bg-primary-900/60 flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              title="Salvar alteraÃ§Ãµes"
            >
              {createItem.isPending || updateItem.isPending ? (
                <Loading size="sm" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Data Tab Content */}
          {activeTab === 'data' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Tipo de Produto */}
              <RadioGroup
                label="Tipo de Produto"
                options={[
                  { value: 'medication', label: 'Medicamento' },
                  { value: 'material', label: 'Material' },
                  { value: 'diet', label: 'Dieta' },
                ]}
                value={watchItemType}
                {...register('item_type', { required: 'Tipo Ã© obrigatÃ³rio' })}
                required
              />

              {/* Nome + ConcentraÃ§Ã£o na mesma linha */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-8">
                <Input label="CÃ³digo" placeholder="CÃ³digo" {...register('code')} />
                <div className="md:col-span-5">
                  <Input
                    label="Nome"
                    placeholder="Nome do produto"
                    {...register('name', { required: 'Nome Ã© obrigatÃ³rio' })}
                    error={errors.name?.message}
                    required
                  />
                </div>
                {watchItemType === 'medication' && (
                  <div className="md:col-span-2">
                    <Input
                      label="ConcentraÃ§Ã£o"
                      placeholder="Ex: 25mg, 500mg/5ml"
                      {...register('concentration')}
                    />
                  </div>
                )}
              </div>

              {/* Unidades, Estoque MÃ­nimo, TUSS e TISS na mesma linha */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                <SearchableSelect
                  label="Unidade de Estoque"
                  options={unitOptions}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar unidade..."
                  value={selectedStockUnitId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newValue = e.target.value;
                    setSelectedStockUnitId(newValue);
                    if (newValue) setUnitStockError(false);
                  }}
                  error={unitStockError ? 'ObrigatÃ³ria' : undefined}
                  required
                  onCreateNew={openNewUnitModal}
                  createNewLabel="Cadastrar nova unidade"
                />
                <SearchableSelect
                  label="Unidade de PrescriÃ§Ã£o"
                  options={unitOptions}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar unidade..."
                  value={selectedPrescriptionUnitId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newValue = e.target.value;
                    setSelectedPrescriptionUnitId(newValue);
                    if (newValue) setUnitPrescriptionError(false);
                  }}
                  error={unitPrescriptionError ? 'ObrigatÃ³ria' : undefined}
                  required
                  onCreateNew={openNewUnitModal}
                  createNewLabel="Cadastrar nova unidade"
                />
                <div className="w-full">
                  <div className="flex items-center gap-1">
                    <label htmlFor="unit_prescription_factor" className="label">
                      Fator PrescriÃ§Ã£o
                      <span className="text-feedback-danger-fg ml-1">*</span>
                    </label>
                    <span
                      className="mb-1 inline-flex h-4 w-4 items-center justify-center text-gray-600 dark:border-gray-600 dark:text-gray-300"
                      title="Informe quantas unidades de prescriÃ§Ã£o equivalem a 1 unidade base (estoque). Ex.: 1 frasco = 20 gotas â†’ fator 20."
                      aria-label="InformaÃ§Ã£o sobre fator de prescriÃ§Ã£o"
                    >
                      <Info className="h-3 w-3" />
                    </span>
                  </div>
                  <Input
                    id="unit_prescription_factor"
                    type="number"
                    min={0.001}
                    step="any"
                    placeholder="1"
                    {...register('unit_prescription_factor', {
                      required: 'Fator Ã© obrigatÃ³rio',
                      valueAsNumber: true,
                      min: { value: 0.001, message: 'MÃ­nimo: 0,001' },
                    })}
                    error={errors.unit_prescription_factor?.message}
                    required
                  />
                </div>
                <Input
                  label="Estoque MÃ­nimo"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  {...register('min_stock', { valueAsNumber: true })}
                />
                <Input label="TUSS" placeholder="CÃ³digo TUSS" {...register('tuss_ref')} />
                <Input label="TISS" placeholder="CÃ³digo TISS" {...register('tiss_ref')} />
              </div>

              {/* Campos especÃ­ficos para medicamentos - PrincÃ­pio Ativo + Grupo */}
              {watchItemType === 'medication' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <SearchableSelect
                    label="PrincÃ­pio Ativo"
                    options={(() => {
                      // Combina resultados da busca com o item selecionado (se houver)
                      const searchOptions = searchedActiveIngredients.map((ai) => ({
                        value: ai.id,
                        label: ai.name,
                      }));

                      // Se hÃ¡ um item selecionado que nÃ£o estÃ¡ na busca, adiciona-o usando o hook dedicado
                      if (selectedActiveIngredientId && selectedActiveIngredient) {
                        const isInSearch = searchOptions.some(
                          (opt) => opt.value === selectedActiveIngredientId
                        );
                        if (!isInSearch) {
                          searchOptions.unshift({
                            value: selectedActiveIngredient.id,
                            label: selectedActiveIngredient.name,
                          });
                        }
                      }

                      return [{ value: '', label: 'Digite para buscar...' }, ...searchOptions];
                    })()}
                    placeholder="Selecione o princÃ­pio ativo..."
                    searchPlaceholder="Buscar princÃ­pio ativo..."
                    value={selectedActiveIngredientId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSelectedActiveIngredientId(e.target.value)
                    }
                    onSearch={(term) => setActiveIngredientSearchTerm(term)}
                    onCreateNew={openNewActiveIngredientModal}
                    createNewLabel="Cadastrar novo princÃ­pio ativo"
                    emptyMessage="Nenhum princÃ­pio ativo encontrado"
                  />
                  <SearchableSelect
                    label="Grupo"
                    options={[
                      { value: '', label: 'Sem grupo' },
                      ...productGroups.map((g) => ({
                        value: g.id,
                        label: g.name,
                      })),
                    ]}
                    placeholder="Selecione o grupo..."
                    searchPlaceholder="Buscar grupo..."
                    value={selectedGroupId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSelectedGroupId(e.target.value)
                    }
                    onCreateNew={openNewGroupModal}
                    createNewLabel="Cadastrar novo grupo"
                  />
                </div>
              )}

              {/* DescriÃ§Ã£o por Ãºltimo */}
              <Textarea
                label="DescriÃ§Ã£o"
                placeholder="DescriÃ§Ã£o detalhada, composiÃ§Ã£o, indicaÃ§Ãµes..."
                {...register('description')}
              />

              {/* Switches de classificaÃ§Ã£o - apenas para medicamentos */}
              {watchItemType === 'medication' && (
                <div className="flex items-center gap-6">
                  <SwitchNew label="PsicotrÃ³pico" {...register('psychotropic')} />
                  <SwitchNew label="AntibiÃ³tico" {...register('antibiotic')} />
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
              )}

              {/* Status - quando nÃ£o Ã© medicamento */}
              {watchItemType !== 'medication' && (
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
              )}
            </form>
          )}

          {/* Presentations Tab Content */}
          {activeTab === 'presentations' && product && (
            <div className="space-y-6">
              {/* Existing Presentations List */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    ApresentaÃ§Ãµes Cadastradas
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setIsPresentationSearchModalOpen(true)}
                    >
                      <Search className="h-4 w-4" />
                      Buscar nas Tabelas
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedPresentation(null);
                        setSelectedPresentationUnit('');
                        setSelectedPresentationManufacturerId('');
                        resetPresentation({
                          name: '',
                          barcode: '',
                          conversion_factor: 1,
                          unit: '',
                          manufacturer_id: '',
                        });
                        setIsPresentationModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Manual
                    </Button>
                  </div>
                </div>

                {presentations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Nome
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Fabricante
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            ConversÃ£o
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            EAN
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            AÃ§Ãµes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                        {presentations.map((p) => {
                          // Buscar o sÃ­mbolo da unidade pelo ID
                          const presentationUnit = p.unit
                            ? unitsOfMeasure.find((u) => u.id === p.unit)
                            : null;
                          const unitSymbol = presentationUnit?.symbol || p.unit || p.name;

                          return (
                            <tr
                              key={p.id}
                              className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <td className="px-4 py-3">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {p.name}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {(p as any).manufacturer?.trade_name ||
                                  (p as any).manufacturer?.name ||
                                  p.supplier_name ||
                                  '-'}
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant="warning"
                                  className="w-fit gap-1.5 rounded-lg px-2.5 py-1"
                                >
                                  <span>1 {unitSymbol}</span>
                                  <span className="opacity-70">=</span>
                                  <span className="font-semibold">
                                    {p.conversion_factor}{' '}
                                    {(product as any)?.unit_stock?.symbol || 'UN'}
                                  </span>
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                {p.barcode || '-'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <IconButton
                                    onClick={() => openLinkPresentationModal(p)}
                                    title="Vincular com tabelas de referÃªncia"
                                  >
                                    <Link className="h-4 w-4" />
                                  </IconButton>
                                  <IconButton
                                    onClick={() => {
                                      setSelectedPresentation(p);
                                      setSelectedPresentationUnit(p.unit || '');
                                      setSelectedPresentationManufacturerId(
                                        p.manufacturer_id || ''
                                      );
                                      resetPresentation({
                                        name: p.name,
                                        barcode: p.barcode || '',
                                        conversion_factor: p.conversion_factor,
                                        unit: p.unit || '',
                                        manufacturer_id: p.manufacturer_id || '',
                                      });
                                      setIsPresentationModalOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </IconButton>
                                  <IconButton
                                    variant="danger"
                                    onClick={() => handleDeletePresentation(p)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </IconButton>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <Box className="mx-auto mb-3 h-12 w-12 opacity-50" />
                    <p className="font-medium">Nenhuma apresentaÃ§Ã£o cadastrada</p>
                    <p className="mt-1 text-sm">
                      Busque nas tabelas CMED, BrasÃ­ndice e Simpro ou cadastre manualmente
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <Button
                        variant="primary"
                        onClick={() => setIsPresentationSearchModalOpen(true)}
                      >
                        <Search className="h-4 w-4" />
                        Buscar nas Tabelas
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelectedPresentation(null);
                          setSelectedPresentationUnit('');
                          setSelectedPresentationManufacturerId('');
                          resetPresentation({
                            name: '',
                            barcode: '',
                            conversion_factor: 1,
                            unit: '',
                            manufacturer_id: '',
                          });
                          setIsPresentationModalOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Cadastrar Manualmente
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* References Tab Content */}
          {activeTab === 'references' && product && (
            <div className="space-y-6">
              {/* Current Links */}
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  VÃ­nculos Atuais
                </h3>

                {isLoadingRefLinks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loading size="md" />
                  </div>
                ) : productRefLinks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-8 text-center dark:border-gray-600 dark:bg-gray-800">
                    <Table className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Nenhum vÃ­nculo com tabelas de referÃªncia
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      Use a busca abaixo para vincular a CMED, SIMPRO ou BRASÃNDICE
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {productRefLinks.map((link: any) => {
                      const refItem = link.ref_item;
                      const source = link.source;
                      const pfPrice = refItem?.current_prices?.find(
                        (p: any) => p.price_type === 'pf'
                      );
                      const pmcPrice = refItem?.current_prices?.find(
                        (p: any) => p.price_type === 'pmc'
                      );
                      const latestPrice = pfPrice || pmcPrice;
                      // Parse date without timezone conversion (valid_from is a date string like "2026-01-08")
                      const lastUpdate = latestPrice?.valid_from
                        ? (() => {
                            const dateStr = latestPrice.valid_from.split('T')[0]; // Get just the date part
                            const [year, month, day] = dateStr.split('-');
                            return `${day}/${month}/${year}`;
                          })()
                        : null;

                      return (
                        <div
                          key={link.id}
                          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                        >
                          <div className="flex items-center gap-4">
                            {/* BotÃ£o estrela para definir como principal */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!link.is_primary) {
                                  setPrimaryRef.mutate({
                                    productId: product!.id,
                                    linkId: link.id,
                                  });
                                }
                              }}
                              disabled={link.is_primary || setPrimaryRef.isPending}
                              className={`shrink-0 rounded p-1 transition-colors ${
                                link.is_primary
                                  ? 'text-feedback-warning-fg cursor-default'
                                  : 'hover:text-feedback-warning-fg/80 dark:hover:text-feedback-warning-fg/80 text-gray-300 dark:text-gray-600'
                              }`}
                              title={
                                link.is_primary ? 'ReferÃªncia principal' : 'Definir como principal'
                              }
                            >
                              {link.is_primary ? (
                                <Star className="h-5 w-5" fill="currentColor" />
                              ) : (
                                <Star className="h-5 w-5" />
                              )}
                            </button>

                            {/* Badge da fonte */}
                            <Badge
                              variant={
                                source?.code === 'cmed'
                                  ? 'success'
                                  : source?.code === 'simpro'
                                    ? 'info'
                                    : 'gold'
                              }
                              className="shrink-0"
                            >
                              {source?.name}
                            </Badge>

                            {/* Nome e detalhes */}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-gray-900 dark:text-white">
                                {refItem?.product_name}
                                {refItem?.presentation && (
                                  <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                                    {refItem.presentation}
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {refItem?.manufacturer_name && (
                                  <span className="font-medium">{refItem.manufacturer_name}</span>
                                )}
                                {refItem?.manufacturer_name && refItem?.external_code && ' â€¢ '}
                                CÃ³d: {refItem?.external_code}
                                {refItem?.ean && ` â€¢ EAN: ${refItem.ean}`}
                              </p>
                            </div>

                            {/* Data de atualizaÃ§Ã£o */}
                            <div className="mr-12 min-w-[70px] shrink-0 text-center">
                              <p className="text-[10px] uppercase text-gray-400">Atualizado</p>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {lastUpdate || 'â€”'}
                              </p>
                            </div>

                            {/* Precos alinhados a direita */}
                            <div className="flex shrink-0 items-center gap-6">
                              <div className="text-right">
                                <p className="text-[10px] uppercase text-gray-400">
                                  {pfPrice?.price_meta?.label || 'PF'}
                                </p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {pfPrice
                                    ? pfPrice.price_value.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                      })
                                    : 'â€”'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] uppercase text-gray-400">
                                  {pmcPrice?.price_meta?.label || 'PMC'}
                                </p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {pmcPrice
                                    ? pmcPrice.price_value.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                      })
                                    : 'â€”'}
                                </p>
                              </div>
                            </div>

                            {/* BotÃ£o remover */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                unlinkFromRef.mutate({
                                  productId: product.id,
                                  sourceId: source?.id,
                                })
                              }
                              isLoading={unlinkFromRef.isPending}
                              className="shrink-0"
                            >
                              <X className="text-feedback-danger-fg h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Search and Link */}
              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adicionar VÃ­nculo
                </h3>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, cÃ³digo ou EAN nas tabelas de referÃªncia..."
                    value={refSearchTerm}
                    onChange={(e) => setRefSearchTerm(e.target.value)}
                    className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {refSearchTerm.length >= 2 && (
                  <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    {isSearchingRefs ? (
                      <div className="flex items-center justify-center py-8">
                        <Loading size="sm" />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-6 text-center text-gray-500 dark:text-gray-400">
                        Nenhum resultado encontrado
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {searchResults.map((item: RefItemUnified) => {
                          // Verifica quais fontes jÃ¡ estÃ£o vinculadas para este produto
                          const linkedSourceIds = productRefLinks.map((l: any) => l.ref_item_id);
                          const hasCmed =
                            item.cmed_item_id && linkedSourceIds.includes(item.cmed_item_id);
                          const hasBrasindice =
                            item.brasindice_item_id &&
                            linkedSourceIds.includes(item.brasindice_item_id);
                          const hasSimpro =
                            item.simpro_item_id && linkedSourceIds.includes(item.simpro_item_id);
                          const allLinked =
                            (!item.cmed_item_id || hasCmed) &&
                            (!item.brasindice_item_id || hasBrasindice) &&
                            (!item.simpro_item_id || hasSimpro);

                          return (
                            <div
                              key={item.ean}
                              className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                allLinked ? 'opacity-50' : ''
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                {/* Badges das fontes disponÃ­veis */}
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  {item.cmed_item_id && (
                                    <Badge variant={hasCmed ? 'neutral' : 'success'}>CMED</Badge>
                                  )}
                                  {item.brasindice_item_id && (
                                    <Badge variant={hasBrasindice ? 'neutral' : 'gold'}>
                                      BrasÃ­ndice
                                    </Badge>
                                  )}
                                  {item.simpro_item_id && (
                                    <Badge variant={hasSimpro ? 'neutral' : 'info'}>Simpro</Badge>
                                  )}
                                </div>

                                {/* Nome do medicamento */}
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {item.name}
                                </p>

                                {/* Detalhes: substÃ¢ncia e concentraÃ§Ã£o */}
                                {(item.substance || item.concentration) && (
                                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
                                    {item.substance}
                                    {item.substance && item.concentration && ' â€¢ '}
                                    {item.concentration}
                                  </p>
                                )}

                                {/* Fabricante */}
                                {item.manufacturer && (
                                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                    Fabricante: {item.manufacturer}
                                  </p>
                                )}

                                {/* CÃ³digos */}
                                <div className="mt-1 space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                  <span>EAN: {item.ean}</span>
                                  {item.ggrem_code && <span>â€¢ GGREM: {item.ggrem_code}</span>}
                                  {item.tiss && <span>â€¢ TISS: {item.tiss}</span>}
                                  {item.tuss && <span>â€¢ TUSS: {item.tuss}</span>}
                                </div>

                                {/* CÃ³digos por fonte */}
                                <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                  {item.brasindice_code && (
                                    <span>BrasÃ­ndice: {item.brasindice_code} </span>
                                  )}
                                  {item.simpro_code && <span>â€¢ Simpro: {item.simpro_code}</span>}
                                </div>
                              </div>

                              {/* BotÃµes de vÃ­nculo por fonte */}
                              <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-700">
                                {item.cmed_item_id && !hasCmed && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      // Buscar o source_id da CMED
                                      const cmedSource = refSources.find(
                                        (s: RefSource) => s.code === 'cmed'
                                      );
                                      if (cmedSource) {
                                        linkToRef.mutate({
                                          productId: product!.id,
                                          refItemId: item.cmed_item_id!,
                                          sourceId: cmedSource.id,
                                          isPrimary: productRefLinks.length === 0,
                                        });
                                      }
                                    }}
                                    isLoading={linkToRef.isPending}
                                  >
                                    <Link className="mr-1 h-3 w-3" />
                                    CMED
                                  </Button>
                                )}
                                {item.brasindice_item_id && !hasBrasindice && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      const brasindiceSource = refSources.find(
                                        (s: RefSource) => s.code === 'brasindice'
                                      );
                                      if (brasindiceSource) {
                                        linkToRef.mutate({
                                          productId: product!.id,
                                          refItemId: item.brasindice_item_id!,
                                          sourceId: brasindiceSource.id,
                                          isPrimary: productRefLinks.length === 0,
                                        });
                                      }
                                    }}
                                    isLoading={linkToRef.isPending}
                                  >
                                    <Link className="mr-1 h-3 w-3" />
                                    BrasÃ­ndice
                                  </Button>
                                )}
                                {item.simpro_item_id && !hasSimpro && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      const simproSource = refSources.find(
                                        (s: RefSource) => s.code === 'simpro'
                                      );
                                      if (simproSource) {
                                        linkToRef.mutate({
                                          productId: product!.id,
                                          refItemId: item.simpro_item_id!,
                                          sourceId: simproSource.id,
                                          isPrimary: productRefLinks.length === 0,
                                        });
                                      }
                                    }}
                                    isLoading={linkToRef.isPending}
                                  >
                                    <Link className="mr-1 h-3 w-3" />
                                    Simpro
                                  </Button>
                                )}
                                {allLinked && (
                                  <span className="text-xs text-gray-400">
                                    Todas as fontes jÃ¡ vinculadas
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Presentation Modal */}
      <Modal
        isOpen={isPresentationModalOpen}
        onClose={() => setIsPresentationModalOpen(false)}
        title={selectedPresentation ? 'Editar ApresentaÃ§Ã£o' : 'Nova ApresentaÃ§Ã£o'}
        size="lg"
      >
        <form onSubmit={handleSubmitPresentation(onSubmitPresentation)} className="space-y-4">
          {product && (
            <Alert tone="warning">
              <p>
                ApresentaÃ§Ã£o para:{' '}
                <strong>
                  {product.name}
                  {product.concentration && ` ${product.concentration}`}
                </strong>
                {(product as any).unit_stock && (
                  <span className="ml-1">(Unidade base: {(product as any).unit_stock.symbol})</span>
                )}
              </p>
            </Alert>
          )}

          {/* Linha 1: Nome da ApresentaÃ§Ã£o */}
          <Input
            label="Nome da ApresentaÃ§Ã£o"
            placeholder="Ex: Caixa 30 comp, Blister 10 comp"
            {...registerPresentation('name', {
              required: 'Nome Ã© obrigatÃ³rio',
            })}
            error={presentationErrors.name?.message}
            required
          />

          {/* Linha 2: Fabricante + EAN */}
          {suggestedManufacturer && !selectedPresentationManufacturerId && (
            <Alert tone="info">
              <p className="mb-2">
                Fabricante <strong>"{suggestedManufacturer.name}"</strong> nÃ£o encontrado no
                cadastro.
              </p>
              <button
                type="button"
                onClick={() => {
                  openNewManufacturerModal({
                    name: suggestedManufacturer.name,
                    trade_name: suggestedManufacturer.name,
                    document: suggestedManufacturer.cnpj,
                  });
                }}
                className="bg-primary-600 text-content-inverse hover:bg-primary-700 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Cadastrar "{suggestedManufacturer.name}"
              </button>
            </Alert>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SearchableSelect
              label="Fabricante"
              options={[
                { value: '', label: 'Selecione...' },
                ...manufacturers
                  .filter((m) => m.active)
                  .map((m) => ({
                    value: m.id,
                    label: m.trade_name || m.name,
                  })),
              ]}
              placeholder="Selecione o fabricante..."
              searchPlaceholder="Buscar fabricante..."
              value={selectedPresentationManufacturerId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSelectedPresentationManufacturerId(e.target.value)
              }
              onCreateNew={openNewManufacturerModal}
              createNewLabel="Cadastrar novo fabricante"
              required
            />
            <Input
              label="CÃ³digo de Barras (EAN)"
              placeholder="7891234567890"
              {...registerPresentation('barcode')}
            />
          </div>

          {/* Linha 3: ConversÃ£o visual - 1 [Unidade Entrada] = [Fator] [Unidade Base] */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
              ConversÃ£o de Unidades
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {/* Numeral 1 */}
              <div className="w-16">
                <Input
                  label="Qtd"
                  value="1"
                  disabled
                  className="cursor-not-allowed bg-gray-100 text-center dark:bg-gray-700"
                />
              </div>

              {/* Unidade Entrada */}
              <div className="min-w-[140px] flex-1">
                <SearchableSelect
                  label="Unidade Entrada"
                  options={unitOptions}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar unidade..."
                  value={selectedPresentationUnit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newValue = e.target.value;
                    setSelectedPresentationUnit(newValue);
                  }}
                  required
                  onCreateNew={openNewUnitModal}
                  createNewLabel="Cadastrar nova unidade"
                />
              </div>

              {/* Sinal de igual */}
              <div className="mt-6 flex h-10 w-8 items-center justify-center">
                <span className="text-xl font-bold text-gray-500 dark:text-gray-400">=</span>
              </div>

              {/* Fator de ConversÃ£o */}
              <div className="w-24">
                <Input
                  label="Fator"
                  type="number"
                  min={0.001}
                  step="any"
                  placeholder="30"
                  {...registerPresentation('conversion_factor', {
                    required: 'Fator Ã© obrigatÃ³rio',
                    valueAsNumber: true,
                    min: { value: 0.001, message: 'MÃ­nimo: 0.001' },
                  })}
                  error={presentationErrors.conversion_factor?.message}
                  required
                />
              </div>

              {/* Unidade Base (bloqueada) */}
              <div className="min-w-[140px] flex-1">
                <Input
                  label="Unidade Base"
                  value={
                    (product as any)?.unit_stock
                      ? `${(product as any).unit_stock.name} (${(product as any).unit_stock.symbol})`
                      : 'UN'
                  }
                  disabled
                  className="cursor-not-allowed bg-gray-100 dark:bg-gray-700"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Exemplo: 1 Caixa = 30 Comprimidos
            </p>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              showIcon={false}
              onClick={() => setIsPresentationModalOpen(false)}
              label="Cancelar"
            />
            <Button
              type="submit"
              variant="solid"
              showIcon={false}
              disabled={createPresentation.isPending || updatePresentation.isPending}
              label={selectedPresentation ? 'Salvar' : 'Adicionar'}
            />
          </ModalFooter>
        </form>
      </Modal>

      {/* New Active Ingredient Modal */}
      <Modal
        isOpen={isNewActiveIngredientModalOpen}
        onClose={() => setIsNewActiveIngredientModalOpen(false)}
        title="Cadastrar PrincÃ­pio Ativo"
        size="md"
      >
        <form
          onSubmit={handleSubmitNewActiveIngredient(handleCreateActiveIngredient)}
          className="space-y-4"
        >
          <Alert tone="info">
            <p>
              ApÃ³s salvar, o princÃ­pio ativo serÃ¡ selecionado automaticamente no formulÃ¡rio.
            </p>
          </Alert>

          <Input
            label="Nome do PrincÃ­pio Ativo"
            placeholder="Ex: Dipirona, Paracetamol, Amoxicilina"
            {...registerNewActiveIngredient('name', { required: 'Nome Ã© obrigatÃ³rio' })}
            error={newActiveIngredientErrors.name?.message}
            required
          />

          <Textarea
            label="DescriÃ§Ã£o (opcional)"
            placeholder="DescriÃ§Ã£o, indicaÃ§Ãµes, observaÃ§Ãµes..."
            rows={3}
            {...registerNewActiveIngredient('description')}
          />

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              showIcon={false}
              onClick={() => setIsNewActiveIngredientModalOpen(false)}
              label="Cancelar"
            />
            <Button
              type="submit"
              variant="solid"
              showIcon={false}
              disabled={createActiveIngredient.isPending}
              label="Cadastrar"
            />
          </ModalFooter>
        </form>
      </Modal>

      {/* New Manufacturer Modal */}
      <Modal
        isOpen={isNewManufacturerModalOpen}
        onClose={() => setIsNewManufacturerModalOpen(false)}
        title="Cadastrar Fabricante"
        size="md"
      >
        <form
          onSubmit={handleSubmitNewManufacturer(handleCreateManufacturer)}
          className="space-y-4"
        >
          <Alert tone="info">
            <p>ApÃ³s salvar, o fabricante serÃ¡ selecionado automaticamente no formulÃ¡rio.</p>
          </Alert>

          <Input
            label="RazÃ£o Social"
            placeholder="Nome completo da empresa"
            {...registerNewManufacturer('name', { required: 'RazÃ£o social Ã© obrigatÃ³ria' })}
            error={newManufacturerErrors.name?.message}
            required
          />

          <Input
            label="Nome Fantasia (opcional)"
            placeholder="Nome comercial da empresa"
            {...registerNewManufacturer('trade_name')}
          />

          <Input
            label="CNPJ (opcional)"
            placeholder="00.000.000/0000-00"
            {...registerNewManufacturer('document')}
          />

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              showIcon={false}
              onClick={() => setIsNewManufacturerModalOpen(false)}
              label="Cancelar"
            />
            <Button
              type="submit"
              variant="solid"
              showIcon={false}
              disabled={createManufacturer.isPending}
              label="Cadastrar"
            />
          </ModalFooter>
        </form>
      </Modal>

      {/* New Group Modal */}
      <Modal
        isOpen={isNewGroupModalOpen}
        onClose={() => setIsNewGroupModalOpen(false)}
        title="Cadastrar Grupo"
        size="md"
      >
        <form onSubmit={handleSubmitNewGroup(handleCreateGroup)} className="space-y-4">
          <Alert tone="info">
            <p>ApÃ³s salvar, o grupo serÃ¡ selecionado automaticamente no formulÃ¡rio.</p>
          </Alert>

          <Input
            label="CÃ³digo (opcional)"
            placeholder="CÃ³digo do grupo"
            {...registerNewGroup('code')}
          />

          <Input
            label="Nome"
            placeholder="Nome do grupo"
            {...registerNewGroup('name', { required: 'Nome Ã© obrigatÃ³rio' })}
            error={newGroupErrors.name?.message}
            required
          />

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
              Cor
            </label>
            <input
              type="color"
              {...registerNewGroup('color')}
              className="h-8 w-full cursor-pointer rounded-lg border border-gray-200 dark:border-gray-600"
            />
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              showIcon={false}
              onClick={() => setIsNewGroupModalOpen(false)}
              label="Cancelar"
            />
            <Button
              type="submit"
              variant="solid"
              showIcon={false}
              disabled={createProductGroup.isPending}
              label="Cadastrar"
            />
          </ModalFooter>
        </form>
      </Modal>

      {/* Modal Novo Unidade de Medida */}
      <Modal
        isOpen={isNewUnitModalOpen}
        onClose={() => setIsNewUnitModalOpen(false)}
        title="Nova Unidade de Medida"
        size="md"
      >
        <form onSubmit={handleSubmitNewUnit(handleCreateUnit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4">
            <div>
              <Input
                label="CÃ³digo"
                placeholder="UN, CX, FR..."
                {...registerNewUnit('code', { required: 'CÃ³digo Ã© obrigatÃ³rio' })}
                error={newUnitErrors.code?.message}
                required
              />
            </div>
            <div>
              <Input
                label="SÃ­mbolo"
                placeholder="un, cx, fr..."
                {...registerNewUnit('symbol', { required: 'SÃ­mbolo Ã© obrigatÃ³rio' })}
                error={newUnitErrors.symbol?.message}
                required
              />
            </div>
            <div className="col-span-2">
              <Input
                label="Nome"
                placeholder="Unidade, Caixa, Frasco..."
                {...registerNewUnit('name', { required: 'Nome Ã© obrigatÃ³rio' })}
                error={newUnitErrors.name?.message}
                required
              />
            </div>
          </div>
          <div className="px-4">
            <Input
              label="DescriÃ§Ã£o"
              placeholder="DescriÃ§Ã£o opcional"
              {...registerNewUnit('description')}
            />
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              showIcon={false}
              onClick={() => setIsNewUnitModalOpen(false)}
              label="Cancelar"
            />
            <Button
              type="submit"
              variant="solid"
              showIcon={false}
              disabled={createUnitOfMeasure.isPending}
              label="Cadastrar"
            />
          </ModalFooter>
        </form>
      </Modal>

      {/* Modal Vincular ApresentaÃ§Ã£o com Tabelas de ReferÃªncia */}
      <Modal
        isOpen={isPresentationLinkModalOpen}
        onClose={() => {
          setIsPresentationLinkModalOpen(false);
          setPresentationLinkData(null);
          setPresentationForLinking(null);
          setIsLoadingRefData(false);
        }}
        title="Vincular ApresentaÃ§Ã£o com Tabelas de ReferÃªncia"
        size="lg"
      >
        {isLoadingRefData ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loading size="lg" />
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Buscando item nas tabelas de referÃªncia...
            </p>
            {presentationForLinking && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                EAN: {presentationForLinking.barcode}
              </p>
            )}
          </div>
        ) : product && presentationLinkData ? (
          <>
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Selecione qual tabela deseja vincular:
                </p>

                <div className="space-y-2">
                  {presentationLinkData.cmed_item_id && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (product) {
                          linkToRef.mutate(
                            {
                              productId: product.id,
                              refItemId: presentationLinkData.cmed_item_id!,
                              sourceId: '2377a4cd-91a8-4e38-896f-ef90d58adcfc', // CMED
                            },
                            {
                              onSuccess: () => {
                                toast.success('Vinculado com sucesso ao CMED!');
                                setIsPresentationLinkModalOpen(false);
                                setPresentationLinkData(null);
                                setPresentationForLinking(null);
                              },
                            }
                          );
                        }
                      }}
                      isLoading={linkToRef.isPending}
                      className="w-full"
                    >
                      <div className="flex w-full gap-4">
                        <div className="flex w-[100px] flex-col items-start justify-center">
                          <Badge variant="success">CMED</Badge>
                        </div>
                        <div className="flex flex-1 flex-col items-start gap-1">
                          {presentationLinkData.cmed_pf_date && (
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Data de atualizaÃ§Ã£o:{' '}
                              {formatDateOnly(presentationLinkData.cmed_pf_date)}
                            </span>
                          )}
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {presentationLinkData.name}
                          </div>
                          <div className="flex gap-3 text-xs">
                            {presentationLinkData.cmed_pf !== undefined && (
                              <span className="text-gray-700 dark:text-gray-300">
                                PF:{' '}
                                <span className="font-semibold">
                                  R$ {presentationLinkData.cmed_pf?.toFixed(2)}
                                </span>
                                {presentationLinkData.cmed_pf_label && (
                                  <span className="ml-1 text-gray-500 dark:text-gray-400">
                                    ({presentationLinkData.cmed_pf_label})
                                  </span>
                                )}
                              </span>
                            )}
                            {presentationLinkData.cmed_pmc !== undefined && (
                              <span className="text-gray-700 dark:text-gray-300">
                                PMC:{' '}
                                <span className="font-semibold">
                                  R$ {presentationLinkData.cmed_pmc?.toFixed(2)}
                                </span>
                                {presentationLinkData.cmed_pmc_label && (
                                  <span className="ml-1 text-gray-500 dark:text-gray-400">
                                    ({presentationLinkData.cmed_pmc_label})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Button>
                  )}

                  {presentationLinkData.brasindice_item_id && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (product) {
                          linkToRef.mutate(
                            {
                              productId: product.id,
                              refItemId: presentationLinkData.brasindice_item_id!,
                              sourceId: '6665ca85-3393-47d4-9cc4-78bdad61d35b', // BrasÃ­ndice
                            },
                            {
                              onSuccess: () => {
                                toast.success('Vinculado com sucesso ao BrasÃ­ndice!');
                                setIsPresentationLinkModalOpen(false);
                                setPresentationLinkData(null);
                                setPresentationForLinking(null);
                              },
                            }
                          );
                        }
                      }}
                      isLoading={linkToRef.isPending}
                      className="w-full"
                    >
                      <div className="flex w-full gap-4">
                        <div className="flex w-[100px] flex-col items-start justify-center">
                          <Badge variant="gold">BRASÃNDICE</Badge>
                        </div>
                        <div className="flex flex-1 flex-col items-start gap-1">
                          {presentationLinkData.brasindice_pf_date && (
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Data de atualizaÃ§Ã£o:{' '}
                              {formatDateOnly(presentationLinkData.brasindice_pf_date)}
                            </span>
                          )}
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {presentationLinkData.name}
                          </div>
                          <div className="flex gap-3 text-xs">
                            {presentationLinkData.brasindice_pf !== undefined && (
                              <span className="text-gray-700 dark:text-gray-300">
                                PF:{' '}
                                <span className="font-semibold">
                                  R$ {presentationLinkData.brasindice_pf?.toFixed(2)}
                                </span>
                                {presentationLinkData.brasindice_pf_label && (
                                  <span className="ml-1 text-gray-500 dark:text-gray-400">
                                    ({presentationLinkData.brasindice_pf_label})
                                  </span>
                                )}
                              </span>
                            )}
                            {presentationLinkData.brasindice_pmc !== undefined && (
                              <span className="text-gray-700 dark:text-gray-300">
                                PMC:{' '}
                                <span className="font-semibold">
                                  R$ {presentationLinkData.brasindice_pmc?.toFixed(2)}
                                </span>
                                {presentationLinkData.brasindice_pmc_label && (
                                  <span className="ml-1 text-gray-500 dark:text-gray-400">
                                    ({presentationLinkData.brasindice_pmc_label})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Button>
                  )}

                  {presentationLinkData.simpro_item_id && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (product) {
                          linkToRef.mutate(
                            {
                              productId: product.id,
                              refItemId: presentationLinkData.simpro_item_id!,
                              sourceId: '12416fc1-d035-409d-87ea-3f08e0be0fab', // Simpro
                            },
                            {
                              onSuccess: () => {
                                toast.success('Vinculado com sucesso ao Simpro!');
                                setIsPresentationLinkModalOpen(false);
                                setPresentationLinkData(null);
                                setPresentationForLinking(null);
                              },
                            }
                          );
                        }
                      }}
                      isLoading={linkToRef.isPending}
                      className="w-full"
                    >
                      <div className="flex w-full gap-4">
                        <div className="flex w-[100px] flex-col items-start justify-center">
                          <Badge variant="info">SIMPRO</Badge>
                        </div>
                        <div className="flex flex-1 flex-col items-start gap-1">
                          {presentationLinkData.simpro_pf_date && (
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              Data de atualizaÃ§Ã£o:{' '}
                              {formatDateOnly(presentationLinkData.simpro_pf_date)}
                            </span>
                          )}
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {presentationLinkData.name}
                          </div>
                          <div className="flex gap-3 text-xs">
                            {presentationLinkData.simpro_pf !== undefined && (
                              <span className="text-gray-700 dark:text-gray-300">
                                PF:{' '}
                                <span className="font-semibold">
                                  R$ {presentationLinkData.simpro_pf?.toFixed(2)}
                                </span>
                                {presentationLinkData.simpro_pf_label && (
                                  <span className="ml-1 text-gray-500 dark:text-gray-400">
                                    ({presentationLinkData.simpro_pf_label})
                                  </span>
                                )}
                              </span>
                            )}
                            {presentationLinkData.simpro_pmc !== undefined && (
                              <span className="text-gray-700 dark:text-gray-300">
                                PMC:{' '}
                                <span className="font-semibold">
                                  R$ {presentationLinkData.simpro_pmc?.toFixed(2)}
                                </span>
                                {presentationLinkData.simpro_pmc_label && (
                                  <span className="ml-1 text-gray-500 dark:text-gray-400">
                                    ({presentationLinkData.simpro_pmc_label})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Button>
                  )}

                  {!presentationLinkData.cmed_item_id &&
                    !presentationLinkData.brasindice_item_id &&
                    !presentationLinkData.simpro_item_id && (
                      <div className="py-6 text-center text-gray-500 dark:text-gray-400">
                        <p>Nenhuma tabela de referÃªncia disponÃ­vel para este item</p>
                      </div>
                    )}
                </div>
              </div>
            </div>

            <ModalFooter>
              <Button
                type="button"
                variant="outline"
                showIcon={false}
                onClick={() => {
                  setIsPresentationLinkModalOpen(false);
                  setPresentationLinkData(null);
                  setPresentationForLinking(null);
                }}
                label="Cancelar"
              />
            </ModalFooter>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              Nenhum item encontrado nas tabelas de referÃªncia
            </p>
            <ModalFooter className="mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsPresentationLinkModalOpen(false);
                  setPresentationLinkData(null);
                  setPresentationForLinking(null);
                }}
              >
                Fechar
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* Presentation Search Modal */}
      {product && (
        <PresentationSearchModal
          isOpen={isPresentationSearchModalOpen}
          onClose={() => setIsPresentationSearchModalOpen(false)}
          productId={product.id}
          productName={product.name}
          productConcentration={product.concentration || undefined}
          existingPresentations={presentations}
          onSelectItem={handleSelectRefItemForPresentation}
        />
      )}
    </div>
  );
}
