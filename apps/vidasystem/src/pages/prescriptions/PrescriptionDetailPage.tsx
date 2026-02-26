import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  DataTable,
  ModalFooter,
  Input,
  DatePicker,
  TimePicker,
  Select,
  SearchableSelect,
  Textarea,
  Badge,
  EmptyState,
  Loading,
  Switch,
  TabButton,
  Breadcrumbs,
  SwitchNew,
  ColorBadge,
} from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { buildLogDiff } from '@/lib/logging';
import { useNavigationGuard } from '@/contexts/NavigationGuardContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/stores/authStore';
import {
  usePrescription,
  usePrescriptionItems,
  useUpdatePrescription,
  useAddPrescriptionItem,
  useUpdatePrescriptionItem,
  useDeletePrescriptionItem,
  useTogglePrescriptionItemActive,
  useSuspendPrescriptionItemWithDate,
  usePrescriptionLogs,
  useUploadPrescriptionAttachment,
  usePrescriptionItemComponents,
  useAddPrescriptionItemComponent,
  useUpdatePrescriptionItemComponent,
  useDeletePrescriptionItemComponent,
  useDuplicatePrescriptionItem,
} from '@/hooks/usePrescriptions';
import { useProductsSearchWithPresentations } from '@/hooks/useProducts';
import { useEquipment } from '@/hooks/useEquipment';
import { useProcedures } from '@/hooks/useProcedures';
import { useAdministrationRoutes } from '@/hooks/useAdministrationRoutes';
import { useUnitsOfMeasure, type UnitOfMeasure } from '@/hooks/useUnitsOfMeasure';
import { useHasPermission } from '@/hooks/useAccessProfiles';
import {
  useCreatePrescriptionPrint,
  useDeletePrescriptionPrint,
  useFetchPrescriptionPrintSnapshot,
  usePrescriptionPrintHistory,
} from '@/hooks/usePrescriptionPrints';
import { sortPrescriptionItemsByRoute } from '@/lib/prescriptionItemSorter';
import { openPrescriptionPrintPreview } from '@/lib/prescriptionPrintPdf';
import { buildItemColumns, buildPrintHistoryColumns } from './utils/prescriptionDetailColumns';
import {
  ALL_WEEK_DAYS,
  formatShiftChecks,
  formatTimeChecks,
  normalizeTimeValue,
  parseDateOnly,
  parseShiftCodes,
  parseTimeChecks,
  parseWeekDays,
  sortShifts,
  sortWeekDays,
} from './utils/prescriptionDetailFrequency';
import { type PrescriptionPrintAction } from '@/components/prescription/PrescriptionPrintModal';
import { PrescriptionDetailAuxModals } from './components/PrescriptionDetailAuxModals';
import { PrescriptionDetailModal } from './components/PrescriptionDetailModal';
import { PrescriptionDetailModalComponentsTab } from './components/PrescriptionDetailModalComponentsTab';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft,
  FileUp,
  FileDown,
  Pill,
  Menu,
  Milk,
  Stethoscope,
  Bandage,
  Power,
  PowerOff,
  History,
  Printer,
  CornerDownLeft,
  ChevronDown,
  CalendarDays,
  UserCheck,
  FileText,
  Activity,
} from 'lucide-react';
import type {
  PrescriptionItem,
  Prescription,
  Product,
  Equipment,
  Procedure,
  PrescriptionItemSupplier,
} from '@/types/database';
import type {
  PrescriptionPrintHistoryItem,
  PrescriptionPrintOrientation,
  PrescriptionPrintSourceItem,
} from '@/types/prescriptionPrint';

interface ItemFormData {
  item_type: 'medication' | 'material' | 'diet' | 'procedure' | 'equipment';
  product_id: string;
  equipment_id: string;
  procedure_id: string;
  display_name: string;
  item_order: number | null;
  supplier: PrescriptionItemSupplier | '';
  quantity: number;
  frequency_mode: 'every' | 'times_per' | 'shift';
  times_value: number;
  times_unit: string;
  interval_minutes: number | null;
  time_start: string;
  time_checks: string;
  route_id: string;
  start_date: string;
  end_date: string;
  is_prn: boolean;
  is_continuous_use: boolean;
  justification: string;
  instructions_use: string;
  instructions_pharmacy: string;
}

function normalizePrintLogoUrl(value: unknown): string | null {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || null;
}

function pickFirstLogoUrl(...values: unknown[]): string | null {
  for (const value of values) {
    const url = normalizePrintLogoUrl(value);
    if (url) return url;
  }
  return null;
}

