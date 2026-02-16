import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import {
  Card,
  Button,
  DataTable,
  Modal,
  ModalFooter,
  SearchableSelect,
  Input,
  DatePicker,
  StatusBadge,
  Alert,
  EmptyState,
  Loading,
  LoadingOverlay,
  Breadcrumbs,
} from '@/components/ui';
import ProductModal from '@/components/product/ProductModal';
import CmedSuggestionModal from '@/components/nfe/CmedSuggestionModal';
import {
  useNfeImport,
  useNfeImportItems,
  useUpdateNfeImportItem,
  useUpdateNfeImport,
  useProcessNfeImport,
  useLinkNfeToSupplier,
} from '@/hooks/useNfeImport';
import { useProducts } from '@/hooks/useProducts';
import { usePresentations, useCreatePresentation } from '@/hooks/usePresentations';
import { useStockLocations } from '@/hooks/useStock';
import { useSuppliers, useSupplierByDocument, useCreateSupplier } from '@/hooks/useSuppliers';
import { useUnitsOfMeasure } from '@/hooks/useUnitsOfMeasure';
import { useManufacturers, useCreateManufacturer } from '@/hooks/useManufacturers';
import { fetchRefItemUnifiedByEan, fetchRefItemsBatchByEans } from '@/hooks/useReferenceTables';
import { useNavigationGuard } from '@/contexts/NavigationGuardContext';
import type { NfeImportItem, Product, RefItemUnified } from '@/types/database';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { formatDateOnly } from '@/lib/dateOnly';
import {
  ArrowLeft,
  CheckCircle,
  Link,
  FileDown,
  CalendarDays,
  Plus,
  Sparkles,
  QrCode,
  Store,
  AlertTriangle,
  Info,
  Box,
  Eye,
  EyeOff,
  Copy,
  Key,
  Hash,
  Pencil,
  Search,
} from 'lucide-react';
interface NewPresentationFormData {
  name: string;
  barcode: string;
  conversion_factor: number;
  unit: string;
  manufacturer_id: string;
}

interface NewSupplierFormData {
  name: string;
  trade_name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
}

interface NewManufacturerFormData {
  name: string;
  trade_name: string;
  document: string;
}

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

const getFirstWord = (value?: string | null): string => {
  const trimmed = value?.trim() || '';
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] || '';
};

const formatPhoneInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCepInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export default function NfeImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: nfe, isLoading: loadingNfe } = useNfeImport(id);
  const {
    data: items = [],
    isLoading: loadingItems,
    refetch: refetchItems,
  } = useNfeImportItems(id);
  const { data: products = [] } = useProducts();
  const { data: locations = [] } = useStockLocations();
  const { data: suppliers = [] } = useSuppliers();
  const { data: unitsOfMeasure = [] } = useUnitsOfMeasure();
  const { data: manufacturers = [] } = useManufacturers();

  // Check if supplier already exists by document
  const { data: existingSupplier, isLoading: _loadingSupplier } = useSupplierByDocument(
    nfe?.issuer_document ?? undefined
  );

  const createPresentation = useCreatePresentation();
  const createSupplier = useCreateSupplier();
  const createManufacturer = useCreateManufacturer();
  const linkNfeToSupplier = useLinkNfeToSupplier();

  const updateItem = useUpdateNfeImportItem();
  const updateNfe = useUpdateNfeImport();
  const processNfe = useProcessNfeImport();

  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isNewPresentationModalOpen, setIsNewPresentationModalOpen] = useState(false);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [isLinkSupplierModalOpen, setIsLinkSupplierModalOpen] = useState(false);
  const [isCmedSuggestionModalOpen, setIsCmedSuggestionModalOpen] = useState(false);

  // New presentation workflow states
  const [isProductExistsModalOpen, setIsProductExistsModalOpen] = useState(false);
  const [isSelectProductForPresentationModalOpen, setIsSelectProductForPresentationModalOpen] =
    useState(false);
  const [isNewManufacturerModalOpen, setIsNewManufacturerModalOpen] = useState(false);
  const [productForNewPresentation, setProductForNewPresentation] = useState<Product | null>(null);
  const [refItemDataForPresentation, setRefItemDataForPresentation] =
    useState<RefItemUnified | null>(null);
  const [isLoadingRefData, setIsLoadingRefData] = useState(false);
  const [selectedPresentationUnit, setSelectedPresentationUnit] = useState('');
  const [selectedPresentationManufacturerId, setSelectedPresentationManufacturerId] = useState('');
  const [suggestedManufacturer, setSuggestedManufacturer] = useState<{
    name: string;
    cnpj: string;
  } | null>(null);

  const [selectedItem, setSelectedItem] = useState<NfeImportItem | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedPresentationId, setSelectedPresentationId] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [ignoredItemIds, setIgnoredItemIds] = useState<Set<string>>(new Set());
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [newSupplierDocumentValue, setNewSupplierDocumentValue] = useState('');
  const [newSupplierPhoneValue, setNewSupplierPhoneValue] = useState('');
  const [newSupplierZipValue, setNewSupplierZipValue] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [manufactureDate, setManufactureDate] = useState('');

  // Contexto de navegação protegida
  const { handleLinkClick: handleBreadcrumbNavigate } = useNavigationGuard();

  // Reference item data for all items with EAN (for price lookup fallback)
  const [refItemDataMap, setRefItemDataMap] = useState<Map<string, RefItemUnified>>(new Map());
  const [isLoadingRefItems, setIsLoadingRefItems] = useState(false);
  const [loadingEanProgress, setLoadingEanProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [processedEans, setProcessedEans] = useState<Set<string>>(new Set());

  // Create a stable key for ALL EANs (not just unmapped) for price reference lookup
  const allEansKey = items
    .filter((item) => item.ean)
    .map((item) => item.ean as string)
    .sort()
    .join(',');

  // Create a stable key for mapped product IDs
  const _mappedProductIdsKey = items
    .filter((item) => item.product_id)
    .map((item) => item.product_id as string)
    .sort()
    .join(',');

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'NFes', href: '/nfe' },
    { label: nfe ? `NFe ${nfe.number}` : 'Carregando...' },
  ];

  // Fetch reference item data for all items with EAN (for price reference)
  useEffect(() => {
    // Wait for data to be ready
    if (loadingNfe || loadingItems) {
      return;
    }

    // Get company_id from nfe
    const companyId = nfe?.company_id;
    if (!companyId) {
      setRefItemDataMap(new Map());
      return;
    }

    // Parse EANs from the stable key
    const eans = allEansKey ? allEansKey.split(',').filter(Boolean) : [];

    if (eans.length === 0) {
      setRefItemDataMap(new Map());
      return;
    }

    let cancelled = false;

    const fetchRefItemData = async () => {
      setIsLoadingRefItems(true);
      setLoadingEanProgress({ current: 0, total: eans.length });
      setProcessedEans(new Set());

      try {
        // Use optimized batch function instead of individual queries
        const batchResult = await fetchRefItemsBatchByEans(eans, companyId);

        if (!cancelled) {
          setRefItemDataMap(batchResult);
          setProcessedEans(new Set(eans));
          setLoadingEanProgress({ current: eans.length, total: eans.length });
        }
      } catch (error) {
        console.error('Erro ao buscar dados unificados em lote:', error);
      } finally {
        if (!cancelled) {
          setIsLoadingRefItems(false);
          setLoadingEanProgress(null);
        }
      }
    };

    fetchRefItemData();

    return () => {
      cancelled = true;
    };
  }, [allEansKey, nfe?.company_id, loadingNfe, loadingItems]);

  // Fetch ref item individually for selected item (fallback when not in batch map)
  // Removed useRefItemByEan hook as it may conflict with the unified view data
  // const { data: selectedItemRefDataFromHook } = useRefItemByEan(selectedItem?.ean);

  // Reference item data for current selected item (for modal) - try map first, then individual query
  const selectedItemRefData = selectedItem?.ean
    ? refItemDataMap.get(selectedItem.ean) || undefined
    : undefined;

  // Presentations for selected product
  const { data: selectedItemPresentations = [] } = usePresentations(selectedProductId || undefined);

  const {
    register: registerNewPresentation,
    handleSubmit: handleSubmitNewPresentation,
    reset: resetNewPresentation,
    formState: { errors: newPresentationErrors },
  } = useForm<NewPresentationFormData>();

  const {
    register: registerNewSupplier,
    handleSubmit: handleSubmitNewSupplier,
    reset: resetNewSupplier,
    setValue: setNewSupplierValue,
    formState: { errors: newSupplierErrors },
  } = useForm<NewSupplierFormData>();

  const {
    register: registerNewManufacturer,
    handleSubmit: handleSubmitNewManufacturer,
    reset: resetNewManufacturer,
    formState: { errors: newManufacturerErrors },
  } = useForm<NewManufacturerFormData>();

  // Unit options for presentation form
  const unitOptions = unitsOfMeasure.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.code})`,
  }));

  /**
   * Open product selection modal directly when user clicks to register presentation
   */
  const openProductSelectionModal = useCallback((item: NfeImportItem) => {
    setSelectedItem(item);
    setBatchNumber(item.batch_number || '');
    setExpirationDate(item.expiration_date || '');
    setManufactureDate(item.manufacture_date || '');
    setSelectedProductId(''); // Limpar seleção anterior
    setIsSelectProductForPresentationModalOpen(true);
  }, []);

  /**
   * User selected "Yes, product exists" - open product selection modal
   */
  const handleProductExists = () => {
    setIsProductExistsModalOpen(false);
    setSelectedProductId(''); // Limpar seleção anterior
    setIsSelectProductForPresentationModalOpen(true);
  };

  /**
   * User selected "No, create new product" - open product creation modal
   */
  const handleProductDoesNotExist = () => {
    setIsProductExistsModalOpen(false);
    setIsNewProductModalOpen(true);
  };

  /**
   * User selected a product - fetch ref item data and open presentation modal
   */
  const handleSelectProductForPresentation = async () => {
    if (!selectedProductId || !selectedItem) return;

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    setProductForNewPresentation(product);
    setIsSelectProductForPresentationModalOpen(false);
    setProductSearchQuery('');

    // Abrir modal de apresentação IMEDIATAMENTE com loading
    setIsLoadingRefData(true);
    setIsNewPresentationModalOpen(true);

    // Fetch ref item data from vw_ref_item_unified if EAN exists
    if (selectedItem.ean) {
      try {
        const unifiedData = await fetchRefItemUnifiedByEan(selectedItem.ean, nfe?.company_id);
        if (unifiedData) {
          setRefItemDataForPresentation(unifiedData);
          // Preencher formulário com dados da referência
          fillPresentationFormWithRefData(unifiedData, product);
        } else {
          // No ref item found, preencher com dados básicos
          fillPresentationFormWithBasicData(product);
        }
      } catch (error) {
        console.error('Erro ao buscar dados da view unificada:', error);
        fillPresentationFormWithBasicData(product);
      } finally {
        setIsLoadingRefData(false);
      }
    } else {
      fillPresentationFormWithBasicData(product);
      setIsLoadingRefData(false);
    }
  };

  /**
   * Fill presentation form with ref item data (without opening modal)
   */
  const fillPresentationFormWithRefData = (item: RefItemUnified, _product: Product) => {
    // Determinar a unidade de entrada baseado na unidade do item
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

    // Se não encontrou Frasco ou a unidade não é ml, usar Caixa como padrão
    if (!unitId) {
      const caixaUnit = unitsOfMeasure.find(
        (u) => u.code.toLowerCase() === 'cx' || u.name.toLowerCase() === 'caixa'
      );
      if (caixaUnit) {
        unitId = caixaUnit.id;
      }
    }

    // Tentar vincular fabricante pelo CNPJ
    let manufacturerId = '';
    // Busca por CNPJ removida pois não existe fabricante_cnpj em item

    // Se não encontrou pelo CNPJ, tentar pelo nome
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

    // Se não encontrou fabricante, guardar sugestão para cadastro
    if (!manufacturerId && item.manufacturer) {
      setSuggestedManufacturer({
        name: item.manufacturer,
        cnpj: '',
      });
    } else {
      setSuggestedManufacturer(null);
    }

    // Determinar o nome da apresentação - priorizar nome completo se disponível
    let presentationName = selectedItem?.raw_description || '';
    if (item.name) {
      presentationName = item.name;
    } else if (item.substance) {
      presentationName = item.substance;
    }

    // Preencher o formulário de apresentação
    setSelectedPresentationUnit(unitId);
    setSelectedPresentationManufacturerId(manufacturerId);
    resetNewPresentation({
      name: presentationName,
      barcode: item.ean || selectedItem?.ean || '',
      conversion_factor: item.quantity || 1,
      unit: unitId,
      manufacturer_id: manufacturerId,
    });
  };

  /**
   * Fill presentation form with basic data (without opening modal)
   */
  const fillPresentationFormWithBasicData = (_product: Product) => {
    setSelectedPresentationUnit('');
    setSelectedPresentationManufacturerId('');
    setSuggestedManufacturer(null);

    let presentationName = selectedItem?.raw_description || '';
    let conversionFactor = 1;

    // Se tem EAN, tentar buscar dados de referência para obter nome completo e quantidade
    if (selectedItem?.ean) {
      const refData = refItemDataMap.get(selectedItem.ean);
      if (refData) {
        if (refData.name) {
          presentationName = refData.name;
        } else if (refData.substance) {
          presentationName = refData.substance;
        }
        if (refData.quantity) {
          conversionFactor = refData.quantity;
        }
      }
    }

    resetNewPresentation({
      name: presentationName,
      barcode: selectedItem?.ean || '',
      conversion_factor: conversionFactor,
      unit: '',
      manufacturer_id: '',
    });
  };

  /**
   * Open presentation modal with basic data (when no ref item found)
   */
  const _openPresentationModalWithBasicData = async (_product: Product) => {
    setSelectedPresentationUnit('');
    setSelectedPresentationManufacturerId('');
    setSuggestedManufacturer(null);

    let presentationName = selectedItem?.raw_description || '';
    let conversionFactor = 1;

    // Se tem EAN, tentar buscar dados de referência para obter nome completo e quantidade
    if (selectedItem?.ean) {
      try {
        const refData = refItemDataMap.get(selectedItem.ean);
        if (refData) {
          if (refData.name) {
            // Se encontrou nome completo, usar como nome
            presentationName = refData.name;
          } else if (refData.substance) {
            // Se não tem nome, usar substância como fallback
            presentationName = refData.substance;
          }
          // Usar quantidade da tabela de referência
          if (refData.quantity) {
            conversionFactor = refData.quantity;
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados de referência:', error);
      }
    }

    resetNewPresentation({
      name: presentationName,
      barcode: selectedItem?.ean || '',
      conversion_factor: conversionFactor,
      unit: '',
      manufacturer_id: '',
    });
    setIsNewPresentationModalOpen(true);
  };

  /**
   * Callback when a ref item is selected to fill presentation form
   * Similar to ProductFormPage handleSelectRefItemForPresentation
   */
  const _handleSelectRefItemForPresentation = useCallback(
    (item: RefItemUnified, _product: Product) => {
      // Determinar a unidade de entrada baseado na unidade do item
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

      // Se não encontrou Frasco ou a unidade não é ml, usar Caixa como padrão
      if (!unitId) {
        const caixaUnit = unitsOfMeasure.find(
          (u) => u.code.toLowerCase() === 'cx' || u.name.toLowerCase() === 'caixa'
        );
        if (caixaUnit) {
          unitId = caixaUnit.id;
        }
      }

      // Tentar vincular fabricante pelo CNPJ
      let manufacturerId = '';
      // Busca por CNPJ removida pois não existe fabricante_cnpj em item

      // Se não encontrou pelo CNPJ, tentar pelo nome
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

      // Se não encontrou fabricante, guardar sugestão para cadastro
      if (!manufacturerId && item.manufacturer) {
        setSuggestedManufacturer({
          name: item.manufacturer,
          cnpj: '',
        });
      } else {
        setSuggestedManufacturer(null);
      }

      // Determinar o nome da apresentação - priorizar nome completo se disponível
      let presentationName = selectedItem?.raw_description || '';
      if (item.name) {
        presentationName = item.name;
      } else if (item.substance) {
        presentationName = item.substance;
      }

      // Preencher o formulário de apresentação
      setSelectedPresentationUnit(unitId);
      setSelectedPresentationManufacturerId(manufacturerId);
      resetNewPresentation({
        name: presentationName,
        barcode: item.ean || selectedItem?.ean || '',
        conversion_factor: item.quantity || 1, // Usar quantidade da tabela de referência
        unit: unitId,
        manufacturer_id: manufacturerId,
      });

      // Abrir o modal de edição
      setIsNewPresentationModalOpen(true);
    },
    [unitsOfMeasure, manufacturers, resetNewPresentation, selectedItem]
  );

  /**
   * Handle creating a new manufacturer from the presentation form
   */
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

  const handleCreateManufacturer = async (data: NewManufacturerFormData) => {
    try {
      const newManufacturer = await createManufacturer.mutateAsync({
        name: data.name,
        trade_name: data.trade_name || null,
        document: data.document || null,
        active: true,
      });
      setSelectedPresentationManufacturerId(newManufacturer.id);
      setSuggestedManufacturer(null);
      setIsNewManufacturerModalOpen(false);
      toast.success('Fabricante cadastrado com sucesso!');
    } catch (error) {
      console.error('Erro ao cadastrar fabricante:', error);
      toast.error('Erro ao cadastrar fabricante');
    }
  };

  const _openNewProductModal = () => {
    setIsNewProductModalOpen(true);
  };

  // Handle when product is created from the modal
  const handleProductCreated = async (newProduct: Product) => {
    // Auto-select the newly created product
    setSelectedProductId(newProduct.id);

    // If item has EAN, create presentation automatically
    if (selectedItem?.ean) {
      const refData = refItemDataMap.get(selectedItem.ean);
      const newPresentation = await createPresentation.mutateAsync({
        product_id: newProduct.id,
        name: selectedItem.raw_description || newProduct.name,
        barcode: selectedItem.ean,
        conversion_factor: refData?.quantity || 1, // Usar quantidade da tabela de referência
      });
      setSelectedPresentationId(newPresentation.id);
    }
  };

  // Handle when product is created from CMED suggestion
  const handleCmedProductCreated = async (newProduct: Product, presentationId: string) => {
    setSelectedProductId(newProduct.id);
    setSelectedPresentationId(presentationId);
    setIsCmedSuggestionModalOpen(false);

    // Auto-save the mapping
    if (selectedItem && id) {
      await updateItem.mutateAsync({
        id: selectedItem.id,
        nfeImportId: id,
        product_id: newProduct.id,
        presentation_id: presentationId,
        batch_number: batchNumber || selectedItem.batch_number || null,
        expiration_date: expirationDate || selectedItem.expiration_date || null,
        manufacture_date: manufactureDate || selectedItem.manufacture_date || null,
      });
      await refetchItems();
      await ensurePendingStatus();
      setIsMappingModalOpen(false);
    }
  };

  const openCmedSuggestionModal = () => {
    setIsCmedSuggestionModalOpen(true);
  };

  const _openNewPresentationModal = () => {
    let presentationName = selectedItem?.raw_description || '';
    let conversionFactor = 1;

    // Se tem EAN, tentar buscar dados de referência para obter nome completo e quantidade
    if (selectedItem?.ean) {
      const refData = refItemDataMap.get(selectedItem.ean);
      if (refData) {
        if (refData.name) {
          // Se encontrou nome completo, usar como nome
          presentationName = refData.name;
        } else if (refData.substance) {
          // Se não tem nome, usar substância como fallback
          presentationName = refData.substance;
        }
        // Usar quantidade da tabela de referência
        if (refData.quantity) {
          conversionFactor = refData.quantity;
        }
      }
    }

    // Pre-fill with EAN from NFe item
    resetNewPresentation({
      name: presentationName,
      barcode: selectedItem?.ean || '',
      conversion_factor: conversionFactor,
    });
    setIsNewPresentationModalOpen(true);
  };

  const openNewSupplierModal = () => {
    // Pre-fill with data from NFe issuer
    const formattedDocument = formatCnpjCpfInput(nfe?.issuer_document || '');
    const issuerName = nfe?.issuer_name || '';
    resetNewSupplier({
      name: issuerName,
      trade_name: getFirstWord(issuerName),
      document: formattedDocument,
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
    });
    setNewSupplierDocumentValue(formattedDocument);
    setNewSupplierPhoneValue('');
    setNewSupplierZipValue('');
    setIsNewSupplierModalOpen(true);
  };

  const openLinkSupplierModal = () => {
    setSelectedSupplierId('');
    setIsLinkSupplierModalOpen(true);
  };

  const ensurePendingStatus = async () => {
    if (!id || !nfe || nfe.status !== 'importada') return;
    await updateNfe.mutateAsync({
      id,
      status: 'pendente',
    } as any);
  };

  const handleCreatePresentation = async (data: NewPresentationFormData) => {
    // Use productForNewPresentation if set (from new workflow), otherwise use selectedProductId
    const productId = productForNewPresentation?.id || selectedProductId;
    if (!productId) return;

    // Find the unit symbol from the selected unit ID
    const newPresentation = await createPresentation.mutateAsync({
      product_id: productId,
      name: data.name,
      barcode: data.barcode || null,
      conversion_factor: data.conversion_factor || 1,
      unit: selectedPresentationUnit,
      manufacturer_id: selectedPresentationManufacturerId || null,
    });

    setSelectedPresentationId(newPresentation.id);
    setSelectedProductId(productId);
    setIsNewPresentationModalOpen(false);

    // Auto-save the mapping if we have a selected item from NFe
    if (selectedItem && id) {
      await updateItem.mutateAsync({
        id: selectedItem.id,
        nfeImportId: id,
        product_id: productId,
        presentation_id: newPresentation.id,
        batch_number: batchNumber || selectedItem.batch_number || null,
        expiration_date: expirationDate || selectedItem.expiration_date || null,
        manufacture_date: manufactureDate || selectedItem.manufacture_date || null,
      });
      await refetchItems();
      await ensurePendingStatus();

      // Reset states
      setProductForNewPresentation(null);
      setRefItemDataForPresentation(null);
      setSuggestedManufacturer(null);
      setSelectedPresentationUnit('');
      setSelectedPresentationManufacturerId('');

      toast.success('Apresentação cadastrada e item mapeado com sucesso!');
    }
  };

  const handleCreateSupplier = async (data: NewSupplierFormData) => {
    if (!id) return;

    const newSupplier = await createSupplier.mutateAsync({
      name: data.name,
      trade_name: data.trade_name || null,
      document: data.document ? data.document.replace(/\D/g, '') : null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip_code: data.zip_code || null,
      active: true,
    });

    // Link the new supplier to this NFe
    await linkNfeToSupplier.mutateAsync({
      nfeImportId: id,
      supplierId: newSupplier.id,
    });

    setIsNewSupplierModalOpen(false);
  };

  const handleLinkSupplier = async () => {
    if (!id || !selectedSupplierId) return;

    await linkNfeToSupplier.mutateAsync({
      nfeImportId: id,
      supplierId: selectedSupplierId,
    });

    setIsLinkSupplierModalOpen(false);
  };

  const openMappingModal = (item: NfeImportItem) => {
    setSelectedItem(item);
    setSelectedProductId(item.product_id || '');
    setSelectedPresentationId((item as any).presentation_id || '');
    setBatchNumber(item.batch_number || '');
    setExpirationDate(item.expiration_date || '');
    setManufactureDate(item.manufacture_date || '');
    setIsMappingModalOpen(true);
  };

  const handleMapItem = async () => {
    if (selectedItem && id) {
      await updateItem.mutateAsync({
        id: selectedItem.id,
        nfeImportId: id,
        product_id: selectedProductId || null,
        presentation_id: selectedPresentationId || null,
        qty: selectedItem.qty,
        batch_number: batchNumber || null,
        expiration_date: expirationDate || null,
        manufacture_date: manufactureDate || null,
      });
      // Força atualização da lista
      await refetchItems();
      await ensurePendingStatus();
      setIsMappingModalOpen(false);
    }
  };

  const handleProcess = async () => {
    // Check if all items are either mapped or marked as ignored
    const unmappedItems = items.filter((item) => !item.product_id && !ignoredItemIds.has(item.id));

    if (unmappedItems.length > 0) {
      toast.error(
        `${unmappedItems.length} item(s) não mapeado(s). Mapeie todos os itens ou marque-os como ignorados.`
      );
      return;
    }

    // Check if all mapped items have batch_number and expiration_date
    const itemsWithoutBatchOrValidity = items.filter(
      (item) =>
        item.product_id &&
        !ignoredItemIds.has(item.id) &&
        (!item.batch_number || !item.expiration_date)
    );

    if (itemsWithoutBatchOrValidity.length > 0) {
      const itemsList = itemsWithoutBatchOrValidity
        .map(
          (item) =>
            `${item.raw_description}${!item.batch_number ? ' (sem lote)' : ''}${!item.expiration_date ? ' (sem validade)' : ''}`
        )
        .join('\n');
      toast.error(
        `${itemsWithoutBatchOrValidity.length} item(s) sem lote e/ou validade. Estes dados são obrigatórios para dar entrada:\n\n${itemsList}`
      );
      return;
    }

    if (id && selectedLocationId) {
      await processNfe.mutateAsync({
        nfeImportId: id,
        stockLocationId: selectedLocationId,
      });
      setIsProcessModalOpen(false);
      navigate('/nfe');
    }
  };

  const mappedCount = items.filter((item) => item.product_id || item.presentation_id).length;
  const ignoredCount = ignoredItemIds.size;
  const totalProcessed = mappedCount + ignoredCount;

  // Verificar se há itens sem lote/validade
  const itemsWithoutBatchOrValidity = items.filter(
    (item) =>
      item.product_id &&
      !ignoredItemIds.has(item.id) &&
      (!item.batch_number || !item.expiration_date)
  );

  const allItemsMapped = totalProcessed === items.length;
  const validStatus =
    nfe?.status === 'importada' || nfe?.status === 'pendente' || nfe?.status === 'parsed';
  const hasValidBatchData = itemsWithoutBatchOrValidity.length === 0;

  const canProcess = allItemsMapped && validStatus && hasValidBatchData;

  // Debug logs temporários
  console.warn('Debug canProcess:', {
    totalItems: items.length,
    mappedCount,
    ignoredCount,
    totalProcessed,
    nfeStatus: nfe?.status,
    canProcess,
  });
  const isProcessed = nfe?.status === 'posted';

  // Supplier linked to this NFe (either via supplier_id or found by document)
  const linkedSupplier = useMemo(() => {
    if (nfe?.supplier_id) {
      return suppliers.find((s) => s.id === nfe.supplier_id);
    }
    return existingSupplier;
  }, [nfe?.supplier_id, suppliers, existingSupplier]);

  const supplierOptions = suppliers
    .filter((s) => s.active)
    .map((s) => ({
      value: s.id,
      label: s.trade_name ? `${s.name} (${s.trade_name})` : s.name,
    }));

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'raw_description',
        header: 'Produto (NFe)',
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {row.original.raw_description}
            </p>
            <div className="flex flex-wrap gap-2 text-sm text-gray-500">
              <span>Código: {row.original.product_code || '-'}</span>
              {row.original.ncm && <span>NCM: {row.original.ncm}</span>}
              {row.original.ean && (
                <span className="text-feedback-info-fg inline-flex items-center gap-1">
                  <QrCode className="h-3 w-3" />
                  EAN: {row.original.ean}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'qty',
        header: 'Qtde.',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.qty} {row.original.unit}
          </span>
        ),
      },
      {
        accessorKey: 'unit_price',
        header: 'Valor Unit.',
        cell: ({ row }) => {
          const unitPrice = row.original.unit_price || 0;

          // Get reference price from EAN lookup
          let pfPrice: number | null = null;
          let pfLabel: string | null = null;

          if (row.original.ean) {
            const itemRefData = refItemDataMap.get(row.original.ean);

            // Debug log to check if reference data is available
            if (itemRefData) {
              console.warn(`Reference data for EAN ${row.original.ean}:`, {
                best_pf: itemRefData.best_pf,
                best_pf_label: itemRefData.best_pf_label,
                price_source: itemRefData.price_source,
                cmed_pf: itemRefData.cmed_pf,
                brasindice_pf: itemRefData.brasindice_pf,
                simpro_pf: itemRefData.simpro_pf,
              });
            } else {
              console.warn(`No reference data found for EAN ${row.original.ean}`);
            }

            // First try the optimized best_pf from the materialized view
            if (itemRefData?.best_pf) {
              pfPrice = itemRefData.best_pf;
              pfLabel =
                itemRefData.best_pf_label ||
                `${itemRefData.price_source?.toUpperCase() || 'REF'} PF`;
            }
            // Fallback to individual source fields for backward compatibility
            else if (itemRefData?.cmed_pf) {
              pfPrice = itemRefData.cmed_pf;
              pfLabel = itemRefData.cmed_pf_label || 'CMED PF';
            } else if (itemRefData?.brasindice_pf) {
              pfPrice = itemRefData.brasindice_pf;
              pfLabel = itemRefData.brasindice_pf_label || 'BrasÍndice PF';
            } else if (itemRefData?.simpro_pf) {
              pfPrice = itemRefData.simpro_pf;
              pfLabel = itemRefData.simpro_pf_label || 'SIMPRO PF';
            }
          }

          // Calculate price comparison
          const priceComparison =
            pfPrice && unitPrice > 0 ? ((unitPrice - pfPrice) / pfPrice) * 100 : null;
          const isGoodPrice = priceComparison !== null && priceComparison < 0;
          const isBadPrice = priceComparison !== null && priceComparison > 0;

          const formatCurrency = (value: number) =>
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

          return (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-700 dark:text-gray-300">
                  {formatCurrency(unitPrice)}
                </span>
                {isGoodPrice && (
                  <span
                    className="text-feedback-success-fg flex items-center text-xs"
                    title={`${Math.abs(priceComparison).toFixed(1)}% abaixo do PF`}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </span>
                )}
                {isBadPrice && (
                  <span
                    className="text-feedback-danger-fg flex items-center text-xs"
                    title={`${priceComparison.toFixed(1)}% acima do PF`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                )}
              </div>
              {pfPrice && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="text-feedback-accent-fg">{pfLabel || 'PF'}</span>:{' '}
                  {formatCurrency(pfPrice)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'total_price',
        header: 'Vl. Total',
        cell: ({ row }) => (
          <span className="font-medium text-gray-900 dark:text-white">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(row.original.total_price || 0)}
          </span>
        ),
      },
      {
        accessorKey: 'product',
        header: 'Mapeado Para',
        cell: ({ row }) => {
          const product = row.original.product;
          const presentation = row.original.presentation;
          const wasAutoLinked = row.original.ean && presentation?.barcode === row.original.ean;
          const itemRefData = row.original.ean ? refItemDataMap.get(row.original.ean) : null;

          if (product) {
            const productDisplay = product.concentration
              ? `${product.name} ${product.concentration}`
              : product.name;
            const manufacturerName =
              presentation?.manufacturer?.trade_name || presentation?.manufacturer?.name;

            return (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {wasAutoLinked ? (
                    <div title="Vinculado automaticamente via EAN">
                      <Sparkles
                        className="text-feedback-accent-fg h-5 w-5"
                        aria-label="Vinculado automaticamente via EAN"
                      />
                    </div>
                  ) : (
                    <CheckCircle className="text-feedback-success-fg h-5 w-5" />
                  )}
                  <span className="text-gray-900 dark:text-white">{productDisplay}</span>
                </div>
                {manufacturerName && (
                  <div className="ml-7 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{manufacturerName}</span>
                    <a
                      href={`/produtos/${product.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-primary-600 dark:hover:text-primary-400 p-1 text-gray-400 transition-colors"
                      title="Ver detalhes do produto"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>
            );
          }

          // Show buttons for items with EAN
          if (row.original.ean) {
            const isEanProcessed = processedEans.has(row.original.ean);
            const isLoadingThisEan = isLoadingRefItems && !isEanProcessed;

            return (
              <div className="flex flex-col gap-2">
                {isLoadingThisEan ? (
                  // Loading estado para este EAN específico
                  <div className="flex items-center gap-2">
                    <Loading size="sm" />
                    <span className="text-xs text-gray-500">Consultando EAN...</span>
                  </div>
                ) : itemRefData ? (
                  // Tem dados de referência - mostrar botões de ação
                  <>
                    <div className="text-feedback-accent-fg text-xs">
                      {itemRefData.substance || itemRefData.name}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => openProductSelectionModal(row.original)}
                        className="border-feedback-warning-border/40 bg-feedback-warning-bg text-feedback-warning-fg hover:bg-feedback-warning-border/30 inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Apresentação
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(row.original);
                          setBatchNumber(row.original.batch_number || '');
                          setExpirationDate(row.original.expiration_date || '');
                          setManufactureDate(row.original.manufacture_date || '');
                          setIsCmedSuggestionModalOpen(true);
                        }}
                        className="border-feedback-accent-border/40 bg-feedback-accent-bg text-feedback-accent-fg hover:bg-feedback-accent-border/30 inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors"
                      >
                        <Sparkles className="h-3 w-3" />
                        Via Referência
                      </button>
                    </div>
                  </>
                ) : isEanProcessed ? (
                  // EAN foi processado mas não tem dados de referência - ainda assim permitir cadastro de apresentação
                  <div className="flex flex-col gap-2">
                    <div className="text-xs italic text-gray-500">EAN sem referência</div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => openProductSelectionModal(row.original)}
                        className="border-feedback-warning-border/40 bg-feedback-warning-bg text-feedback-warning-fg hover:bg-feedback-warning-border/30 inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Apresentação
                      </button>
                    </div>
                  </div>
                ) : (
                  // EAN ainda não foi processado
                  <span className="italic text-gray-400">Item com EAN</span>
                )}
              </div>
            );
          }

          return (
            <div className="flex flex-col gap-2">
              <div className="text-xs italic text-gray-500">Não mapeado</div>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => openProductSelectionModal(row.original)}
                  className="border-feedback-warning-border/40 bg-feedback-warning-bg text-feedback-warning-fg hover:bg-feedback-warning-border/30 inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Apresentação
                </button>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'conversion',
        header: 'Conversão',
        cell: ({ row }) => {
          const presentation = row.original.presentation;
          const product = row.original.product;

          if (!presentation || !product) {
            return <span className="text-gray-400">-</span>;
          }

          const factor = presentation.conversion_factor || 1;
          // Buscar o símbolo da unidade pelo id, se for um UUID
          const presUnitValue = presentation.unit || 'CX';
          const presUnitObj = unitsOfMeasure.find(
            (u) => u.id === presUnitValue || u.code === presUnitValue
          );
          const presUnit = presUnitObj?.symbol || presUnitValue;

          const prodUnit = product.unit_stock?.symbol || 'UN';

          return (
            <span className="inline-flex items-center rounded bg-gray-200 px-2 py-1 text-xs font-medium dark:bg-gray-700">
              <span className="text-gray-600 dark:text-gray-400">1 {presUnit}</span>
              <span className="mx-1 text-gray-500 dark:text-gray-500">=</span>
              <span className="text-feedback-warning-fg font-semibold">
                {factor} {prodUnit}
              </span>
            </span>
          );
        },
      },
      {
        accessorKey: 'total_converted',
        header: 'Total',
        cell: ({ row }) => {
          const presentation = row.original.presentation;
          const product = row.original.product;
          const qty = row.original.qty || 0;

          if (!presentation || !product) {
            return <span className="text-gray-400">-</span>;
          }

          const factor = presentation.conversion_factor || 1;
          const presUnitValue = presentation.unit || 'CX';
          const presUnitObj = unitsOfMeasure.find(
            (u) => u.id === presUnitValue || u.code === presUnitValue
          );
          const _presUnit = presUnitObj?.symbol || presUnitValue;
          const prodUnit = product.unit_stock?.symbol || 'UN';
          const totalConverted = qty * factor;

          return (
            <span className="border-feedback-info-border/40 bg-feedback-info-bg text-feedback-info-fg inline-flex items-center rounded border px-2 py-1 text-xs font-medium">
              <span className="text-feedback-info-fg">
                {new Intl.NumberFormat('pt-BR', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                }).format(totalConverted)}
              </span>
              <span className="text-feedback-info-fg/80 mx-1">{prodUnit}</span>
            </span>
          );
        },
      },
      {
        accessorKey: 'batch_number',
        header: 'Lote / Val.',
        cell: ({ row }) => {
          const batch = row.original.batch_number;
          const expDate = row.original.expiration_date;
          const hasProduct = row.original.product_id;
          const isIgnored = ignoredItemIds.has(row.original.id);
          const missingData = hasProduct && !isIgnored && (!batch || !expDate);

          if (!batch && !expDate) {
            return (
              <div className="flex items-center gap-1">
                {missingData ? (
                  <AlertTriangle
                    className="text-feedback-danger-fg h-4 w-4"
                    aria-label="Lote e validade obrigatórios"
                  />
                ) : (
                  <span className="italic text-gray-400">-</span>
                )}
              </div>
            );
          }

          return (
            <div className="flex items-start gap-1">
              <div className="text-sm">
                {batch && <p className="font-medium text-gray-900 dark:text-white">{batch}</p>}
                {expDate && (
                  <p className="flex items-center gap-1 text-gray-500">
                    <CalendarDays className="h-3 w-3" />
                    {formatDateOnly(expDate)}
                  </p>
                )}
              </div>
              {missingData && (
                <AlertTriangle
                  className="text-feedback-danger-fg h-4 w-4"
                  aria-label="Dados incompletos para entrada"
                />
              )}
            </div>
          );
        },
      },
      {
        id: 'ignore_actions',
        header: 'Ações',
        cell: ({ row }) => {
          const isIgnored = ignoredItemIds.has(row.original.id);
          const isProcessed = nfe?.status === 'lancada';
          const hasProduct = row.original.product_id;

          if (isProcessed) return <span className="text-gray-400">-</span>;

          // Se já tem produto associado, mostra apenas botão de editar
          if (hasProduct) {
            return (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openMappingModal(row.original)}
                title="Editar produto, quantidade, lote e validade"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            );
          }

          // Senão, mostra botão Ignorar/Reativar
          return (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const newIgnoredItems = new Set(ignoredItemIds);
                if (isIgnored) {
                  newIgnoredItems.delete(row.original.id);
                } else {
                  newIgnoredItems.add(row.original.id);
                }
                setIgnoredItemIds(newIgnoredItems);
              }}
              title={isIgnored ? 'Reativar item' : 'Ignorar item'}
            >
              <EyeOff
                className={`h-4 w-4 ${isIgnored ? 'text-feedback-danger-fg' : 'text-gray-500'}`}
              />
            </Button>
          );
        },
      },
    ],
    [
      refItemDataMap,
      ignoredItemIds,
      nfe?.status,
      openProductSelectionModal,
      unitsOfMeasure,
      isLoadingRefItems,
      processedEans,
    ]
  );

  const productOptions = products
    .filter((item) => item.active)
    .map((item) => {
      // Build label: Name + Concentration + Unit + Manufacturer
      const parts = [item.name];
      if (item.concentration) {
        parts.push(item.concentration);
      }
      parts.push(`(${(item as any).unit_stock?.symbol || 'UN'})`);
      if ((item as any).manufacturer_rel?.name) {
        parts.push(`- ${(item as any).manufacturer_rel.name}`);
      }
      return {
        value: item.id,
        label: parts.join(' '),
      };
    });

  const locationOptions = locations.map((loc) => ({
    value: loc.id,
    label: loc.name,
  }));

  if (loadingNfe) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!nfe) {
    return (
      <EmptyState
        title="NFe não encontrada"
        description="A NFe solicitada não existe ou foi removida"
        action={
          <Button onClick={() => navigate('/nfe')}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />
    );
  }

  // Helper para copiar chave de acesso
  const handleCopyAccessKey = () => {
    if (nfe.access_key) {
      navigator.clipboard.writeText(nfe.access_key);
      toast.success('Chave copiada!');
    }
  };

  // Formatar CNPJ
  const formatCNPJ = (cnpj: string | null) => {
    if (!cnpj) return '-';
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return cnpj;
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  return (
    <div className="space-y-4">
      {/* Header com Breadcrumbs e Botões */}
      <div className="flex items-center justify-between px-4 lg:px-4">
        <Breadcrumbs items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
        <div className="flex items-center gap-2">
          {nfe.xml_url && (
            <a
              href={nfe.xml_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              onClick={(e) => {
                // Verificar se a URL é válida antes de tentar abrir
                if (!nfe.xml_url?.includes('supabase.co/storage')) {
                  e.preventDefault();
                  toast.error('Arquivo XML não disponível');
                  return;
                }
                // Adicionar tratamento de erro para URL do storage
                try {
                  const url = new URL(nfe.xml_url);
                  if (url.pathname.includes('/nfe-xml/')) {
                    // URL parece válida, mas pode dar erro 404 se bucket não existir
                    // O erro será tratado pelo navegador
                  }
                } catch (error) {
                  console.error('Erro ao validar URL do XML:', error);
                }
              }}
            >
              <FileDown className="h-4 w-4" />
              XML
            </a>
          )}
          <Button
            onClick={() => setIsProcessModalOpen(true)}
            disabled={!canProcess || nfe?.status === 'lancada'}
            title={
              !allItemsMapped
                ? `${items.length - totalProcessed} item(s) não mapeado(s)`
                : !hasValidBatchData
                  ? `${itemsWithoutBatchOrValidity.length} item(s) sem lote/validade`
                  : !validStatus
                    ? 'Status da NFe não permite processamento'
                    : nfe?.status === 'lancada'
                      ? 'NFe já foi processada'
                      : 'Processar entrada no estoque'
            }
          >
            <CheckCircle className="h-5 w-5" />
            Processar Entrada
          </Button>
        </div>
      </div>

      {/* Premium NFe Header Card */}
      <div className="px-4 lg:px-4">
        <Card padding="none" className="overflow-hidden">
          {/* Top Section - Main Info */}
          <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 dark:from-gray-800 dark:to-gray-900">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 backdrop-blur-sm dark:bg-white/10">
                  <Hash className="h-6 w-6 text-gray-700 dark:text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">
                      NFe {nfe.number}
                    </h1>
                    <StatusBadge status={nfe.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
                    {nfe.issuer_name}
                  </p>
                </div>
              </div>

              {/* Value Badge */}
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Valor Total
                </p>
                <p className="text-feedback-success-fg text-xl font-bold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(nfe.total_value || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Section - Details Grid */}
          <div className="bg-gray-50 px-6 py-4 dark:bg-gray-800/50">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              {/* Data Emissão */}
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Emissão</span>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {nfe.issued_at ? formatDateOnly(nfe.issued_at) : '-'}
                  </p>
                </div>
              </div>

              {/* Separador vertical */}
              <div className="hidden h-8 w-px bg-gray-200 sm:block dark:bg-gray-700" />

              {/* CNPJ */}
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">CNPJ Emitente</span>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {formatCNPJ(nfe.issuer_document)}
                  </p>
                </div>
              </div>

              {/* Separador vertical */}
              <div className="hidden h-8 w-px bg-gray-200 sm:block dark:bg-gray-700" />

              {/* Chave de Acesso */}
              {nfe.access_key && (
                <>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-gray-400" />
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Chave de Acesso
                        </span>
                        <p className="text-sm text-gray-900 dark:text-white">{nfe.access_key}</p>
                      </div>
                      <button
                        onClick={handleCopyAccessKey}
                        className="mt-5 flex-shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                        title="Copiar chave"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {/* Separador vertical */}
                  <div className="hidden h-8 w-px bg-gray-200 sm:block dark:bg-gray-700" />
                </>
              )}

              {/* Itens Mapeados */}
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-gray-400" />
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Itens Mapeados</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    <span
                      className={mappedCount === items.length ? 'text-feedback-success-fg' : ''}
                    >
                      {mappedCount}
                    </span>
                    <span className="mx-1 text-gray-400">/</span>
                    {items.length}
                  </p>
                </div>
              </div>

              {/* Separador vertical */}
              <div className="hidden h-8 w-px bg-gray-200 lg:block dark:bg-gray-700" />

              {/* Fornecedor */}
              <div className="flex items-center gap-2">
                {linkedSupplier ? (
                  <>
                    <CheckCircle className="text-feedback-success-fg h-4 w-4" />
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Fornecedor</span>
                      <p className="text-feedback-success-fg text-sm font-medium">
                        {linkedSupplier.trade_name || linkedSupplier.name}
                      </p>
                    </div>
                  </>
                ) : (
                  !isProcessed && (
                    <>
                      <AlertTriangle className="text-feedback-warning-fg h-4 w-4" />
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Fornecedor
                          </span>
                          <p className="text-feedback-warning-fg text-sm font-medium">
                            Não vinculado
                          </p>
                        </div>
                        <div className="ml-2 flex items-center gap-1">
                          <button
                            onClick={openNewSupplierModal}
                            className="border-feedback-warning-border/40 bg-feedback-warning-bg text-feedback-warning-fg hover:bg-feedback-warning-border/30 inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            Cadastrar
                          </button>
                          <button
                            onClick={openLinkSupplierModal}
                            className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                          >
                            <Link className="h-3 w-3" />
                            Vincular
                          </button>
                        </div>
                      </div>
                    </>
                  )
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Mapping Progress removido */}

      {/* Items Table */}
      <div className="px-4 lg:px-4">
        <Card padding="none">
          <div className="border-b border-gray-100 p-6 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">
                  Itens da Nota Fiscal
                </h2>
                {(() => {
                  const missingBatchItems = items.filter(
                    (item) =>
                      item.product_id &&
                      !ignoredItemIds.has(item.id) &&
                      (!item.batch_number || !item.expiration_date)
                  );
                  return missingBatchItems.length > 0 ? (
                    <div className="border-feedback-danger-border/40 bg-feedback-danger-bg text-feedback-danger-fg flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium">
                      <AlertTriangle className="h-3 w-3" />
                      {missingBatchItems.length} {missingBatchItems.length === 1 ? 'item' : 'itens'}{' '}
                      sem lote/validade
                    </div>
                  ) : null;
                })()}
              </div>
              {loadingEanProgress && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Loading size="sm" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Consultando códigos EAN: {loadingEanProgress.current}/
                      {loadingEanProgress.total}
                    </span>
                  </div>
                  <div className="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(loadingEanProgress.current / loadingEanProgress.total) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            <DataTable
              data={items}
              columns={columns}
              isLoading={loadingItems}
              emptyState={
                <EmptyState
                  title="Nenhum item"
                  description="Esta NFe não possui itens cadastrados"
                />
              }
            />
          </div>
        </Card>
      </div>

      {/* New Product Modal - using shared component - MUST BE BEFORE Mapping Modal for proper z-index */}
      <ProductModal
        isOpen={isNewProductModalOpen}
        onClose={() => setIsNewProductModalOpen(false)}
        defaultItemType="medication"
        prefillData={{
          name: selectedItem?.raw_description || '',
          unit_stock_id:
            unitsOfMeasure.find((u) => u.code === (selectedItem?.unit || 'UN'))?.id || '',
          description: '',
        }}
        onSuccess={handleProductCreated}
        title="Cadastrar Novo Produto"
      />

      {/* Mapping Modal */}
      <Modal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        title="Mapear Item"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Produto da NFe:</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {selectedItem?.raw_description}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {selectedItem?.qty} {selectedItem?.unit} -{' '}
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(selectedItem?.unit_price || 0)}{' '}
              / unidade
            </p>
            {selectedItem?.ean && (
              <p className="text-feedback-info-fg mt-1 flex items-center gap-1 text-sm">
                <QrCode className="h-4 w-4" />
                EAN: {selectedItem.ean}
              </p>
            )}
          </div>

          {/* Reference Item Suggestion Banner - shows when product has EAN and ref_item data is found */}
          {selectedItem?.ean && selectedItemRefData && !selectedProductId && (
            <div className="border-feedback-accent-border/40 bg-feedback-accent-bg rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="text-feedback-accent-fg mt-0.5 h-6 w-6 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-feedback-accent-fg font-medium">
                    Produto encontrado na tabela de referência!
                  </h3>
                  <p className="text-feedback-accent-fg mt-1 text-sm">
                    <strong>{selectedItemRefData.name || selectedItemRefData.substance}</strong>
                    {selectedItemRefData.manufacturer && ` - ${selectedItemRefData.manufacturer}`}
                  </p>
                  {selectedItemRefData.concentration && (
                    <p className="text-feedback-accent-fg mt-0.5 text-xs">
                      {selectedItemRefData.concentration}
                    </p>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3"
                    onClick={openCmedSuggestionModal}
                  >
                    <Sparkles className="h-4 w-4" />
                    Cadastrar via Referência
                  </Button>
                </div>
              </div>
            </div>
          )}

          <SearchableSelect
            label="Vincular ao produto cadastrado"
            options={[{ value: '', label: 'Não vincular' }, ...productOptions]}
            value={selectedProductId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSelectedProductId(e.target.value);
              setSelectedPresentationId(''); // Reset presentation when product changes
            }}
            placeholder="Selecione um produto..."
            searchPlaceholder="Buscar por nome ou código..."
            emptyMessage="Nenhum produto encontrado"
          />

          {/* Presentation selection - shows only when a product is selected */}
          {selectedProductId && (
            <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
              {selectedItemPresentations.length > 0 ? (
                <div className="space-y-3">
                  <SearchableSelect
                    label="Selecionar apresentação"
                    options={[
                      { value: '', label: 'Sem apresentação específica' },
                      ...selectedItemPresentations.map((p) => ({
                        value: p.id,
                        label: `${p.name}${p.barcode ? ` (${p.barcode})` : ''}`,
                      })),
                    ]}
                    value={selectedPresentationId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSelectedPresentationId(e.target.value)
                    }
                    placeholder="Selecione uma apresentação..."
                    searchPlaceholder="Buscar..."
                  />

                  {/* Mostrar informação de conversão quando uma apresentação específica é selecionada */}
                  {selectedPresentationId &&
                    (() => {
                      const selectedPresentation = selectedItemPresentations.find(
                        (p) => p.id === selectedPresentationId
                      );
                      const selectedProduct = products.find((p) => p.id === selectedProductId);

                      if (selectedPresentation && selectedProduct) {
                        const factor = selectedPresentation.conversion_factor || 1;
                        const presUnit = selectedPresentation.unit || 'CX';
                        const prodUnit = (selectedProduct as any).unit_stock?.symbol || 'UN';

                        return (
                          <Alert tone="info">
                            <div className="flex items-center justify-between gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-feedback-info-fg font-medium">
                                  Conversão:
                                </span>
                                <span className="border-feedback-info-border/40 bg-feedback-info-bg text-feedback-info-fg inline-flex items-center rounded border px-2 py-1 text-xs font-medium">
                                  <span className="text-feedback-info-fg">1 {presUnit}</span>
                                  <span className="text-feedback-info-fg/80 mx-1">=</span>
                                  <span className="text-feedback-info-fg font-semibold">
                                    {new Intl.NumberFormat('pt-BR', {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 2,
                                    }).format(factor)}{' '}
                                    {prodUnit}
                                  </span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-feedback-info-fg font-medium">Total:</span>
                                <span className="border-feedback-info-border/40 bg-feedback-info-bg text-feedback-info-fg inline-flex items-center rounded border px-2 py-1 text-xs font-medium">
                                  <span className="text-feedback-info-fg">
                                    {new Intl.NumberFormat('pt-BR', {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 2,
                                    }).format(selectedItem?.qty || 0)}{' '}
                                    {presUnit}
                                  </span>
                                  <span className="text-feedback-info-fg/80 mx-1">=</span>
                                  <span className="text-feedback-info-fg font-semibold">
                                    {new Intl.NumberFormat('pt-BR', {
                                      minimumFractionDigits: 0,
                                      maximumFractionDigits: 2,
                                    }).format((selectedItem?.qty || 0) * factor)}{' '}
                                    {prodUnit}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </Alert>
                        );
                      }
                      return null;
                    })()}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Este produto não possui apresentações cadastradas.
                </p>
              )}
            </div>
          )}

          {/* Campos de lote e validade - sempre visíveis */}
          <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
            <h4 className="mb-3 font-medium text-gray-900 dark:text-white">Dados de Entrada</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantidade
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={selectedItem?.qty || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (selectedItem) {
                      setSelectedItem({ ...selectedItem, qty: parseFloat(e.target.value) || 0 });
                    }
                  }}
                  placeholder="Quantidade"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Lote
                </label>
                <Input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="Número do lote"
                />
              </div>
              <div>
                <DatePicker
                  label="Data de Validade"
                  value={expirationDate}
                  onChange={(event: any) => {
                    const nextValue = typeof event === 'string' ? event : event.target.value;
                    setExpirationDate(nextValue);
                  }}
                />
              </div>
            </div>
          </div>

          <ModalFooter>
            <div className="flex w-full items-center justify-between">
              {/* Botão de desvincular no canto esquerdo */}
              {selectedItem?.product_id && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (selectedItem && id) {
                      await updateItem.mutateAsync({
                        id: selectedItem.id,
                        nfeImportId: id,
                        product_id: null,
                        presentation_id: null,
                        qty: selectedItem.qty,
                        batch_number: batchNumber || null,
                        expiration_date: expirationDate || null,
                        manufacture_date: manufactureDate || null,
                      });
                      await ensurePendingStatus();
                      setIsMappingModalOpen(false);
                      toast.success('Vínculo removido com sucesso!');
                    }
                  }}
                  isLoading={updateItem.isPending}
                >
                  Desvincular
                </Button>
              )}

              {/* Botões do lado direito */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsMappingModalOpen(false)}
                  showIcon={false}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleMapItem}
                  isLoading={updateItem.isPending}
                  showIcon={false}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </ModalFooter>
        </div>
      </Modal>

      {/* Process Modal */}
      <Modal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        title="Processar Entrada no Estoque"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Ao processar, serão criadas movimentações de entrada no estoque para todos os itens
            mapeados ({mappedCount} {mappedCount === 1 ? 'item' : 'itens'}).
          </p>

          <SearchableSelect
            label="Local de Estoque"
            options={locationOptions}
            placeholder="Selecione o local de destino..."
            searchPlaceholder="Buscar local..."
            value={selectedLocationId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSelectedLocationId(e.target.value)
            }
            required
          />

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsProcessModalOpen(false)}
              showIcon={false}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleProcess}
              isLoading={processNfe.isPending}
              disabled={!selectedLocationId}
            >
              <CheckCircle className="h-5 w-5" />
              Confirmar Entrada
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* New Presentation Modal - Enhanced version like ProductFormPage */}
      <Modal
        isOpen={isNewPresentationModalOpen}
        onClose={() => {
          setIsNewPresentationModalOpen(false);
          setProductForNewPresentation(null);
          setRefItemDataForPresentation(null);
          setSuggestedManufacturer(null);
          setSelectedPresentationUnit('');
          setSelectedPresentationManufacturerId('');
        }}
        title={productForNewPresentation ? 'Nova Apresentação' : 'Cadastrar Nova Apresentação'}
        size="lg"
      >
        {isLoadingRefData ? (
          <div className="relative min-h-96">
            <LoadingOverlay />
            <div className="h-96" />
          </div>
        ) : (
          <form
            onSubmit={handleSubmitNewPresentation(handleCreatePresentation)}
            className="space-y-4"
          >
            {/* Product info banner */}
            {productForNewPresentation && (
              <Alert tone="warning">
                <p className="text-sm">
                  Apresentação para:{' '}
                  <strong>
                    {productForNewPresentation.name}
                    {productForNewPresentation.concentration &&
                      ` ${productForNewPresentation.concentration}`}
                  </strong>
                  {(productForNewPresentation as any).unit_stock && (
                    <span className="ml-1">
                      (Unidade base: {(productForNewPresentation as any).unit_stock.symbol})
                    </span>
                  )}
                </p>
              </Alert>
            )}

            {selectedItem?.ean && (
              <Alert tone="accent">
                <p className="flex items-center gap-2 text-sm">
                  <QrCode className="h-4 w-4" />
                  EAN <strong>{selectedItem.ean}</strong> será usado para vincular nas próximas
                  importações.
                </p>
                {/* Informações adicionais dos dados de referência */}
                {(refItemDataForPresentation?.name ||
                  refItemDataForPresentation?.substance ||
                  refItemDataForPresentation?.manufacturer ||
                  selectedPresentationManufacturerId) && (
                  <div className="border-feedback-accent-border/40 mt-2 space-y-1 border-t pt-2">
                    {/* Descrição do produto */}
                    {(refItemDataForPresentation?.name ||
                      refItemDataForPresentation?.substance) && (
                      <p className="text-xs opacity-90">
                        <strong>Descrição:</strong>{' '}
                        {refItemDataForPresentation?.name || refItemDataForPresentation?.substance}
                        {refItemDataForPresentation?.concentration && (
                          <span className="ml-1">- {refItemDataForPresentation.concentration}</span>
                        )}
                      </p>
                    )}
                    {/* Fabricante */}
                    {(refItemDataForPresentation?.manufacturer ||
                      selectedPresentationManufacturerId) && (
                      <p className="text-xs opacity-90">
                        <strong>Fabricante:</strong>{' '}
                        {refItemDataForPresentation?.manufacturer ||
                          manufacturers.find((m) => m.id === selectedPresentationManufacturerId)
                            ?.trade_name ||
                          manufacturers.find((m) => m.id === selectedPresentationManufacturerId)
                            ?.name}
                      </p>
                    )}
                  </div>
                )}
              </Alert>
            )}

            {/* Linha 1: Nome da Apresentação */}
            <Input
              label="Nome da Apresentação"
              placeholder="Ex: Caixa 30 comp, Blister 10 comp"
              {...registerNewPresentation('name', { required: 'Nome é obrigatório' })}
              error={newPresentationErrors.name?.message}
              required
            />

            {/* Linha 2: Fabricante + EAN */}
            {suggestedManufacturer && !selectedPresentationManufacturerId && (
              <Alert tone="info">
                <p className="mb-2 text-sm">
                  Fabricante <strong>"{suggestedManufacturer.name}"</strong> não encontrado no
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
                  disabled={createManufacturer.isPending}
                  className="bg-primary-600 text-content-inverse hover:bg-primary-700 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
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
                label="Código de Barras (EAN)"
                placeholder="7891234567890"
                {...registerNewPresentation('barcode')}
              />
            </div>

            {/* Linha 3: Conversão visual - 1 [Unidade Entrada] = [Fator] [Unidade Base] */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Conversão de Unidades
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSelectedPresentationUnit(e.target.value)
                    }
                    required
                  />
                </div>

                {/* Sinal de igual */}
                <div className="mt-6 flex h-10 w-8 items-center justify-center">
                  <span className="text-xl font-bold text-gray-500 dark:text-gray-400">=</span>
                </div>

                {/* Fator de Conversão */}
                <div className="w-24">
                  <Input
                    label="Fator"
                    type="number"
                    min="0.001"
                    step="any"
                    placeholder="30"
                    {...registerNewPresentation('conversion_factor', {
                      required: 'Fator é obrigatório',
                      valueAsNumber: true,
                      min: { value: 0.001, message: 'Mínimo: 0.001' },
                    })}
                    error={newPresentationErrors.conversion_factor?.message}
                    required
                  />
                </div>

                {/* Unidade Base (bloqueada) */}
                <div className="min-w-[140px] flex-1">
                  <Input
                    label="Unidade Base"
                    value={
                      productForNewPresentation
                        ? (productForNewPresentation as any).unit_stock
                          ? `${(productForNewPresentation as any).unit_stock.name} (${(productForNewPresentation as any).unit_stock.symbol})`
                          : 'UN'
                        : 'UN'
                    }
                    disabled
                    className="cursor-not-allowed bg-gray-100 dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>

            <ModalFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsNewPresentationModalOpen(false);
                  setProductForNewPresentation(null);
                  setRefItemDataForPresentation(null);
                  setSuggestedManufacturer(null);
                  setSelectedPresentationUnit('');
                  setSelectedPresentationManufacturerId('');
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={createPresentation.isPending}>
                Adicionar
              </Button>
            </ModalFooter>
          </form>
        )}
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
            <p className="text-sm">
              Após salvar, o fabricante será selecionado automaticamente no formulário.
            </p>
          </Alert>

          <Input
            label="Razão Social"
            placeholder="Nome completo da empresa"
            {...registerNewManufacturer('name', { required: 'Razão social é obrigatória' })}
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
              variant="secondary"
              onClick={() => setIsNewManufacturerModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={createManufacturer.isPending}>
              <Plus className="h-5 w-5" />
              Cadastrar
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* New Supplier Modal */}
      <Modal
        isOpen={isNewSupplierModalOpen}
        onClose={() => setIsNewSupplierModalOpen(false)}
        title="Cadastrar Novo Fornecedor"
        size="lg"
      >
        <form onSubmit={handleSubmitNewSupplier(handleCreateSupplier)} className="space-y-4">
          <Alert tone="info">
            <p className="text-sm">
              Cadastrando o emitente da NFe como fornecedor. Após salvar, será vinculado
              automaticamente a esta nota.
            </p>
          </Alert>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Razão Social"
              placeholder="Nome completo da empresa"
              {...registerNewSupplier('name', { required: 'Razão social é obrigatória' })}
              error={newSupplierErrors.name?.message}
              required
            />
            <Input
              label="Nome Fantasia"
              placeholder="Nome fantasia (opcional)"
              {...registerNewSupplier('trade_name')}
            />
          </div>

          <Input
            label="CNPJ"
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
            {...registerNewSupplier('document', { required: 'CNPJ é obrigatório' })}
            value={newSupplierDocumentValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const formatted = formatCnpjCpfInput(e.target.value);
              setNewSupplierDocumentValue(formatted);
              setNewSupplierValue('document', formatted, { shouldDirty: true });
            }}
            error={newSupplierErrors.document?.message}
            required
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="E-mail"
              type="email"
              placeholder="contato@empresa.com"
              {...registerNewSupplier('email')}
            />
            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              inputMode="numeric"
              {...registerNewSupplier('phone')}
              value={newSupplierPhoneValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const formatted = formatPhoneInput(e.target.value);
                setNewSupplierPhoneValue(formatted);
                setNewSupplierValue('phone', formatted, { shouldDirty: true });
              }}
            />
          </div>

          <Input
            label="Endereço"
            placeholder="Rua, número, bairro"
            {...registerNewSupplier('address')}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input label="Cidade" placeholder="Cidade" {...registerNewSupplier('city')} />
            <Input label="Estado" placeholder="UF" {...registerNewSupplier('state')} />
            <Input
              label="CEP"
              placeholder="00000-000"
              inputMode="numeric"
              {...registerNewSupplier('zip_code')}
              value={newSupplierZipValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const formatted = formatCepInput(e.target.value);
                setNewSupplierZipValue(formatted);
                setNewSupplierValue('zip_code', formatted, { shouldDirty: true });
              }}
            />
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsNewSupplierModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={createSupplier.isPending || linkNfeToSupplier.isPending}
            >
              <Plus className="h-5 w-5" />
              Cadastrar e Vincular
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Link Supplier Modal */}
      <Modal
        isOpen={isLinkSupplierModalOpen}
        onClose={() => setIsLinkSupplierModalOpen(false)}
        title="Vincular a Fornecedor Existente"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Selecione um fornecedor já cadastrado para vincular a esta NFe.
          </p>

          <SearchableSelect
            label="Fornecedor"
            options={supplierOptions}
            value={selectedSupplierId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSelectedSupplierId(e.target.value)
            }
            placeholder="Selecione um fornecedor..."
            searchPlaceholder="Buscar por nome ou CNPJ..."
            emptyMessage="Nenhum fornecedor encontrado"
            required
          />

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsLinkSupplierModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleLinkSupplier}
              isLoading={linkNfeToSupplier.isPending}
              disabled={!selectedSupplierId}
            >
              <Link className="h-5 w-5" />
              Vincular Fornecedor
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Product Exists Question Modal */}
      <Modal
        isOpen={isProductExistsModalOpen}
        onClose={() => setIsProductExistsModalOpen(false)}
        title="Cadastrar Apresentação"
        size="md"
      >
        <div className="space-y-4">
          {selectedItem && (
            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Produto da NFe:</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {selectedItem.raw_description}
              </p>
              {selectedItem.ean && (
                <p className="text-feedback-info-fg mt-1 flex items-center gap-1 text-sm">
                  <QrCode className="h-4 w-4" />
                  EAN: {selectedItem.ean}
                </p>
              )}
            </div>
          )}

          <div className="border-feedback-warning-border/40 bg-feedback-warning-bg rounded-lg border p-4">
            <p className="text-feedback-warning-fg mb-2 text-sm font-medium">
              O produto base já está cadastrado no sistema?
            </p>
            <p className="text-feedback-warning-fg text-xs">
              Se o produto já existe, você selecionará ele e cadastrará apenas uma nova
              apresentação. Caso contrário, você poderá cadastrar o produto completo.
            </p>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsProductExistsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" variant="secondary" onClick={handleProductDoesNotExist}>
              <Plus className="h-5 w-5" />
              Não, cadastrar
            </Button>
            <Button type="button" onClick={handleProductExists}>
              <CheckCircle className="h-5 w-5" />
              Sim, selecionar
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Select Product for Presentation Modal */}
      <Modal
        isOpen={isSelectProductForPresentationModalOpen}
        onClose={() => {
          setIsSelectProductForPresentationModalOpen(false);
          setSelectedProductId('');
          setProductSearchQuery('');
        }}
        title="Selecionar Produto"
        size="xl"
      >
        <div className="space-y-4">
          {/* Header compacto com info do item da NFe */}
          {selectedItem && (
            <div className="flex items-start gap-4 rounded-lg border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-3 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800/50">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Cadastrando apresentação para
                </p>
                <p className="truncate font-medium text-gray-900 dark:text-white">
                  {selectedItem.raw_description}
                </p>
              </div>
              {selectedItem.ean && (
                <div className="border-feedback-info-border/40 bg-feedback-info-bg text-feedback-info-fg flex flex-shrink-0 items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-sm">
                  <QrCode className="h-4 w-4" />
                  {selectedItem.ean}
                </div>
              )}
            </div>
          )}

          {/* Reference Item Data Display - Layout Premium Compacto */}
          {selectedItem?.ean &&
            (() => {
              const refData = refItemDataMap.get(selectedItem.ean);
              if (!refData) return null;

              return (
                <div className="border-feedback-accent-border/40 overflow-hidden rounded-lg border">
                  {/* Header com badge de fonte */}
                  <div className="border-feedback-accent-border/40 bg-feedback-accent-bg flex items-center justify-between border-b px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Info className="text-feedback-accent-fg h-4 w-4" />
                      <span className="text-feedback-accent-fg text-sm font-medium">
                        Informações das Tabelas de Referência
                      </span>
                    </div>
                    {(refData.cmed_item_id ||
                      refData.brasindice_item_id ||
                      refData.simpro_item_id) && (
                      <span className="bg-primary-600 text-content-inverse rounded px-2 py-0.5 text-xs font-semibold">
                        {refData.cmed_item_id
                          ? 'CMED'
                          : refData.brasindice_item_id
                            ? 'BrasÍndice'
                            : 'SIMPRO'}
                      </span>
                    )}
                  </div>

                  {/* Grid de informações principais */}
                  <div className="bg-white px-4 pb-4 pt-2 dark:bg-gray-800/30">
                    {/* Linha 1: Nome (6) | Concentração (2) | Unid (1) | Fabricante (3) */}
                    <div className="grid grid-cols-12 gap-x-6 gap-y-2 text-sm">
                      {refData.name && (
                        <div className="col-span-6">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Nome
                          </span>
                          <p className="text-xs font-medium text-gray-900 dark:text-white">
                            {refData.name}
                          </p>
                          {refData.substance && (
                            <div className="mt-1 flex items-center gap-1">
                              <p className="text-feedback-accent-fg text-xs font-bold">
                                {refData.substance}
                              </p>
                              <button
                                type="button"
                                onClick={() => setProductSearchQuery(refData.substance || '')}
                                className="text-feedback-accent-fg hover:bg-feedback-accent-border/25 rounded p-0.5 transition-colors"
                                title="Buscar produtos com esta substância"
                              >
                                <Search className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {refData.concentration && (
                        <div className="col-span-2">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Concentração
                          </span>
                          <p className="text-xs font-medium text-gray-900 dark:text-white">
                            {refData.concentration}
                          </p>
                        </div>
                      )}
                      {refData.unit && (
                        <div className="col-span-1">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Unid
                          </span>
                          <p className="text-xs font-medium text-gray-900 dark:text-white">
                            {refData.unit}
                          </p>
                        </div>
                      )}
                      {refData.manufacturer && (
                        <div className="col-span-3">
                          <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Fabricante
                          </span>
                          <p className="text-xs font-medium text-gray-900 dark:text-white">
                            {refData.manufacturer}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Códigos em linha única */}
                    {(refData.brasindice_code ||
                      refData.simpro_code ||
                      refData.tiss ||
                      refData.tuss ||
                      refData.ggrem_code) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
                        {refData.brasindice_code && (
                          <span className="border-feedback-info-border/40 bg-feedback-info-bg text-feedback-info-fg rounded border px-2 py-0.5 text-[10px] font-medium">
                            BrasÍndice: {refData.brasindice_code}
                          </span>
                        )}
                        {refData.simpro_code && (
                          <span className="border-feedback-success-border/40 bg-feedback-success-bg text-feedback-success-fg rounded border px-2 py-0.5 text-[10px] font-medium">
                            SIMPRO: {refData.simpro_code}
                          </span>
                        )}
                        {refData.tiss && (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            TISS: {refData.tiss}
                          </span>
                        )}
                        {refData.tuss && (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            TUSS: {refData.tuss}
                          </span>
                        )}
                        {refData.ggrem_code && (
                          <span className="border-feedback-accent-border/40 bg-feedback-accent-bg text-feedback-accent-fg rounded border px-2 py-0.5 text-[10px] font-medium">
                            GGREM: {refData.ggrem_code}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          <SearchableSelect
            label="Selecione o produto base"
            options={productOptions}
            value={selectedProductId}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSelectedProductId(e.target.value)
            }
            placeholder="Buscar produto..."
            searchPlaceholder="Buscar por nome ou código..."
            emptyMessage="Nenhum produto encontrado"
            searchValue={productSearchQuery}
            onSearch={(term: string) => setProductSearchQuery(term)}
            required
          />

          <ModalFooter className="!justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsSelectProductForPresentationModalOpen(false);
                setSelectedProductId('');
                setProductSearchQuery('');
                setIsNewProductModalOpen(true);
              }}
              className="border-feedback-accent-border !text-feedback-accent-fg hover:!bg-feedback-accent-bg border"
            >
              <Plus className="h-5 w-5" />
              Cadastrar Produto
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsSelectProductForPresentationModalOpen(false);
                  setSelectedProductId('');
                  setProductSearchQuery('');
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSelectProductForPresentation}
                disabled={!selectedProductId}
                isLoading={isLoadingRefData}
              >
                <Box className="h-5 w-5" />
                Cadastrar Apresentação
              </Button>
            </div>
          </ModalFooter>
        </div>
      </Modal>

      {/* Reference Item Suggestion Modal */}
      {selectedItem && selectedItemRefData && (
        <CmedSuggestionModal
          isOpen={isCmedSuggestionModalOpen}
          onClose={() => setIsCmedSuggestionModalOpen(false)}
          nfeItem={selectedItem}
          refItemData={selectedItemRefData as any} // Temporary type assertion
          onProductCreated={handleCmedProductCreated}
        />
      )}
    </div>
  );
}