export default function PrescriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { company } = useAuthStore();
  const { resolvedTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const companyPrintLogoUrl = useMemo(() => {
    if (!company) return null;
    const companyAny = company as typeof company & Record<string, unknown>;

    return resolvedTheme === 'dark'
      ? pickFirstLogoUrl(
          company.logo_url_expanded_dark,
          companyAny.logo_url_dark,
          companyAny.print_logo_url_dark,
          companyAny.logo_url_print_dark,
          company.logo_url_expanded_light,
          companyAny.logo_url_light,
          companyAny.print_logo_url_light,
          companyAny.logo_url_print_light,
          companyAny.logo_url,
          companyAny.print_logo_url,
          companyAny.logo_url_print
        )
      : pickFirstLogoUrl(
          company.logo_url_expanded_light,
          companyAny.logo_url_light,
          companyAny.print_logo_url_light,
          companyAny.logo_url_print_light,
          company.logo_url_expanded_dark,
          companyAny.logo_url_dark,
          companyAny.print_logo_url_dark,
          companyAny.logo_url_print_dark,
          companyAny.logo_url,
          companyAny.print_logo_url,
          companyAny.logo_url_print
        );
  }, [company, resolvedTheme]);

  // Contexto de navegação protegida
  const { handleLinkClick: handleBreadcrumbNavigate } = useNavigationGuard();

  const prescriptionsListPath = useMemo(() => {
    return location.search ? `/prescricoes${location.search}` : '/prescricoes';
  }, [location.search]);

  const { data: prescriptionData, isLoading: loadingPrescription } = usePrescription(id);
  const prescription = prescriptionData as Prescription | undefined;
  const prescriptionPrintLogoUrl = useMemo(() => {
    const patient = (prescription as any)?.patient;
    if (!patient) return companyPrintLogoUrl;

    const primaryPayerClient = patient.patient_payer?.find(
      (payer: any) => payer?.is_primary
    )?.client;
    const fallbackPayerClient = patient.patient_payer?.[0]?.client;
    const operatorClient = primaryPayerClient || fallbackPayerClient || patient.billing_client;

    return pickFirstLogoUrl(
      operatorClient?.logo_url,
      operatorClient?.logoUrl,
      operatorClient?.logo,
      companyPrintLogoUrl
    );
  }, [companyPrintLogoUrl, prescription]);
  const { data: items = [], isLoading: loadingItems } = usePrescriptionItems(id);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  // States para busca de produtos
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [componentProductSearchTerm, setComponentProductSearchTerm] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [debouncedComponentSearch, setDebouncedComponentSearch] = useState('');

  // Debounce para busca de produtos
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProductSearch(productSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedComponentSearch(componentProductSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [componentProductSearchTerm]);

  const { data: equipmentData = [] } = useEquipment();
  const equipment = equipmentData as Equipment[];
  const { data: proceduresData = [] } = useProcedures();
  const procedures = proceduresData as Procedure[];
  const { data: administrationRoutes = [] } = useAdministrationRoutes();
  const { data: unitsOfMeasure = [] } = useUnitsOfMeasure();

  const updatePrescription = useUpdatePrescription();
  const addItem = useAddPrescriptionItem();
  const updateItem = useUpdatePrescriptionItem();
  const deleteItem = useDeletePrescriptionItem();
  const duplicateItem = useDuplicatePrescriptionItem();
  const toggleItemActive = useTogglePrescriptionItemActive();
  const suspendItemWithDate = useSuspendPrescriptionItemWithDate();
  const { data: prescriptionLogs = [], isLoading: loadingLogs } = usePrescriptionLogs(id);
  const uploadAttachment = useUploadPrescriptionAttachment();
  const createPrescriptionPrint = useCreatePrescriptionPrint();
  const deletePrescriptionPrint = useDeletePrescriptionPrint();
  const fetchPrescriptionPrintSnapshot = useFetchPrescriptionPrintSnapshot();
  const { hasPermission: hasPrescriptionPrintPermission } = useHasPermission(
    'prescriptions',
    'print'
  );
  const { hasPermission: hasPrescriptionEditPermission, isLoading: loadingEditPermission } =
    useHasPermission('prescriptions', 'edit');
  const canPrintPrescription = hasPrescriptionPrintPermission || hasPrescriptionEditPermission;
  const canOpenPrintAction = !!prescription && !loadingPrescription;
  const { data: prescriptionPrintHistory = [], isLoading: loadingPrescriptionPrintHistory } =
    usePrescriptionPrintHistory(id);

  const logProductIds = useMemo(() => {
    const ids = new Set<string>();
    items.forEach((item) => {
      const product = (item as any).product;
      if (product?.id) ids.add(product.id);
    });
    prescriptionLogs.forEach((log) => {
      if (log.entity !== 'prescription_item') return;
      const productId =
        (log.new_data as any)?.product_id || (log.old_data as any)?.product_id || '';
      if (productId) ids.add(productId);
    });
    return Array.from(ids).sort();
  }, [items, prescriptionLogs]);

  const { data: logProducts = [] } = useQuery({
    queryKey: ['log-products', company?.id, logProductIds],
    queryFn: async () => {
      if (!company?.id || logProductIds.length === 0) return [];

      const { data, error } = await supabase
        .from('product')
        .select(
          `
          id,
          name,
          concentration,
          unit_stock:unit_stock_id(id, code, name, symbol),
          unit_prescription:unit_prescription_id(id, code, name, symbol)
        `
        )
        .eq('company_id', company.id)
        .in('id', logProductIds);

      if (error) throw error;
      return data as unknown[] as Array<{
        id: string;
        name: string;
        concentration: string | null;
        unit_stock: { id: string; code: string; name: string; symbol: string | null } | null;
        unit_prescription: { id: string; code: string; name: string; symbol: string | null } | null;
      }>;
    },
    enabled: !!company?.id && logProductIds.length > 0,
  });

  const logProductsById = useMemo(() => {
    const map = new Map<string, any>();
    logProducts.forEach((product) => map.set(product.id, product));
    items.forEach((item) => {
      const product = (item as any).product;
      if (product?.id) {
        map.set(product.id, product);
      }
    });
    return map;
  }, [logProducts, items]);

  // Component hooks
  const addComponent = useAddPrescriptionItemComponent();
  const updateComponent = useUpdatePrescriptionItemComponent();
  const deleteComponent = useDeletePrescriptionItemComponent();

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isDeleteItemModalOpen, setIsDeleteItemModalOpen] = useState(false);
  const [isSuspendItemModalOpen, setIsSuspendItemModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PrescriptionItem | null>(null);
  const [suspensionEndDate, setSuspensionEndDate] = useState('');
  const [periodStartDate, setPeriodStartDate] = useState('');
  const [periodEndDate, setPeriodEndDate] = useState('');
  const [periodModalError, setPeriodModalError] = useState('');
  const [timeChecks, setTimeChecks] = useState<string[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [weekDaysSelected, setWeekDaysSelected] = useState<number[]>([]);
  const [weekTimeSelected, setWeekTimeSelected] = useState<string>('');
  const [mainTab, setMainTab] = useState<'items' | 'logs' | 'printHistory'>('items');
  const [printActionInProgress, setPrintActionInProgress] =
    useState<PrescriptionPrintAction | null>(null);
  const [printHistoryActionInProgress, setPrintHistoryActionInProgress] = useState<{
    id: string;
    action: PrescriptionPrintAction;
  } | null>(null);
  const [deletingPrintId, setDeletingPrintId] = useState<string | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'item' | 'components' | 'optionals'>('item');

  // Log filters
  const [logEntityFilter, setLogEntityFilter] = useState<
    'all' | 'prescription' | 'prescription_item'
  >('all');
  const [logActionFilter, setLogActionFilter] = useState<'all' | 'create' | 'update' | 'delete'>(
    'all'
  );
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  // Component state - local list for both new and existing items
  const [localComponents, setLocalComponents] = useState<
    Array<{
      id?: string;
      product_id: string;
      quantity: number | null;
      product?: {
        id: string;
        name: string;
        concentration: string | null;
        unit_stock?: { symbol?: string | null } | null;
        unit_prescription?: { symbol?: string | null } | null;
      } | null;
      isNew?: boolean;
    }>
  >([]);
  const [selectedComponentProductId, setSelectedComponentProductId] = useState('');
  const [selectedComponentQuantity, setSelectedComponentQuantity] = useState<number | ''>('');
  const [editingComponentIndex, setEditingComponentIndex] = useState<number | null>(null);

  // Fetch components when editing an existing item
  const { data: existingComponents = [] } = usePrescriptionItemComponents(selectedItem?.id);

  // Sync localComponents with existingComponents when editing
  useEffect(() => {
    if (selectedItem && existingComponents.length > 0) {
      setLocalComponents(
        existingComponents.map((c: any) => ({
          id: c.id,
          product_id: c.product?.id || '',
          quantity: c.quantity,
          product: c.product,
          isNew: false,
        }))
      );
    }
  }, [selectedItem, existingComponents]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<ItemFormData>({
    shouldUnregister: false,
    defaultValues: {
      item_type: 'medication',
      product_id: '',
      equipment_id: '',
      procedure_id: '',
      display_name: '',
      item_order: null,
      supplier: 'company',
      quantity: 1,
      frequency_mode: 'every',
      times_value: '' as unknown as number,
      times_unit: '',
      interval_minutes: null,
      time_start: '',
      time_checks: '',
      route_id: '',
      start_date: '',
      end_date: '',
      is_prn: false,
      is_continuous_use: true,
      justification: '',
      instructions_use: '',
      instructions_pharmacy: '',
    },
  });

  const watchItemType = watch('item_type');
  const watchProductId = watch('product_id');
  const watchFrequencyMode = watch('frequency_mode');
  const watchTimesValue = watch('times_value');
  const watchTimesUnit = watch('times_unit');
  const watchIsPrn = watch('is_prn');
  const handleToggleIsPrn = useCallback(
    (nextChecked?: boolean) => {
      const nextIsPrn = typeof nextChecked === 'boolean' ? nextChecked : !watchIsPrn;

      setValue('is_prn', nextIsPrn, { shouldDirty: true, shouldValidate: true });

      if (!nextIsPrn) {
        clearErrors('instructions_use');
      }
    },
    [watchIsPrn, setValue, clearErrors]
  );
  const isContinuousUse = watch('is_continuous_use') ?? true;
  const startDateValue = watch('start_date') || '';
  const endDateValue = watch('end_date') || '';

  useEffect(() => {
    if (!selectedItem || existingComponents.length === 0) return;

    const periodFromItem = (existingComponents as any[])[0]?.prescription_item;
    if (!periodFromItem) return;

    if (!startDateValue && periodFromItem.start_date) {
      setValue('start_date', periodFromItem.start_date);
    }

    if (!endDateValue && periodFromItem.end_date) {
      setValue('end_date', periodFromItem.end_date);
    }
  }, [selectedItem, existingComponents, startDateValue, endDateValue, setValue]);

  // Ref para focar no campo produto após "Salvar + Novo"
  const productFieldRef = useRef<HTMLInputElement | null>(null);

  const itemTypeForSearch =
    watchItemType === 'medication' || watchItemType === 'material' || watchItemType === 'diet'
      ? watchItemType
      : undefined;

  const { data: productsData = [], isLoading: productsIsLoading } =
    useProductsSearchWithPresentations(debouncedProductSearch, itemTypeForSearch);
  const { data: componentProductsData = [], isLoading: componentProductsIsLoading } =
    useProductsSearchWithPresentations(debouncedComponentSearch);
  const products = productsData as Product[];
  const componentProducts = componentProductsData as Product[];

  const {
    ref: startDateRef,
    min: _startDateMin,
    max: _startDateMax,
    ...startDateField
  } = register('start_date', {
    required: !isContinuousUse ? 'Data inicial e obrigatoria quando nao for uso continuo' : false,
  });
  const {
    ref: endDateRef,
    min: _endDateMin,
    max: _endDateMax,
    ...endDateField
  } = register('end_date', {
    required: !isContinuousUse ? 'Data final e obrigatoria quando nao for uso continuo' : false,
  });
  const { ref: productIdFieldRef, ...productIdField } = register('product_id', {
    required: 'Produto é obrigatório',
  });

  const normalizeText = useCallback(
    (value: string) =>
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''),
    []
  );

  const unitById = useMemo(() => {
    return new Map(unitsOfMeasure.map((unit) => [unit.id, unit]));
  }, [unitsOfMeasure]);

  const getUnitById = useCallback(
    (unitId?: string | null) => (unitId ? unitById.get(unitId) : undefined),
    [unitById]
  );

  const getUnitLabel = useCallback(
    (unitId?: string | null) => {
      const unit = getUnitById(unitId);
      return unit ? unit.name : '';
    },
    [getUnitById]
  );

  const isDayUnit = useCallback(
    (unitId?: string | null) => {
      const unit = getUnitById(unitId);
      if (!unit) return false;
      const code = normalizeText(unit.code);
      const name = normalizeText(unit.name);
      const symbol = normalizeText(unit.symbol || '');
      return (
        code === 'd' ||
        code === 'dia' ||
        name.includes('dia') ||
        name.includes('day') ||
        symbol === 'd'
      );
    },
    [getUnitById, normalizeText]
  );

  const mapUnitToTimesUnit = useCallback(
    (unitId?: string | null) => {
      // console.log('mapUnitToTimesUnit called with:', unitId)
      const unit = getUnitById(unitId);
      // console.log('Found unit:', unit)
      if (!unit) return null;

      const code = normalizeText(unit.code);
      const name = normalizeText(unit.name);
      const symbol = normalizeText(unit.symbol || '');

      // console.log('Unit details:', { code, name, symbol })

      // Check for day units
      if (
        code === 'd' ||
        code === 'dia' ||
        symbol === 'd' ||
        name.includes('dia') ||
        name.includes('day')
      ) {
        // console.log('Mapped to: day')
        return 'day';
      }

      // Check for week units
      if (
        code === 'sem' ||
        code === 'week' ||
        symbol === 'sem' ||
        name.includes('semana') ||
        name.includes('week')
      ) {
        // console.log('Mapped to: week')
        return 'week';
      }

      // Check for hour units
      if (
        code === 'h' ||
        code === 'hr' ||
        code === 'hora' ||
        code === 'horas' ||
        symbol === 'h' ||
        symbol === 'hr' ||
        name.includes('hora') ||
        name.includes('hour') ||
        name === 'hora' ||
        name === 'horas'
      ) {
        // console.log('Mapped to: hour')
        return 'hour';
      }

      // Check for month units
      if (
        code === 'mes' ||
        code === 'month' ||
        symbol === 'mes' ||
        name.includes('mes') ||
        name.includes('month')
      ) {
        // console.log('Mapped to: month')
        return 'month';
      }

      // Default to day for unsupported units
      // console.log('Mapped to: day (default)')
      return 'day';
    },
    [getUnitById, normalizeText]
  );

  const mapTimesUnitToUnitId = useCallback(
    (timesUnit?: string | null) => {
      if (!timesUnit) return null;

      // Find a unit that matches the times_unit enum value
      const matchingUnit = unitsOfMeasure.find((unit) => {
        const code = normalizeText(unit.code);
        const name = normalizeText(unit.name);
        const symbol = normalizeText(unit.symbol || '');

        if (timesUnit === 'day') {
          return (
            code === 'd' ||
            code === 'dia' ||
            symbol === 'd' ||
            name.includes('dia') ||
            name.includes('day')
          );
        }

        if (timesUnit === 'week') {
          return (
            code === 'sem' ||
            code === 'week' ||
            symbol === 'sem' ||
            name.includes('semana') ||
            name.includes('week')
          );
        }

        if (timesUnit === 'hour') {
          return (
            code === 'h' ||
            code === 'hr' ||
            code === 'hora' ||
            symbol === 'h' ||
            symbol === 'hr' ||
            name.includes('hora') ||
            name.includes('hour')
          );
        }

        if (timesUnit === 'month') {
          return (
            code === 'mes' ||
            code === 'month' ||
            symbol === 'mes' ||
            name.includes('mes') ||
            name.includes('month')
          );
        }

        return false;
      });

      return matchingUnit?.id || null;
    },
    [unitsOfMeasure, normalizeText]
  );

  const getMinutesPerUnit = useCallback(
    (unitId?: string | null) => {
      const unit = getUnitById(unitId);
      if (!unit) return null;
      const code = normalizeText(unit.code);
      const name = normalizeText(unit.name);
      const symbol = normalizeText(unit.symbol || '');

      const isMinute =
        code === 'min' || symbol === 'min' || name.includes('minuto') || name.includes('minute');
      if (isMinute) return 1;

      const isHour =
        code === 'h' ||
        code === 'hr' ||
        symbol === 'h' ||
        symbol === 'hr' ||
        name.includes('hora') ||
        name.includes('hour');
      if (isHour) return 60;

      const isDay =
        code === 'd' ||
        code === 'dia' ||
        symbol === 'd' ||
        name.includes('dia') ||
        name.includes('day');
      if (isDay) return 1440;

      const isWeek =
        code === 'sem' ||
        code === 'week' ||
        symbol === 'sem' ||
        name.includes('semana') ||
        name.includes('week');
      if (isWeek) return 10080;

      return null;
    },
    [getUnitById, normalizeText]
  );

  const dayUnitId = useMemo(() => {
    const dayUnit = unitsOfMeasure.find((unit) => {
      const code = normalizeText(unit.code);
      const name = normalizeText(unit.name);
      const symbol = normalizeText(unit.symbol || '');
      return (
        code === 'd' ||
        code === 'dia' ||
        name.includes('dia') ||
        name.includes('day') ||
        symbol === 'd'
      );
    });
    return dayUnit?.id || '';
  }, [unitsOfMeasure, normalizeText]);

  const hourUnitId = useMemo(() => {
    const hourUnit = unitsOfMeasure.find((unit) => {
      const code = normalizeText(unit.code);
      const name = normalizeText(unit.name);
      const symbol = normalizeText(unit.symbol || '');
      return (
        code === 'h' ||
        code === 'hr' ||
        code === 'hora' ||
        code === 'horas' ||
        symbol === 'h' ||
        symbol === 'hr' ||
        name.includes('hora') ||
        name.includes('hour') ||
        name === 'hora' ||
        name === 'horas'
      );
    });
    return hourUnit?.id || '';
  }, [unitsOfMeasure, normalizeText]);

  // Atualizar defaultValues quando hourUnitId estiver disponível - apenas para novos itens
  useEffect(() => {
    if (hourUnitId && !selectedItem && isItemModalOpen && watch('times_unit') === '') {
      setValue('times_unit', hourUnitId);
    }
  }, [hourUnitId, setValue, selectedItem, isItemModalOpen, watch]);

  const timeUnitOptions = useMemo(() => {
    const isTimeUnit = (unit: UnitOfMeasure) => {
      const code = normalizeText(unit.code);
      const name = normalizeText(unit.name);
      const symbol = normalizeText(unit.symbol || '');

      // Para modo "times_per", mostrar apenas dia, semana e mês
      if (watchFrequencyMode === 'times_per') {
        return (
          code === 'd' ||
          code === 'dia' ||
          code === 'sem' ||
          code === 'semana' ||
          code === 'week' ||
          code === 'month' ||
          code === 'mes' ||
          name.includes('dia') ||
          name.includes('day') ||
          name.includes('semana') ||
          name.includes('week') ||
          name.includes('mês') ||
          name.includes('month')
        );
      }

      // Para outros modos, incluir todas as unidades de tempo
      return (
        code === 'min' ||
        code === 'h' ||
        code === 'hr' ||
        code === 'd' ||
        code === 'dia' ||
        code === 'sem' ||
        code === 'week' ||
        name.includes('minuto') ||
        name.includes('minute') ||
        name.includes('hora') ||
        name.includes('hour') ||
        name.includes('dia') ||
        name.includes('day') ||
        name.includes('semana') ||
        name.includes('week') ||
        symbol === 'min' ||
        symbol === 'h' ||
        symbol === 'hr' ||
        symbol === 'd'
      );
    };

    const filtered = unitsOfMeasure.filter(isTimeUnit);
    const source = filtered.length > 0 ? filtered : unitsOfMeasure;
    const options = source.map((unit) => ({
      value: unit.id,
      label: `${unit.name} (${unit.code})`,
    }));

    // Priorizar "hora" como primeiro item da lista
    const hourOptionIndex = options.findIndex((option) => {
      const unit = source.find((u) => u.id === option.value);
      if (!unit) return false;

      const code = normalizeText(unit.code);
      const name = normalizeText(unit.name);
      const symbol = normalizeText(unit.symbol || '');

      return (
        code === 'h' ||
        code === 'hr' ||
        code === 'hora' ||
        code === 'horas' ||
        symbol === 'h' ||
        symbol === 'hr' ||
        name.includes('hora') ||
        name.includes('hour') ||
        name === 'hora' ||
        name === 'horas'
      );
    });

    if (hourOptionIndex > -1) {
      const hourOption = options[hourOptionIndex];
      const otherOptions = options.filter((_, index) => index !== hourOptionIndex);
      return [hourOption, ...otherOptions];
    }

    return options;
  }, [unitsOfMeasure, normalizeText, watchFrequencyMode]);

  // Verifica se a unidade selecionada é semana
  const isWeekUnit = useMemo(() => {
    if (!watchTimesUnit) return false;
    const selectedUnit = unitsOfMeasure.find((unit) => unit.id === watchTimesUnit);
    if (!selectedUnit) return false;

    const code = normalizeText(selectedUnit.code);
    const name = normalizeText(selectedUnit.name);
    return code === 'sem' || code === 'week' || name.includes('semana') || name.includes('week');
  }, [watchTimesUnit, unitsOfMeasure, normalizeText]);

  // Verifica se deve mostrar seleção de dias da semana
  const shouldShowWeekDays = watchFrequencyMode === 'times_per' && isWeekUnit && !watchIsPrn;

  const toggleWeekDay = (day: number) => {
    if (!shouldShowWeekDays) return;

    setWeekDaysSelected((current) => {
      const exists = current.includes(day);
      const next = exists ? current.filter((item) => item !== day) : [...current, day];

      // Se estiver no modo "vezes por semana", limitar seleção ao número de vezes
      if (shouldShowWeekDays && watchTimesValue) {
        if (!exists && next.length > watchTimesValue) {
          return current; // Não permite exceder o limite
        }
      }

      return sortWeekDays(next);
    });
  };

  const toggleShift = (shift: 'M' | 'T' | 'N') => {
    setSelectedShifts((current) => {
      const exists = current.includes(shift);
      const next = exists ? current.filter((item) => item !== shift) : [...current, shift];
      return sortShifts(next);
    });
  };

  const formatFrequencyText = useCallback(
    (data: {
      frequency_mode: ItemFormData['frequency_mode'];
      times_value?: number | null;
      times_unit?: string | null;
      time_start?: string | null;
      time_checks?: string | null;
      interval_minutes?: number | null;
    }) => {
      if (data.frequency_mode === 'every') {
        if (!data.times_value) return null;

        // Detectar se é intervalo de horas pelo interval_minutes
        const isHourlyInterval = data.interval_minutes && data.interval_minutes < 1440;

        if (isHourlyInterval) {
          // Para intervalos de horas, mostrar como "X/Xh"
          return `${data.times_value}/${data.times_value}h`;
        }

        const unitLabel = getUnitLabel(data.times_unit);
        if (!unitLabel) return null;

        // Formatação especial: usar "min" para minuto, "dia" para day/dia, etc.
        let displayUnit = unitLabel;
        if (unitLabel.toLowerCase().includes('minuto')) {
          displayUnit = 'min';
        } else if (unitLabel.toLowerCase().includes('dia') || data.times_unit === 'day') {
          displayUnit = 'dia';
        } else if (unitLabel.toLowerCase().includes('hora')) {
          displayUnit = 'hora';
        } else if (unitLabel.toLowerCase().includes('semana')) {
          displayUnit = 'semana';
        }

        return `${data.times_value}/${data.times_value} ${displayUnit}`;
      }

      const unitLabel = getUnitLabel(data.times_unit);
      if (data.frequency_mode === 'times_per') {
        if (!data.times_value) return null;
        // Verificar se a unidade é dia/day
        const isDayUnit =
          data.times_unit === 'day' || (unitLabel && unitLabel.toLowerCase().includes('dia'));
        if (isDayUnit) {
          return `${data.times_value} x DIA`;
        }
        const checks = data.time_checks ? ` (${data.time_checks})` : '';
        return `${data.times_value}x por ${unitLabel}${checks}`;
      }
      if (data.frequency_mode === 'shift') {
        if (!data.times_value) return 'Turnos';
        return `${data.times_value} x DIA`;
      }
      return null;
    },
    [getUnitLabel]
  );

  const formatFrequencyDisplay = useCallback(
    (item: any) => {
      if (item.frequency_mode) {
        const normalizedChecks =
          item.time_checks && typeof item.time_checks === 'string'
            ? item.time_checks
                .split(',')
                .map((value: string) => normalizeTimeValue(value.trim()))
                .filter(Boolean)
                .join(', ')
            : null;
        return (
          formatFrequencyText({
            frequency_mode: item.frequency_mode,
            times_value: item.times_value,
            times_unit: item.times_unit,
            time_start: normalizeTimeValue(item.time_start),
            time_checks: normalizedChecks,
            interval_minutes: item.interval_minutes,
          }) || '-'
        );
      }
      return item.frequency_text || '-';
    },
    [formatFrequencyText]
  );

  const isTimesPerDay = watchFrequencyMode === 'times_per' && isDayUnit(watchTimesUnit);
  useEffect(() => {
    if (!isTimesPerDay) return;
    // Garantir que apenas números inteiros sejam usados
    const rawValue = Number.isFinite(watchTimesValue) ? watchTimesValue : 0;
    const desired = Math.max(0, Math.floor(rawValue)); // Math.floor para garantir inteiro
    setTimeChecks((current) => {
      const next = [...current];
      if (next.length > desired) {
        return next.slice(0, desired);
      }
      if (next.length < desired) {
        return [...next, ...Array(desired - next.length).fill('')];
      }
      return next;
    });
  }, [isTimesPerDay, watchTimesValue]);

  // Resetar dias da semana quando shouldShowWeekDays mudar
  useEffect(() => {
    if (shouldShowWeekDays) {
      // Quando ativa o modo semana, iniciar vazio para usuário escolher
      if (weekDaysSelected.length === 7) {
        setWeekDaysSelected([]);
      }
    } else {
      // Quando desativa o modo semana, voltar para todos os dias
      setWeekDaysSelected(ALL_WEEK_DAYS);
    }
  }, [shouldShowWeekDays, weekDaysSelected.length]);

  useEffect(() => {
    if (watchFrequencyMode !== 'shift' || !isItemModalOpen) return;
    const shiftCount = selectedShifts.length;
    setValue('times_value', shiftCount || 0, { shouldDirty: true });
    if (dayUnitId) {
      setValue('times_unit', dayUnitId, { shouldDirty: true });
    }
  }, [watchFrequencyMode, selectedShifts, dayUnitId, setValue, isItemModalOpen]);

  const openAddItemModal = () => {
    setSelectedItem(null);
    setTimeChecks([]);
    setSelectedShifts([]);
    setWeekDaysSelected([]); // Iniciar vazio para usuário escolher
    setWeekTimeSelected(''); // Reset do horário da semana
    setLocalComponents([]);
    setSelectedComponentProductId('');
    setSelectedComponentQuantity('');
    setEditingComponentIndex(null);
    setActiveModalTab('item');

    // Reset completo do formulário
    const resetData = {
      item_type: 'medication' as ItemFormData['item_type'],
      product_id: '',
      equipment_id: '',
      procedure_id: '',
      display_name: '',
      item_order: null,
      supplier: 'company' as ItemFormData['supplier'],
      quantity: 1,
      frequency_mode: 'every' as ItemFormData['frequency_mode'],
      times_value: '' as unknown as number,
      times_unit: '',
      interval_minutes: null,
      time_start: '',
      time_checks: '',
      route_id: '',
      start_date: '',
      end_date: '',
      is_prn: false,
      is_continuous_use: true, // Padrão true para "uso contínuo"
      justification: '',
      instructions_use: '',
      instructions_pharmacy: '',
    };

    reset(resetData);
    setIsItemModalOpen(true);

    // Aguardar o modal abrir e garantir reset completo
    setTimeout(() => {
      // Reset novamente para garantir limpeza completa
      reset(resetData, { keepValues: false, keepDirty: false, keepTouched: false });

      // Focar no campo produto
      if (productFieldRef.current) {
        productFieldRef.current.focus();
      }
    }, 100);
  };

  const openEditItemModal = useCallback(
    (item: any) => {
      const parsedTimeChecks = parseTimeChecks(item.time_checks);
      const parsedShiftChecks = parseShiftCodes(item.time_checks);
      const parsedWeekDays = parseWeekDays(item.week_days);
      const resolvedWeekDays = parsedWeekDays.length > 0 ? parsedWeekDays : [];
      const resolvedMode = (item.frequency_mode || 'every') as ItemFormData['frequency_mode'];
      const isWeekUnitMode = resolvedMode === 'times_per' && item.times_unit === 'week';

      // Extrair horário único para modo semana
      const weekTime = isWeekUnitMode && parsedTimeChecks.length > 0 ? parsedTimeChecks[0] : '';

      setTimeChecks(resolvedMode === 'times_per' && !isWeekUnitMode ? parsedTimeChecks : []);
      setSelectedShifts(resolvedMode === 'shift' ? parsedShiftChecks : []);
      setWeekDaysSelected(resolvedWeekDays);
      setWeekTimeSelected(weekTime);
      setLocalComponents([]); // Will be populated by useEffect when existingComponents loads
      setSelectedComponentProductId('');
      setSelectedComponentQuantity('');
      setEditingComponentIndex(null);
      setSelectedItem(item);
      setActiveModalTab('item');
      reset({
        item_type: item.item_type,
        product_id: item.product_id || '',
        equipment_id: item.equipment_id || '',
        procedure_id: item.procedure_id || '',
        display_name: item.display_name || '',
        item_order: item.item_order ?? null,
        supplier: item.supplier || 'company',
        quantity: item.quantity || 1,
        frequency_mode: resolvedMode,
        times_value: resolvedMode === 'shift' ? parsedShiftChecks.length : (item.times_value ?? 1),
        times_unit:
          resolvedMode === 'shift'
            ? dayUnitId || mapTimesUnitToUnitId(item.times_unit) || ''
            : mapTimesUnitToUnitId(item.times_unit) || '',
        interval_minutes: item.interval_minutes || null,
        time_start: normalizeTimeValue(item.time_start),
        time_checks: item.time_checks || '',
        route_id: item.route_id || '',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        is_prn: item.is_prn ?? false,
        is_continuous_use: item.is_continuous_use ?? true,
        justification: item.justification || '',
        instructions_use: item.instructions_use || '',
        instructions_pharmacy: item.instructions_pharmacy || '',
      });
      setIsItemModalOpen(true);
    },
    [dayUnitId, reset, mapTimesUnitToUnitId]
  );

  const openDeleteItemModal = useCallback((item: PrescriptionItem) => {
    setSelectedItem(item);
    setIsDeleteItemModalOpen(true);
  }, []);

  const openSuspendItemModal = useCallback((item: PrescriptionItem) => {
    setSelectedItem(item);
    setSuspensionEndDate('');
    setIsSuspendItemModalOpen(true);
  }, []);

  const handleSuspendItem = async () => {
    if (selectedItem && suspensionEndDate) {
      await suspendItemWithDate.mutateAsync({
        id: selectedItem.id,
        endDate: suspensionEndDate,
      });
      setIsSuspendItemModalOpen(false);
    }
  };

  const onSubmitItem = async (data: ItemFormData, options?: { addAnother?: boolean }) => {
    if (!id) return;

    // Prepare data according to constraint rules
    let itemData: any = {
      prescription_id: id,
      item_type: data.item_type,
      product_id: !['equipment', 'procedure'].includes(data.item_type)
        ? data.product_id || null
        : null,
      equipment_id: data.item_type === 'equipment' ? data.equipment_id || null : null,
      procedure_id: data.item_type === 'procedure' ? data.procedure_id || null : null,
      display_name: data.display_name?.trim() || null,
      item_order: data.item_order ?? null,
      supplier: data.supplier || null,
      quantity: data.quantity || null,
      week_days:
        shouldShowWeekDays && weekDaysSelected.length > 0
          ? sortWeekDays(weekDaysSelected)
          : !shouldShowWeekDays && weekDaysSelected.length !== 7
            ? sortWeekDays(weekDaysSelected)
            : null,
      route_id: data.route_id || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      is_prn: data.is_prn ?? false,
      is_continuous_use: data.is_continuous_use ?? false,
      justification: data.justification || null,
      instructions_use: data.instructions_use || null,
      instructions_pharmacy: data.instructions_pharmacy || null,
    };

    if (data.frequency_mode === 'every') {
      // For 'every' mode: save times_value, times_unit, interval_minutes and time_start
      const minutesPerUnit = getMinutesPerUnit(data.times_unit);
      const intervalMinutes =
        minutesPerUnit && data.times_value
          ? Math.round(Number(data.times_value) * minutesPerUnit)
          : null;

      // Garantir que time_start não seja string vazia
      const timeStartValue =
        data.time_start && data.time_start.trim() !== '' ? data.time_start : null;

      // Validação: time_start é obrigatório em modo 'every', exceto quando é 'se necessário'
      if (!timeStartValue && !data.is_prn) {
        throw new Error('Campo obrigatório');
      }

      // Gerar time_checks automaticamente para modo 'every' (horários dentro de um dia)
      let generatedTimeChecks: string[] | null = null;
      if (intervalMinutes && timeStartValue && intervalMinutes < 1440) {
        // Se o intervalo é menor que 24 horas (1440 minutos), é um intervalo intra-dia
        generatedTimeChecks = [];
        let currentMinutes = 0;

        // Parsear hora inicial
        const [startHours, startMinutes] = timeStartValue.split(':').map(Number);
        const startTotalMinutes = (startHours || 0) * 60 + (startMinutes || 0);

        // Gerar horários ao longo do dia
        while (currentMinutes < 1440) {
          const totalMinutes = startTotalMinutes + currentMinutes;
          const dayMinutes = totalMinutes % 1440;
          const hours = Math.floor(dayMinutes / 60);
          const mins = dayMinutes % 60;
          const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
          generatedTimeChecks.push(timeStr);
          currentMinutes += intervalMinutes;
        }
      }

      const convertedTimesUnit = mapUnitToTimesUnit(data.times_unit) || 'day';
      // console.log('Converting times_unit:', {
      //   original: data.times_unit,
      //   converted: convertedTimesUnit,
      //   functionExists: typeof mapUnitToTimesUnit,
      // })

      itemData = {
        ...itemData,
        frequency_mode: 'every',
        times_value: data.times_value ? Number(data.times_value) : null,
        times_unit: convertedTimesUnit,
        interval_minutes: intervalMinutes,
        time_start: timeStartValue,
        time_checks: generatedTimeChecks,
      };

      // Debug: Log the values to verify they meet the constraint
      // console.log('Every mode values:', {
      //   frequency_mode: 'every',
      //   times_value: data.times_value ? Number(data.times_value) : null,
      //   times_unit: convertedTimesUnit,
      //   original_times_unit: data.times_unit,
      //   interval_minutes: intervalMinutes,
      //   time_start: timeStartValue,
      //   time_checks: generatedTimeChecks,
      //   originalTimeStart: data.time_start,
      // })
    } else if (data.frequency_mode === 'times_per') {
      // For 'times_per' mode: save times_value, times_unit and optionally time_checks
      const shouldUseTimeChecks = isDayUnit(data.times_unit);
      const isWeekMode = data.times_unit === 'week';

      let resolvedTimeChecks = null;
      if (shouldUseTimeChecks) {
        resolvedTimeChecks = formatTimeChecks(timeChecks);
      } else if (isWeekMode && weekTimeSelected) {
        // Para modo semana, salvar apenas o horário único
        resolvedTimeChecks = weekTimeSelected;
      }

      const convertedTimesUnit = mapUnitToTimesUnit(data.times_unit) || 'day';
      // console.log('Converting times_unit (times_per):', {
      //   original: data.times_unit,
      //   converted: convertedTimesUnit,
      //   functionExists: typeof mapUnitToTimesUnit,
      // })

      itemData = {
        ...itemData,
        frequency_mode: 'times_per',
        times_value: data.times_value ? Number(data.times_value) : null,
        times_unit: convertedTimesUnit,
        interval_minutes: null,
        time_start: null,
        time_checks: resolvedTimeChecks,
      };
    } else if (data.frequency_mode === 'shift') {
      // For 'shift' mode: save times_value, times_unit and time_checks
      itemData = {
        ...itemData,
        frequency_mode: 'shift',
        times_value: selectedShifts.length > 0 ? selectedShifts.length : null,
        times_unit: 'day',
        interval_minutes: null,
        time_start: null,
        time_checks: formatShiftChecks(selectedShifts),
      };
    } else {
      // Default case: no frequency mode
      itemData = {
        ...itemData,
        frequency_mode: null,
        interval_minutes: null,
        time_start: null,
        times_value: null,
        times_unit: null,
        time_checks: null,
      };
    }

    // console.log('Sending item data:', itemData)

    let savedItemId: string | null = null;

    if (selectedItem) {
      await updateItem.mutateAsync({
        id: selectedItem.id,
        prescriptionId: id,
        ...itemData,
      });
      savedItemId = selectedItem.id;
    } else {
      const result = await addItem.mutateAsync(itemData);
      savedItemId = result?.id || null;
    }

    // Handle components if we have a saved item ID
    if (savedItemId && localComponents.length > 0) {
      // For new items, save all local components
      // For existing items, the components are managed inline
      for (const component of localComponents) {
        if (component.isNew) {
          await addComponent.mutateAsync({
            prescription_item_id: savedItemId,
            product_id: component.product_id || null,
            quantity: component.quantity,
          });
        }
      }
    }

    if (options?.addAnother) {
      openAddItemModal();
      return;
    }

    setIsItemModalOpen(false);
  };

  const handleDeleteItem = async () => {
    if (selectedItem && id) {
      await deleteItem.mutateAsync({ id: selectedItem.id, prescriptionId: id });
      setIsDeleteItemModalOpen(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && id) {
      await uploadAttachment.mutateAsync({ prescriptionId: id, file });
    }
    e.target.value = '';
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    await updatePrescription.mutateAsync({ id, status: newStatus as any });
  };

  const openPeriodModal = () => {
    setPeriodStartDate(prescription?.start_date || '');
    setPeriodEndDate(prescription?.end_date || '');
    setPeriodModalError('');
    setIsPeriodModalOpen(true);
  };

  const handleSavePeriod = async () => {
    if (!id) return;
    if (periodStartDate && periodEndDate && periodEndDate < periodStartDate) {
      setPeriodModalError('Data final deve ser igual ou posterior à data inicial.');
      return;
    }

    setPeriodModalError('');
    await updatePrescription.mutateAsync({
      id,
      start_date: periodStartDate || null,
      end_date: periodEndDate || null,
    });
    setIsPeriodModalOpen(false);
  };

  const handleGeneratePrescriptionPrint = async ({
    periodStart,
    periodEnd,
    weekStartDay,
    action,
    orientation,
  }: {
    periodStart: string;
    periodEnd: string;
    weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    action: PrescriptionPrintAction;
    orientation: PrescriptionPrintOrientation;
  }) => {
    if (!id || !prescription) return;

    const shouldOpenWindow = action !== 'download';
    const previewWindow = shouldOpenWindow
      ? window.open('', '_blank', 'width=1240,height=900')
      : null;

    setPrintActionInProgress(action);
    try {
      const result = await createPrescriptionPrint.mutateAsync({
        prescription: {
          id,
          type: (prescription as any)?.type ?? (prescription as any)?.prescription_type ?? null,
          notes: prescription.notes || null,
          patient: (prescription as any).patient || null,
          professional: (prescription as any).professional || null,
        },
        items: sortedItems as unknown as PrescriptionPrintSourceItem[],
        routes: administrationRoutes.map((route) => ({
          id: route.id,
          name: route.name,
          abbreviation: route.abbreviation,
        })),
        periodStart,
        periodEnd,
        weekStartDay,
        orientation,
      });

      await openPrescriptionPrintPreview(result.snapshot, {
        mode: action,
        targetWindow: previewWindow,
        companyLogoUrl: prescriptionPrintLogoUrl,
        orientation,
        prescriptionType: (prescription as any)?.type ?? (prescription as any)?.prescription_type ?? null,
      });
      setIsPrintModalOpen(false);
    } catch (error) {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close();
      }
      console.error('Error generating prescription print:', error);
    } finally {
      setPrintActionInProgress(null);
    }
  };

  const handlePrintHistoryAction = useCallback(
    async (prescriptionPrintId: string, action: PrescriptionPrintAction) => {
      const shouldOpenWindow = action !== 'download';
      const previewWindow = shouldOpenWindow
        ? window.open('', '_blank', 'width=1240,height=900')
        : null;

      setPrintHistoryActionInProgress({ id: prescriptionPrintId, action });
      try {
        const snapshot = await fetchPrescriptionPrintSnapshot.mutateAsync(prescriptionPrintId);
        await openPrescriptionPrintPreview(snapshot, {
          mode: action,
          targetWindow: previewWindow,
          companyLogoUrl: prescriptionPrintLogoUrl,
          prescriptionType: (prescription as any)?.type ?? (prescription as any)?.prescription_type ?? null,
        });
      } catch (error) {
        if (previewWindow && !previewWindow.closed) {
          previewWindow.close();
        }
        console.error(`Error executing print action (${action}):`, error);
      } finally {
        setPrintHistoryActionInProgress((current) =>
          current?.id === prescriptionPrintId && current.action === action ? null : current
        );
      }
    },
    [fetchPrescriptionPrintSnapshot, prescription, prescriptionPrintLogoUrl]
  );

  const handleReprintPrescription = useCallback(
    (prescriptionPrintId: string) => {
      void handlePrintHistoryAction(prescriptionPrintId, 'print');
    },
    [handlePrintHistoryAction]
  );

  const handleDeletePrescriptionPrint = useCallback(
    async (printItem: PrescriptionPrintHistoryItem) => {
      if (!id) return;

      const confirmed = window.confirm(
        `Excluir a impressao ${printItem.print_number}? Essa acao nao pode ser desfeita.`
      );
      if (!confirmed) return;

      setDeletingPrintId(printItem.id);
      try {
        await deletePrescriptionPrint.mutateAsync({
          prescriptionPrintId: printItem.id,
          prescriptionId: id,
        });
      } finally {
        setDeletingPrintId(null);
      }
    },
    [deletePrescriptionPrint, id]
  );

  const todayDateKey = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const getDateKey = useCallback((value?: string | null) => {
    if (!value) return null;
    return value.split('T')[0] || null;
  }, []);

  const isMedicationSuspendedByEndDate = useCallback(
    (item: Pick<PrescriptionItem, 'item_type' | 'end_date'>) => {
      if (item.item_type !== 'medication') return false;

      const endDateKey = getDateKey(item.end_date);
      if (!endDateKey) return false;

      return endDateKey < todayDateKey;
    },
    [getDateKey, todayDateKey]
  );

  const isItemEffectivelyActive = useCallback(
    (item: Pick<PrescriptionItem, 'item_type' | 'end_date' | 'is_active'>) => {
      if (item.is_active === false) return false;
      if (isMedicationSuspendedByEndDate(item)) return false;
      return true;
    },
    [isMedicationSuspendedByEndDate]
  );

  // Calcular números de itens baseado na ordem das vias e no status efetivo
  const itemNumbers = useMemo(() => {
    const sortedByRoute = sortPrescriptionItemsByRoute(items, administrationRoutes);
    const numbers = new Map<string, number>();
    let nextNumber = 1;

    sortedByRoute.forEach((item) => {
      if (isItemEffectivelyActive(item)) {
        numbers.set(item.id, nextNumber);
        nextNumber += 1;
      }
    });

    return numbers;
  }, [items, administrationRoutes, isItemEffectivelyActive]);

  // Ordenar itens por via de administração e status efetivo
  const sortedItems = useMemo(() => {
    const sorted = sortPrescriptionItemsByRoute(items, administrationRoutes);
    // Itens ativos vêm primeiro, inativos por último
    return sorted.sort((a, b) => {
      const aActive = isItemEffectivelyActive(a);
      const bActive = isItemEffectivelyActive(b);
      if (aActive !== bActive) {
        return aActive ? -1 : 1;
      }
      return 0;
    });
  }, [items, administrationRoutes, isItemEffectivelyActive]);

  const printHistoryColumns: ColumnDef<PrescriptionPrintHistoryItem>[] = useMemo(
    () =>
      buildPrintHistoryColumns({
        printHistoryActionInProgress,
        handlePrintHistoryAction,
        deletingPrintId,
        handleDeletePrescriptionPrint,
        hasPrescriptionEditPermission,
        canPrintPrescription,
      }),
    [
      printHistoryActionInProgress,
      handlePrintHistoryAction,
      deletingPrintId,
      handleDeletePrescriptionPrint,
      hasPrescriptionEditPermission,
      canPrintPrescription,
    ]
  );

  const itemColumns: ColumnDef<any>[] = useMemo(
    () =>
      buildItemColumns({
        itemNumbers,
        products,
        equipment,
        procedures,
        administrationRoutes,
        formatFrequencyDisplay,
        isItemEffectivelyActive,
        isMedicationSuspendedByEndDate,
        openSuspendItemModal,
        toggleItemActive: (payload) => toggleItemActive.mutate(payload),
        openEditItemModal,
        prescriptionId: id,
        items,
        duplicateItem: (payload) => duplicateItem.mutate(payload as any),
        openDeleteItemModal,
      }),
    [
      itemNumbers,
      products,
      equipment,
      procedures,
      administrationRoutes,
      formatFrequencyDisplay,
      isItemEffectivelyActive,
      isMedicationSuspendedByEndDate,
      openSuspendItemModal,
      toggleItemActive,
      openEditItemModal,
      id,
      items,
      duplicateItem,
      openDeleteItemModal,
    ]
  );
  // Garantir que o produto atualmente selecionado sempre apareça nas opções
  const currentProduct = watchProductId ? products.find((p) => p.id === watchProductId) : null;
  const productsForOptions =
    currentProduct && !products.find((p) => p.id === currentProduct.id)
      ? [...products, currentProduct]
      : products;

  const productOptions = productsForOptions.map((item) => {
    const productData = item as any;
    // Priorizar symbol da unidade de prescrição, fallback para symbol da unidade base
    const unitSymbol =
      productData.unit_prescription?.symbol || productData.unit_stock?.symbol || 'UN';
    const concentration = item.concentration?.trim();
    const concentrationLabel = concentration ? ` ${concentration}` : '';

    return {
      value: item.id,
      label: `${item.name}${concentrationLabel} (${unitSymbol})`,
    };
  });

  // Opções de produtos para componentes de administração (sempre todos os produtos ativos)
  const componentProductOptions = componentProducts
    .filter((item) => item.active)
    .map((item) => {
      const productData = item as any;
      const unitSymbol = productData.unit_prescription?.symbol || 'UN';
      const concentration = item.concentration?.trim();
      const concentrationLabel = concentration ? ` ${concentration}` : '';

      return {
        value: item.id,
        label: `${item.name}${concentrationLabel} (${unitSymbol})`,
      };
    });

  // Garantir que o equipamento atualmente selecionado sempre apareça nas opções
  const watchEquipmentId = watch('equipment_id');
  const currentEquipment = watchEquipmentId
    ? equipment.find((e) => e.id === watchEquipmentId)
    : null;
  const filteredEquipment = equipment.filter((e) => e.status === 'available');
  const equipmentForOptions =
    currentEquipment && !filteredEquipment.find((e) => e.id === currentEquipment.id)
      ? [...filteredEquipment, currentEquipment]
      : filteredEquipment;

  const equipmentOptions = equipmentForOptions.map((e) => ({
    value: e.id,
    label: `${e.name} ${e.serial_number ? `(${e.serial_number})` : ''}`,
  }));

  // Garantir que o procedimento atualmente selecionado sempre apareça nas opções
  const watchProcedureId = watch('procedure_id');
  const currentProcedure = watchProcedureId
    ? procedures.find((p) => p.id === watchProcedureId)
    : null;
  const filteredProcedures = procedures.filter((p) => p.active);
  const proceduresForOptions =
    currentProcedure && !filteredProcedures.find((p) => p.id === currentProcedure.id)
      ? [...filteredProcedures, currentProcedure]
      : filteredProcedures;

  const procedureOptions = proceduresForOptions.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const cloneSourceDisplayName = useMemo(() => {
    const selectedItemData = selectedItem as any;

    if (watchItemType === 'equipment') {
      return (currentEquipment?.name || selectedItemData?.equipment?.name || '').trim();
    }

    if (watchItemType === 'procedure') {
      return (currentProcedure?.name || selectedItemData?.procedure?.name || '').trim();
    }

    const productName = (currentProduct?.name || selectedItemData?.product?.name || '').trim();
    const concentration = (
      currentProduct?.concentration ||
      selectedItemData?.product?.concentration ||
      ''
    ).trim();

    if (!productName) return '';
    return concentration ? `${productName} ${concentration}` : productName;
  }, [watchItemType, currentEquipment, currentProcedure, currentProduct, selectedItem]);

  const cloneSourceDisplayNameLabel = useMemo(() => {
    if (watchItemType === 'equipment') return 'Clonar nome do equipamento';
    if (watchItemType === 'procedure') return 'Clonar nome do procedimento';
    return 'Clonar nome do produto (com concentração)';
  }, [watchItemType]);

  const itemTypeOptions = [
    {
      value: 'medication',
      label: 'Medicamento',
      icon: Pill,
      description: 'Medicamentos e fármacos',
    },
    { value: 'diet', label: 'Dieta', icon: Milk, description: 'Dietas enterais e suplementos' },
    {
      value: 'procedure',
      label: 'Procedimento',
      icon: Bandage,
      description: 'Procedimentos médicos',
    },
    {
      value: 'equipment',
      label: 'Equipamento',
      icon: Stethoscope,
      description: 'Equipamentos médicos',
    },
  ];

  const supplierOptions = useMemo(
    () => [
      { value: '', label: 'Selecione...' },
      { value: 'company', label: 'Empresa' },
      { value: 'family', label: 'Família' },
      { value: 'government', label: 'Governo' },
      { value: 'other', label: 'Outros' },
    ],
    []
  );

  const routeById = useMemo(
    () => new Map(administrationRoutes.map((route) => [route.id, route])),
    [administrationRoutes]
  );

  const supplierLabelByValue = useMemo(
    () => new Map(supplierOptions.map((option) => [option.value, option.label])),
    [supplierOptions]
  );

  const logEntityOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'prescription', label: 'Prescricao' },
    { value: 'prescription_item', label: 'Itens' },
  ];

  const logActionOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'create', label: 'Criação' },
    { value: 'update', label: 'Atualização' },
    { value: 'delete', label: 'Exclusão' },
  ];

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === watchProductId),
    [products, watchProductId]
  );
  const prescriptionUnitSymbol = useMemo(() => {
    const productData = selectedProduct as any;
    // Priorizar symbol da unidade de prescrição, fallback para symbol da unidade base
    const unitSymbol =
      productData?.unit_prescription?.symbol || productData?.unit_stock?.symbol || '';
    return unitSymbol;
  }, [selectedProduct]);

  // Filtered logs based on selected filters
  const filteredLogs = useMemo(() => {
    let filtered = prescriptionLogs;

    if (logEntityFilter !== 'all') {
      filtered = filtered.filter((log) => log.entity === logEntityFilter);
    }

    if (logActionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action === logActionFilter);
    }

    return filtered;
  }, [prescriptionLogs, logEntityFilter, logActionFilter]);

  const frequencyModeOptions = useMemo(
    () => [
      { value: 'every', label: 'A cada' },
      { value: 'times_per', label: 'Vezes por' },
      { value: 'shift', label: 'Turnos' },
    ],
    []
  );

  const frequencyModeLabelByValue = useMemo(
    () => new Map(frequencyModeOptions.map((option) => [option.value, option.label])),
    [frequencyModeOptions]
  );

  // Helper function para mapear tipo de prescrição
  const getPrescriptionTypeInfo = (type: string | null) => {
    switch (type) {
      case 'medical':
        return {
          label: 'Prescrição Médica',
          shortLabel: 'Médica',
          icon: Activity,
          bgColor: 'bg-teal-50 dark:bg-teal-950',
          textColor: 'text-teal-700 dark:text-teal-300',
          borderColor: 'border-teal-200 dark:border-teal-700',
        };
      case 'nursing':
        return {
          label: 'Prescrição de Enfermagem',
          shortLabel: 'Enfermagem',
          icon: UserCheck,
          bgColor: 'bg-pink-50 dark:bg-pink-950',
          textColor: 'text-pink-700 dark:text-pink-300',
          borderColor: 'border-pink-200 dark:border-pink-700',
        };
      case 'nutrition':
        return {
          label: 'Prescrição Nutricional',
          shortLabel: 'Nutrição',
          icon: Milk,
          bgColor: 'bg-amber-50 dark:bg-amber-950',
          textColor: 'text-amber-700 dark:text-amber-300',
          borderColor: 'border-amber-200 dark:border-amber-700',
        };
      default:
        return {
          label: 'Prescrição',
          shortLabel: 'Geral',
          icon: FileText,
          bgColor: 'bg-gray-50 dark:bg-gray-800',
          textColor: 'text-gray-700 dark:text-gray-300',
          borderColor: 'border-gray-200 dark:border-gray-600',
        };
    }
  };

  // Helper function para mapear status da prescrição
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: 'Ativa',
          bgColor: 'bg-green-100 dark:bg-green-900',
          textColor: 'text-green-800 dark:text-green-200',
          dotColor: 'bg-green-500',
        };
      case 'draft':
        return {
          label: 'Rascunho',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          dotColor: 'bg-yellow-500',
        };
      case 'suspended':
        return {
          label: 'Suspensa',
          bgColor: 'bg-orange-100 dark:bg-orange-900',
          textColor: 'text-orange-800 dark:text-orange-200',
          dotColor: 'bg-orange-500',
        };
      case 'finished':
        return {
          label: 'Finalizada',
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          textColor: 'text-gray-800 dark:text-gray-200',
          dotColor: 'bg-gray-500',
        };
      default:
        return {
          label: status,
          bgColor: 'bg-gray-100 dark:bg-gray-800',
          textColor: 'text-gray-800 dark:text-gray-200',
          dotColor: 'bg-gray-500',
        };
    }
  };

  const logFieldLabels = useMemo(
    () => ({
      product_id: 'Produto',
      display_name: 'Nome na prescricao',
      quantity: 'Quantidade',
      route_id: 'Via',
      frequency_mode: 'Frequencia',
      times_value: 'Valor',
      times_unit: 'Unidade',
      interval_minutes: 'Intervalo',
      time_start: 'Hora inicial',
      time_checks: 'Horarios',
      week_days: 'Dias da semana',
      is_prn: 'Se necessario',
      is_continuous_use: 'Uso continuo',
      start_date: 'Data inicio',
      end_date: 'Data fim',
      supplier: 'Fornecedor',
      instructions_use: 'Instrucoes uso',
      instructions_pharmacy: 'Instrucoes farmacia',
      justification: 'Justificativa',
      is_active: 'Ativo',
    }),
    []
  );

  const toggleLogDetails = useCallback((logId: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  }, []);

  const resolveLogItemInfo = useCallback(
    (log: any) => {
      if (log.entity !== 'prescription_item') {
        return {
          product: null as any,
          quantity: null as number | null,
          unitSymbol: '',
          routeLabel: '--',
          frequencyLabel: '--',
        };
      }

      const item = log.entity_id ? itemById.get(log.entity_id) : undefined;
      const preferredData =
        log.action === 'delete'
          ? ((log.old_data as any) ?? (log.new_data as any))
          : ((log.new_data as any) ?? (log.old_data as any));
      const productId = (log.new_data as any)?.product_id || (log.old_data as any)?.product_id;
      const product =
        (productId ? logProductsById.get(productId) : undefined) || item?.product || null;
      const quantity =
        log.action === 'delete'
          ? ((log.old_data as any)?.quantity ?? (log.new_data as any)?.quantity ?? item?.quantity)
          : ((log.new_data as any)?.quantity ?? (log.old_data as any)?.quantity ?? item?.quantity);
      const unitSymbol = product?.unit_prescription?.symbol || product?.unit_stock?.symbol || 'UN';
      const routeId =
        log.action === 'delete'
          ? ((log.old_data as any)?.route_id ?? (log.new_data as any)?.route_id ?? item?.route_id)
          : ((log.new_data as any)?.route_id ?? (log.old_data as any)?.route_id ?? item?.route_id);
      const route = routeId ? routeById.get(routeId) : null;
      const routeLabel = route?.abbreviation || route?.name || '--';
      const frequencyLabel =
        formatFrequencyDisplay({
          frequency_mode: preferredData?.frequency_mode ?? item?.frequency_mode ?? null,
          times_value: preferredData?.times_value ?? item?.times_value ?? null,
          times_unit: preferredData?.times_unit ?? item?.times_unit ?? null,
          time_start: preferredData?.time_start ?? item?.time_start ?? null,
          time_checks: preferredData?.time_checks ?? item?.time_checks ?? null,
          interval_minutes: preferredData?.interval_minutes ?? item?.interval_minutes ?? null,
          frequency_text: preferredData?.frequency_text ?? null,
        }) || '--';

      return {
        product,
        quantity,
        unitSymbol,
        routeLabel,
        frequencyLabel,
      };
    },
    [formatFrequencyDisplay, itemById, logProductsById, routeById]
  );

  const formatLogValue = useCallback(
    (key: string, value: any) => {
      if (value === null || value === undefined || value === '') return '--';

      if (key === 'product_id') {
        const product = logProductsById.get(value);
        if (product) {
          const concentration = product.concentration ? ` ${product.concentration}` : '';
          return `${product.name}${concentration}`;
        }
        return String(value);
      }

      if (key === 'route_id') {
        const route = routeById.get(value);
        return route ? route.name : String(value);
      }

      if (key === 'supplier') {
        return supplierLabelByValue.get(value) || String(value);
      }

      if (key === 'frequency_mode') {
        return frequencyModeLabelByValue.get(value) || String(value);
      }

      if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
      if (Array.isArray(value)) return value.join(', ');
      if (typeof value === 'object') return JSON.stringify(value);

      return String(value);
    },
    [frequencyModeLabelByValue, logProductsById, routeById, supplierLabelByValue]
  );

  const getLogDiffEntries = useCallback(
    (log: any) => {
      if (!log?.old_data && !log?.new_data) return [];

      const diff = buildLogDiff(log.old_data, log.new_data, {
        exclude: ['updated_at', 'created_at', 'company_id', 'id', 'prescription_id'],
      });
      const keys = new Set<string>([
        ...Object.keys(diff.oldData || {}),
        ...Object.keys(diff.newData || {}),
      ]);

      return Array.from(keys).map((key) => ({
        key,
        label: (logFieldLabels as Record<string, string>)[key] || key,
        oldValue: formatLogValue(key, diff.oldData?.[key]),
        newValue: formatLogValue(key, diff.newData?.[key]),
      }));
    },
    [formatLogValue, logFieldLabels]
  );

  const weekDayOptions = [
    { value: 1, label: 'Dom' },
    { value: 2, label: 'Seg' },
    { value: 3, label: 'Ter' },
    { value: 4, label: 'Qua' },
    { value: 5, label: 'Qui' },
    { value: 6, label: 'Sex' },
    { value: 7, label: 'Sab' },
  ];

  // Opções de vias de administração vindas do banco ou fallback para lista padrão
  const routeOptions =
    administrationRoutes.length > 0
      ? administrationRoutes
          .filter((r) => r.active)
          .map((route) => ({
            value: route.id,
            label: route.abbreviation ? `${route.name} (${route.abbreviation})` : route.name,
            description: route.description || undefined,
            sortKey: route.name, // Para ordenação
          }))
          .sort((a, b) => a.sortKey.localeCompare(b.sortKey)) // Ordenação alfabética
      : [];

  // Debug: Log para verificar as opções
  // console.log('Route options:', routeOptions)
  // console.log('Administration routes:', administrationRoutes)

  // Breadcrumb items - sempre declarado antes dos early returns
  const breadcrumbItems = useMemo(
    () => [{ label: 'Prescrições', href: prescriptionsListPath }, { label: 'Detalhes' }],
    [prescriptionsListPath]
  );

  const prescriptionTypeInfo = getPrescriptionTypeInfo((prescription as any)?.type);
  const statusInfo = getStatusInfo(prescription?.status || 'draft');
  const TypeIcon = prescriptionTypeInfo.icon;
  const primaryPayer = (prescription as any)?.patient?.patient_payer?.find(
    (payer: any) => payer?.is_primary
  );
  const patientOperatorName =
    primaryPayer?.client?.name || (prescription as any)?.patient?.billing_client?.name || '';
  const patientOperatorColor =
    primaryPayer?.client?.color || (prescription as any)?.patient?.billing_client?.color || null;

  if (loadingPrescription) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!prescription) {
    return (
      <EmptyState
        title="Prescrição não encontrada"
        description="A prescrição solicitada não existe ou foi removida"
        action={
          <Button
            onClick={() => navigate('/prescricoes')}
            variant="outline"
            icon={<ArrowLeft className="h-4 w-4" />}
            showIcon
            label="Voltar"
          />
        }
      />
    );
  }

  const canTogglePrescriptionStatus =
    prescription.status === 'draft' || prescription.status === 'active';
  const isDraftPrescription = prescription.status === 'draft';
  const statusToggleLabel = isDraftPrescription ? 'Ativar prescrição' : 'Desativar prescrição';
  const StatusToggleIcon = canTogglePrescriptionStatus
    ? isDraftPrescription
      ? Power
      : PowerOff
    : Power;

  return (
    <div className="space-y-6">
      {/* Header com Breadcrumbs */}
      <div className="flex items-center justify-between px-4 lg:px-4">
        <Breadcrumbs items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
      </div>

      {/* Header Principal da Prescrição */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="p-6">
          {/* Grid principal - Informações vs Ações */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Seção de informações principais */}
            <div className="min-w-0 flex-1">
              {/* Linha 1: Paciente + Status */}
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <h1 className="font-display truncate text-2xl font-bold text-gray-900 dark:text-white">
                      {(prescription as any).patient?.name || 'Paciente não identificado'}
                    </h1>{' '}
                    {patientOperatorName && (
                      <ColorBadge color={patientOperatorColor}>{patientOperatorName}</ColorBadge>
                    )}
                  </div>
                  {(prescription as any).patient?.cpf && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      CPF: {(prescription as any).patient.cpf}
                    </p>
                  )}
                </div>

                {/* Status Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${statusInfo.dotColor}`}></div>
                  {statusInfo.label}
                </div>
              </div>

              {/* Linha 2: Profissional, Tipo, Período e Documentos (mesma linha em desktop) */}
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800/50">
                  <div className="rounded-lg bg-white p-2 shadow-sm dark:bg-gray-800">
                    <UserCheck className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Profissional
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {(prescription as any).professional?.name || 'Sem profissional vinculado'}
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-3 rounded-lg border p-3 ${prescriptionTypeInfo.bgColor} ${prescriptionTypeInfo.borderColor}`}
                >
                  <div className={`rounded-lg bg-white p-2 shadow-sm dark:bg-gray-800`}>
                    <TypeIcon className={`h-4 w-4 ${prescriptionTypeInfo.textColor}`} />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-medium ${prescriptionTypeInfo.textColor} opacity-75`}
                    >
                      Tipo de Prescrição
                    </p>
                    <p className={`font-semibold ${prescriptionTypeInfo.textColor}`}>
                      {prescriptionTypeInfo.shortLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800/50">
                  <div className="rounded-lg bg-white p-2 shadow-sm dark:bg-gray-800">
                    <CalendarDays className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Período</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {prescription.start_date
                        ? format(parseDateOnly(prescription.start_date), 'dd/MM/yyyy')
                        : 'Sem data inicial'}
                      {' → '}
                      {prescription.end_date
                        ? format(parseDateOnly(prescription.end_date), 'dd/MM/yyyy')
                        : '-'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800/50">
                  <div className="rounded-lg bg-white p-2 shadow-sm dark:bg-gray-800">
                    <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Documentos Anexos
                    </p>
                    {prescription.attachment_url ? (
                      <a
                        href={prescription.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center gap-1 text-sm font-medium"
                      >
                        <FileDown className="h-3 w-3" />
                        Ver anexo
                      </a>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum anexo</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Seção de ações */}
            <div className="flex flex-col gap-3 lg:w-auto lg:min-w-0">
              <div className="mb-1 hidden text-xs font-medium uppercase tracking-wider text-gray-600 lg:block dark:text-gray-400">
                Ações
              </div>

              <div className="flex flex-row gap-2">
                <Button
                  onClick={() => setIsPrintModalOpen(true)}
                  variant="outline"
                  icon={<Printer className="h-4 w-4" />}
                  showIcon
                  label="Imprimir"
                  dropdownItems={[
                    {
                      label: 'Anexar documento',
                      icon: <FileUp className="h-4 w-4" />,
                      onClick: () => fileInputRef.current?.click(),
                      disabled:
                        uploadAttachment.isPending ||
                        loadingEditPermission ||
                        !hasPrescriptionEditPermission,
                    },
                    {
                      label: 'Alterar período',
                      icon: <CalendarDays className="h-4 w-4" />,
                      onClick: openPeriodModal,
                      disabled: loadingEditPermission || !hasPrescriptionEditPermission,
                    },
                    {
                      label: canTogglePrescriptionStatus
                        ? statusToggleLabel
                        : 'Ativar/Desativar indisponível',
                      icon: <StatusToggleIcon className="h-4 w-4" />,
                      onClick: () => {
                        if (!canTogglePrescriptionStatus) return;
                        void handleStatusChange(isDraftPrescription ? 'active' : 'draft');
                      },
                      disabled: !canTogglePrescriptionStatus || updatePrescription.isPending,
                    },
                  ]}
                  dropdownPortal
                  disabled={!canOpenPrintAction}
                />

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {prescription.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {prescription.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Items, Logs and Print History Tabs */}
      <Card padding="none">
        <div className="border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 pt-6">
            <div className="flex gap-0">
              <TabButton
                active={mainTab === 'items'}
                onClick={() => setMainTab('items')}
                icon={<Menu className="h-4 w-4" />}
                compact
                hoverBorder
              >
                Itens da Prescrição
              </TabButton>
              <TabButton
                active={mainTab === 'printHistory'}
                onClick={() => setMainTab('printHistory')}
                icon={<Printer className="h-4 w-4" />}
                compact
                hoverBorder
              >
                Histórico de Prescrições
              </TabButton>
              <TabButton
                active={mainTab === 'logs'}
                onClick={() => setMainTab('logs')}
                icon={<History className="h-4 w-4" />}
                compact
                hoverBorder
              >
                Logs
              </TabButton>
            </div>

            <div className="-mt-6 flex justify-center">
              <Button onClick={openAddItemModal} size="md" variant="solid" label="Adicionar Item" />
            </div>
          </div>
        </div>

        {/* Items Tab */}
        {mainTab === 'items' && (
          <div className="p-6">
            <DataTable
              data={sortedItems}
              columns={itemColumns}
              isLoading={loadingItems}
              onRowClick={(row) => openEditItemModal(row)}
              emptyState={
                <EmptyState
                  title="Nenhum item na prescrição"
                  description="Adicione medicamentos, materiais, dietas ou equipamentos"
                  action={
                    <Button
                      onClick={openAddItemModal}
                      size="sm"
                      variant="solid"
                      label="Adicionar Item"
                    />
                  }
                />
              }
            />
          </div>
        )}

        {/* Logs Tab */}
        {mainTab === 'logs' && (
          <div className="p-6">
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Entidade:
                  </label>
                  <SearchableSelect
                    value={logEntityFilter}
                    options={logEntityOptions}
                    placeholder="Selecione..."
                    searchPlaceholder="Buscar..."
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLogEntityFilter(
                        e.target.value as 'all' | 'prescription' | 'prescription_item'
                      )
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ação:
                  </label>
                  <SearchableSelect
                    value={logActionFilter}
                    options={logActionOptions}
                    placeholder="Selecione..."
                    searchPlaceholder="Buscar..."
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLogActionFilter(e.target.value as 'all' | 'create' | 'update' | 'delete')
                    }
                  />
                </div>
                {(logEntityFilter !== 'all' || logActionFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLogEntityFilter('all');
                      setLogActionFilter('all');
                    }}
                    showIcon={false}
                    label="Limpar filtros"
                  />
                )}
              </div>

              {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loading />
                </div>
              ) : filteredLogs.length > 0 ? (
                <div className="space-y-3">
                  <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                    Exibindo {filteredLogs.length} de {prescriptionLogs.length} logs
                  </div>
                  {filteredLogs.map((log) => {
                    const logItemInfo = resolveLogItemInfo(log);
                    const productName = logItemInfo.product
                      ? `${logItemInfo.product.name}${logItemInfo.product.concentration ? ` ${logItemInfo.product.concentration}` : ''}`
                      : log.entity === 'prescription'
                        ? log.entity_name || 'Prescricao'
                        : log.entity_name || 'Item da prescricao';
                    const quantityLabel =
                      logItemInfo.quantity !== null && logItemInfo.quantity !== undefined
                        ? `${logItemInfo.quantity} ${logItemInfo.unitSymbol}`
                        : '--';
                    const itemSummaryLabel =
                      log.entity === 'prescription_item'
                        ? `${productName} ${quantityLabel} -- ${logItemInfo.routeLabel} -- ${logItemInfo.frequencyLabel}`
                        : productName;
                    const diffEntries = log.action === 'update' ? getLogDiffEntries(log) : [];
                    const hasDiffEntries = log.action === 'update' && diffEntries.length > 0;
                    const showDiff = expandedLogIds.has(log.id);
                    const showDiffPanel = hasDiffEntries && showDiff;
                    const userName = log.app_user?.name || 'Sistema';
                    const createdAtLabel = new Date(log.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={log.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700"
                      >
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_28px] md:items-center">
                          <div className="flex items-start gap-3">
                            <div
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                log.action === 'create'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : log.action === 'update'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              }`}
                            >
                              {log.action === 'create'
                                ? 'Criação'
                                : log.action === 'update'
                                  ? 'Atualização'
                                  : 'Exclusão'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {itemSummaryLabel}
                                </span>
                                {log.entity === 'prescription_item' && <Badge>Item</Badge>}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                              <CalendarDays className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                              <span>{createdAtLabel}</span>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                              <UserCheck className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                              <span>{userName}</span>
                            </div>
                          </div>
                          <div className="flex w-7 justify-end">
                            <button
                              type="button"
                              aria-label={showDiff ? 'Ocultar alteracoes' : 'Mostrar alteracoes'}
                              title={
                                hasDiffEntries
                                  ? showDiff
                                    ? 'Ocultar alteracoes'
                                    : 'Mostrar alteracoes'
                                  : 'Sem alteracoes'
                              }
                              disabled={!hasDiffEntries}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition dark:text-gray-500 ${
                                hasDiffEntries
                                  ? 'hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300'
                                  : 'cursor-default opacity-35'
                              }`}
                              onClick={hasDiffEntries ? () => toggleLogDetails(log.id) : undefined}
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${
                                  showDiffPanel ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {showDiffPanel && (
                          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-xs dark:border-gray-600 dark:bg-gray-800">
                            <div className="grid grid-cols-3 gap-3 border-b border-gray-200 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400">
                              <span>Campo</span>
                              <span>Antes</span>
                              <span>Depois</span>
                            </div>
                            <div className="mt-2 space-y-2">
                              {diffEntries.map((entry) => (
                                <div key={entry.key} className="grid grid-cols-3 gap-3">
                                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                    {entry.label}
                                  </span>
                                  <span className="text-xs text-gray-500 line-through dark:text-gray-400">
                                    {entry.oldValue}
                                  </span>
                                  <span className="text-xs text-gray-900 dark:text-gray-100">
                                    {entry.newValue}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/30">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                    <History className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {prescriptionLogs.length === 0
                      ? 'Nenhum log encontrado'
                      : 'Nenhum log encontrado para os filtros selecionados'}
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {prescriptionLogs.length === 0
                      ? 'As alterações na prescrição e seus itens aparecerão aqui'
                      : 'Tente alterar os filtros para ver mais logs'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Print History Tab */}
        {mainTab === 'printHistory' && (
          <div className="p-6">
            {loadingPrescriptionPrintHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loading />
              </div>
            ) : (
              <DataTable
                data={prescriptionPrintHistory}
                columns={printHistoryColumns}
                searchKeys={['print_number', 'created_by_name', 'period_start', 'period_end']}
                searchPlaceholder="Buscar por número, usuário ou período..."
                onRowClick={
                  canPrintPrescription ? (row) => handleReprintPrescription(row.id) : undefined
                }
                emptyState={
                  <EmptyState
                    title="Nenhuma prescrição impressa"
                    description="As impressões geradas aparecerão aqui para reimpressão."
                  />
                }
              />
            )}
          </div>
        )}
      </Card>

      {/* Add/Edit Item Modal */}
      <PrescriptionDetailModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        selectedItem={selectedItem}
      >
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-0">
            <TabButton
              active={activeModalTab === 'item'}
              onClick={() => setActiveModalTab('item')}
              compact
              hoverBorder
            >
              Dados do Item
            </TabButton>
            <TabButton
              active={activeModalTab === 'components'}
              onClick={() => setActiveModalTab('components')}
              compact
              hoverBorder
            >
              Componentes de Administração
            </TabButton>
            <TabButton
              active={activeModalTab === 'optionals'}
              onClick={() => setActiveModalTab('optionals')}
              compact
              hoverBorder
            >
              Opcionais
            </TabButton>
          </nav>
        </div>

        <form
          onSubmit={handleSubmit((data) => onSubmitItem(data, { addAnother: false }))}
          className="flex max-h-[70vh] min-h-[550px] flex-col"
          noValidate
        >
          <div className="mt-2 flex-1 space-y-3 overflow-y-auto p-1">
            {/* Tab Content - Dados do Item */}
            {activeModalTab === 'item' && (
              <>
                <Select
                  label="Tipo de Item"
                  options={itemTypeOptions}
                  value={watchItemType}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setValue('item_type', e.target.value as ItemFormData['item_type'])
                  }
                  required
                />

                {watchItemType === 'equipment' ? (
                  <SearchableSelect
                    label="Equipamento"
                    options={equipmentOptions}
                    placeholder="Selecione um equipamento..."
                    searchPlaceholder="Buscar equipamento..."
                    value={watch('equipment_id')}
                    {...register('equipment_id', {
                      required: 'Equipamento é obrigatório',
                    })}
                    error={errors.equipment_id?.message}
                    required
                  />
                ) : watchItemType === 'procedure' ? (
                  <SearchableSelect
                    label="Procedimento"
                    options={procedureOptions}
                    placeholder="Selecione um procedimento..."
                    searchPlaceholder="Buscar procedimento..."
                    value={watch('procedure_id')}
                    {...register('procedure_id', {
                      required: 'Procedimento é obrigatório',
                    })}
                    error={errors.procedure_id?.message}
                    required
                  />
                ) : (
                  <SearchableSelect
                    label="Produto"
                    options={productOptions}
                    placeholder="Selecione um produto..."
                    searchPlaceholder="Buscar por produto ou apresentação..."
                    value={watchProductId}
                    {...productIdField}
                    ref={productIdFieldRef}
                    searchInputRef={productFieldRef}
                    error={errors.product_id?.message}
                    onSearch={(term: string) => setProductSearchTerm(term)}
                    isLoading={productsIsLoading}
                    emptyMessage={
                      debouncedProductSearch.trim() !== ''
                        ? 'Nenhum produto encontrado'
                        : 'Digite para buscar produtos'
                    }
                    required
                  />
                )}

                <div className="flex items-end gap-2">
                  <Input
                    label="Nome na Prescrição"
                    placeholder="Opcional: se vazio, usa o nome do cadastro"
                    maxLength={255}
                    {...register('display_name')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mb-[1px] min-w-0 px-2"
                    disabled={!cloneSourceDisplayName}
                    aria-label={cloneSourceDisplayNameLabel}
                    title={
                      cloneSourceDisplayName
                        ? `${cloneSourceDisplayNameLabel}: copia o nome do cadastro para edição`
                        : 'Selecione um item para habilitar a cópia do nome'
                    }
                    onClick={() =>
                      setValue('display_name', cloneSourceDisplayName, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    <CornerDownLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                {/* Primeira linha: Quantidade + Unidade + Via de administração + Se necessário */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-2">
                    <Input
                      label="Quantidade"
                      type="number"
                      placeholder="--"
                      inputMode="numeric"
                      {...register('quantity', {
                        valueAsNumber: true,
                        min: { value: 0, message: 'Quantidade deve ser maior que 0' },
                      })}
                      error={errors.quantity?.message}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label="Unid."
                      value={prescriptionUnitSymbol}
                      placeholder="--"
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="md:col-span-6">
                    <SearchableSelect
                      label="Via de Administração"
                      options={routeOptions}
                      placeholder={
                        watchItemType === 'medication'
                          ? 'Selecione a via...'
                          : 'Selecione a via (opcional)...'
                      }
                      searchPlaceholder="Buscar via..."
                      value={watch('route_id') || ''}
                      {...register('route_id', {
                        required:
                          watchItemType === 'medication'
                            ? 'Via é obrigatória para medicamentos'
                            : false,
                      })}
                      error={errors.route_id?.message}
                      required={watchItemType === 'medication'}
                    />
                  </div>
                  <div className="mt-0 flex md:col-span-2">
                    <SwitchNew
                      label="Se necessário"
                      labelPosition="above"
                      checked={watchIsPrn || false}
                      onChange={(event) => handleToggleIsPrn(event.target.checked)}
                    />
                  </div>
                </div>

                {/* Segunda linha: Frequência + Horário Inicial (se modo 'every') */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <SearchableSelect
                      label="Modo de Frequência"
                      options={frequencyModeOptions}
                      placeholder="Selecione..."
                      searchPlaceholder="Buscar..."
                      value={watchFrequencyMode}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setValue('frequency_mode', e.target.value as ItemFormData['frequency_mode'])
                      }
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label={watchFrequencyMode === 'every' ? 'A cada' : 'Vezes'}
                      type="number"
                      min={1}
                      step={1}
                      placeholder="--"
                      disabled={watchFrequencyMode === 'shift'}
                      {...register('times_value', {
                        valueAsNumber: true,
                        validate: (value) => {
                          if (!Number.isInteger(value)) {
                            return 'Apenas números inteiros são permitidos';
                          }
                          if (value < 1) {
                            return 'Valor deve ser maior que zero';
                          }
                          if (watchFrequencyMode === 'every' && value === 1) {
                            return 'Para frequência "1", utilize "Vezes por" ao invés de "A cada"';
                          }
                          // Validação especial para modo "every" com unidade "hora"
                          if (watchFrequencyMode === 'every') {
                            const selectedUnit = unitsOfMeasure.find(
                              (u) => u.id === watchTimesUnit
                            );
                            const isHourUnit =
                              selectedUnit &&
                              (normalizeText(selectedUnit.code) === 'h' ||
                                normalizeText(selectedUnit.code) === 'hr' ||
                                normalizeText(selectedUnit.name || '').includes('hora'));

                            if (isHourUnit) {
                              const validHourValues = [2, 3, 4, 6, 8, 12];
                              if (!validHourValues.includes(value)) {
                                return 'Para unidade "hora", valores permitidos: 2, 3, 4, 6, 8, 12';
                              }
                            }
                          }
                          return true;
                        },
                      })}
                      onInput={(e) => {
                        // Remove valores decimais em tempo real
                        const target = e.target as HTMLInputElement;
                        let value = target.value;
                        // Remove caracteres não numéricos exceto o primeiro dígito
                        value = value.replace(/[^\d]/g, '');
                        target.value = value;
                      }}
                    />
                  </div>
                  <div className="md:col-span-4">
                    {watchFrequencyMode === 'shift' ? (
                      <Input label="Unidade" value="Dia" placeholder="--" readOnly disabled />
                    ) : (
                      <SearchableSelect
                        label={watchFrequencyMode === 'times_per' ? 'Por' : 'Unidade'}
                        options={timeUnitOptions}
                        placeholder="Selecione..."
                        searchPlaceholder="Buscar unidade..."
                        value={watchTimesUnit || ''}
                        {...register('times_unit')}
                      />
                    )}
                  </div>
                  {/* Horário Inicial - apenas quando modo for 'every' e NÃO for 'se necessário' */}
                  {watchFrequencyMode === 'every' && !watchIsPrn && (
                    <div className="md:col-span-3">
                      <TimePicker
                        label="Horário Inicial"
                        placeholder="--"
                        value={watch('time_start') || ''}
                        {...register('time_start', {
                          required:
                            watchFrequencyMode === 'every' && !watchIsPrn
                              ? 'Campo obrigatório'
                              : false,
                        })}
                        error={errors.time_start?.message}
                        required={watchFrequencyMode === 'every' && !watchIsPrn}
                      />
                    </div>
                  )}
                </div>

                {/* Mensagem de erro para times_value - linha inteira */}
                {errors.times_value?.message && (
                  <div className="mt-2">
                    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                      <span className="font-medium">Valores permitidos:</span>{' '}
                      {errors.times_value.message}
                    </p>
                  </div>
                )}

                {/* Horários - apenas quando NÃO for "se necessário" */}
                {!watchIsPrn && (
                  <>
                    {watchFrequencyMode === 'times_per' && (
                      <>
                        {shouldShowWeekDays ? (
                          <div className="space-y-2">
                            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                              Dias da Semana{' '}
                              {watchTimesValue ? `(máximo ${watchTimesValue} dias)` : ''}
                              {watchTimesValue && weekDaysSelected.length < watchTimesValue && (
                                <span className="ml-2 text-amber-600 dark:text-amber-400">
                                  - Selecione {watchTimesValue - weekDaysSelected.length} dia
                                  {watchTimesValue - weekDaysSelected.length === 1 ? '' : 's'}{' '}
                                  restante
                                  {watchTimesValue - weekDaysSelected.length === 1 ? '' : 's'}
                                </span>
                              )}
                            </label>
                            <div className="flex flex-wrap items-center gap-3">
                              {weekDayOptions.map((day) => {
                                const isDisabled =
                                  !weekDaysSelected.includes(day.value) &&
                                  !!watchTimesValue &&
                                  weekDaysSelected.length >= watchTimesValue;

                                return (
                                  <div key={day.value} className={isDisabled ? 'opacity-40' : ''}>
                                    <Switch
                                      label={day.label}
                                      checked={weekDaysSelected.includes(day.value)}
                                      onChange={() => toggleWeekDay(day.value)}
                                      disabled={isDisabled}
                                      tabIndex={-1}
                                    />
                                  </div>
                                );
                              })}
                            </div>

                            {/* Campo de horário para modo semana */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                              <TimePicker
                                label="Horário de Aplicação"
                                placeholder="Ex: 09:30"
                                value={weekTimeSelected}
                                onChange={(e: any) => setWeekTimeSelected(e.target.value)}
                                required
                              />
                            </div>
                          </div>
                        ) : (
                          isTimesPerDay && (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                              {timeChecks.map((value, index) => (
                                <TimePicker
                                  key={`time-check-${index}`}
                                  label={`Horário ${index + 1}`}
                                  value={value}
                                  onChange={(e: any) => {
                                    const next = [...timeChecks];
                                    next[index] = e.target.value;
                                    setTimeChecks(next);
                                  }}
                                />
                              ))}
                            </div>
                          )
                        )}
                      </>
                    )}

                    {watchFrequencyMode === 'shift' && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-6">
                          <Switch
                            label="Manhã (M)"
                            checked={selectedShifts.includes('M')}
                            onChange={() => toggleShift('M')}
                          />
                          <Switch
                            label="Tarde (T)"
                            checked={selectedShifts.includes('T')}
                            onChange={() => toggleShift('T')}
                          />
                          <Switch
                            label="Noite (N)"
                            checked={selectedShifts.includes('N')}
                            onChange={() => toggleShift('N')}
                          />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Gerado automaticamente: {selectedShifts.length || 0}x ao dia
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Datas e Uso contínuo na mesma linha */}
                <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
                  <div className="flex md:col-span-2">
                    <div className="justify-left group relative mb-1.5">
                      <SwitchNew
                        label="Uso contínuo"
                        labelPosition="above"
                        checked={isContinuousUse}
                        onChange={(event) =>
                          setValue('is_continuous_use', event.target.checked, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        showStatus
                      />
                    </div>
                  </div>
                  <div className="md:col-span-4">
                    <DatePicker
                      label="Data Inicial"
                      disabled={isContinuousUse}
                      displayMode="compact"
                      placeholder={isContinuousUse ? 'Desativado' : undefined}
                      {...startDateField}
                      value={startDateValue}
                      ref={startDateRef}
                      error={errors.start_date?.message}
                    />
                  </div>
                  <div className="md:col-span-4">
                    <DatePicker
                      label="Data Final"
                      disabled={isContinuousUse}
                      displayMode="compact"
                      placeholder={isContinuousUse ? 'Desativado' : undefined}
                      {...endDateField}
                      value={endDateValue}
                      ref={endDateRef}
                      error={errors.end_date?.message}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Textarea
                    label="Instruções de Uso"
                    placeholder="Como será administrado..."
                    {...register('instructions_use', {
                      validate: (value) =>
                        !watchIsPrn ||
                        (value && value.trim().length > 0) ||
                        'Obrigatório instrução de como usar a medicação',
                    })}
                    error={errors.instructions_use?.message}
                    required={watchIsPrn}
                  />
                  <Textarea
                    label="Instruções para a Farmácia"
                    placeholder="Observações para dispensação..."
                    {...register('instructions_pharmacy')}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Textarea
                    label="Justificativa"
                    placeholder="Justificativa para a prescrição..."
                    {...register('justification')}
                  />
                  <SearchableSelect
                    label="Fornecedor"
                    options={supplierOptions}
                    placeholder="Selecione..."
                    searchPlaceholder="Buscar..."
                    value={watch('supplier') || 'company'}
                    {...register('supplier')}
                  />
                </div>
              </>
            )}

            {/* Tab Content - Componentes de Administração */}
            <PrescriptionDetailModalComponentsTab
              activeModalTab={activeModalTab}
              componentProductOptions={componentProductOptions}
              selectedComponentProductId={selectedComponentProductId}
              setSelectedComponentProductId={setSelectedComponentProductId}
              setComponentProductSearchTerm={setComponentProductSearchTerm}
              componentProductsIsLoading={componentProductsIsLoading}
              debouncedComponentSearch={debouncedComponentSearch}
              selectedComponentQuantity={selectedComponentQuantity}
              setSelectedComponentQuantity={setSelectedComponentQuantity}
              componentProducts={componentProducts}
              localComponents={localComponents}
              setLocalComponents={setLocalComponents}
              selectedItem={selectedItem}
              addComponent={addComponent}
              editingComponentIndex={editingComponentIndex}
              setEditingComponentIndex={setEditingComponentIndex}
              updateComponent={updateComponent}
              deleteComponent={deleteComponent}
            />
            {activeModalTab === 'optionals' && (
              <div className="space-y-4 p-2">
                <Input
                  label="Ordem manual"
                  type="number"
                  min={0}
                  placeholder="Vazio = ordem automatica"
                  {...register('item_order', {
                    setValueAs: (value) => {
                      if (value === '' || value === null || value === undefined) return null;
                      const parsed = Number(value);
                      return Number.isNaN(parsed) ? null : parsed;
                    },
                    min: { value: 0, message: 'Use apenas numeros positivos' },
                  })}
                  error={errors.item_order?.message}
                />

                <div className="space-y-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Atencao
                  </label>
                  <div className="flex items-center">
                    <SwitchNew
                      label="Se necessario (PRN)"
                      checked={watchIsPrn || false}
                      onChange={(event) => handleToggleIsPrn(event.target.checked)}
                      showStatus
                      tabIndex={-1}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Dias da Semana
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {weekDayOptions.map((day) => (
                      <Switch
                        key={day.value}
                        label={day.label}
                        checked={weekDaysSelected.includes(day.value)}
                        onChange={() => toggleWeekDay(day.value)}
                        tabIndex={-1}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <ModalFooter className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <Button
              type="button"
              variant="neutral"
              label="Cancelar"
              showIcon={false}
              onClick={() => setIsItemModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="neutral"
              label="Salvar e Adicionar Outro"
              showIcon={false}
              onClick={() => handleSubmit((data) => onSubmitItem(data, { addAnother: true }))()}
            ></Button>
            <Button
              type="submit"
              label={selectedItem ? 'Salvar' : 'Adicionar'}
              showIcon={false}
            ></Button>
          </ModalFooter>
        </form>
      </PrescriptionDetailModal>

      <PrescriptionDetailAuxModals
        isPeriodModalOpen={isPeriodModalOpen}
        setIsPeriodModalOpen={setIsPeriodModalOpen}
        periodStartDate={periodStartDate}
        setPeriodStartDate={setPeriodStartDate}
        periodEndDate={periodEndDate}
        setPeriodEndDate={setPeriodEndDate}
        periodModalError={periodModalError}
        setPeriodModalError={setPeriodModalError}
        handleSavePeriod={handleSavePeriod}
        updatePrescriptionIsPending={updatePrescription.isPending}
        isDeleteItemModalOpen={isDeleteItemModalOpen}
        setIsDeleteItemModalOpen={setIsDeleteItemModalOpen}
        handleDeleteItem={handleDeleteItem}
        deleteItemIsPending={deleteItem.isPending}
        isSuspendItemModalOpen={isSuspendItemModalOpen}
        setIsSuspendItemModalOpen={setIsSuspendItemModalOpen}
        suspensionEndDate={suspensionEndDate}
        setSuspensionEndDate={setSuspensionEndDate}
        handleSuspendItem={handleSuspendItem}
        suspendItemWithDateIsPending={suspendItemWithDate.isPending}
        isPrintModalOpen={isPrintModalOpen}
        setIsPrintModalOpen={setIsPrintModalOpen}
        setPrintActionInProgress={setPrintActionInProgress}
        canOpenPrintAction={canOpenPrintAction}
        handleGeneratePrescriptionPrint={handleGeneratePrescriptionPrint}
        createPrescriptionPrintIsPending={createPrescriptionPrint.isPending}
        printActionInProgress={printActionInProgress}
      />
    </div>
  );
}
