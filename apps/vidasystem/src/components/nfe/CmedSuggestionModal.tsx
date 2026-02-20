import { useState, useEffect, useRef } from 'react';
import { Modal, ModalFooter, Button, Input, SearchableSelect } from '@/components/ui';
import { useCreateProduct } from '@/hooks/useProducts';
import { useCreatePresentation } from '@/hooks/usePresentations';
import { useLinkProductToRefItem, type RefItemWithPrices } from '@/hooks/useReferenceTables';
import { useManufacturers, useCreateManufacturer } from '@/hooks/useManufacturers';
import {
  useSearchActiveIngredients,
  useCreateActiveIngredient,
} from '@/hooks/useActiveIngredients';
import { useUnitsOfMeasure } from '@/hooks/useUnitsOfMeasure';
import type { NfeImportItem, Product } from '@/types/database';
import toast from 'react-hot-toast';
import { Sparkles, CheckCircle, Info } from 'lucide-react';
interface CmedSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  nfeItem: NfeImportItem;
  refItemData: RefItemWithPrices;
  onProductCreated: (product: Product, presentationId: string) => void;
}

export default function CmedSuggestionModal({
  isOpen,
  onClose,
  nfeItem,
  refItemData,
  onProductCreated,
}: CmedSuggestionModalProps) {
  const [productName, setProductName] = useState('');
  const [concentration, setConcentration] = useState('');
  const [presentationName, setPresentationName] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('UN');
  const [selectedManufacturerId, setSelectedManufacturerId] = useState('');
  const [selectedActiveIngredientId, setSelectedActiveIngredientId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeIngredientSearchTerm, setActiveIngredientSearchTerm] = useState('');
  const [isAutoSelectingIngredient, setIsAutoSelectingIngredient] = useState(false);

  // Track if form has been initialized to avoid re-populating user changes
  const formInitializedRef = useRef(false);
  // Track user-selected presentation unit to prevent overwriting
  const userSelectedPresentationUnitRef = useRef<string>('');

  // Presentation fields
  const [conversionFactor, setConversionFactor] = useState('1');
  const [presentationUnit, setPresentationUnit] = useState('UN');

  const createProduct = useCreateProduct();
  const createPresentation = useCreatePresentation();
  const linkProductToRefItem = useLinkProductToRefItem();
  const { data: manufacturers = [] } = useManufacturers();
  const createManufacturer = useCreateManufacturer();
  const { data: activeIngredients = [] } = useSearchActiveIngredients(activeIngredientSearchTerm);
  const createActiveIngredient = useCreateActiveIngredient();
  const { data: unitsOfMeasure = [] } = useUnitsOfMeasure();

  // Extract CMED-specific data from extra_data JSONB
  const extraData = refItemData.extra_data as Record<string, unknown> | null;
  const substancia = extraData?.substancia as string | null;
  const classeTerapeutica = extraData?.classe_terapeutica as string | null;
  const tarja = extraData?.tarja as string | null;
  const registro = extraData?.registro as string | null;
  const apresentacao = extraData?.apresentacao as string | null;
  const cnpj = extraData?.cnpj as string | null;

  // Get prices from current_prices array (ref_price_history)
  const currentPrices = refItemData.current_prices || [];
  const pfPriceData = currentPrices.find((p: any) => p.price_type === 'pf');
  const pmcPriceData = currentPrices.find((p: any) => p.price_type === 'pmc');
  const pfPrice = pfPriceData?.price_value as number | null;
  const pmcPrice = pmcPriceData?.price_value as number | null;
  const pfLabel = (pfPriceData?.price_meta as Record<string, unknown>)?.label as string | null;
  const pmcLabel = (pmcPriceData?.price_meta as Record<string, unknown>)?.label as string | null;

  /**
   * Extract concentration from text (e.g., "5 MG", "500 MG/5ML", "0,5 G")
   */
  const extractConcentration = (text: string): string => {
    if (!text) return '';
    // Match patterns like: "5 MG", "500MG", "0,5 G", "10 ML", "25 MCG", "100 UI", "2,5%"
    const match = text.match(
      /(\d+(?:[,.]\d+)?\s*(?:MG|MCG|G|ML|UI|%|MG\/ML|MG\/5ML|MG\/G)[A-Z/0-9]*)/i
    );
    return match ? match[1].replace(',', '.').trim() : '';
  };

  /**
   * Identify unit from presentation text
   */
  const identifyUnit = (text: string): string => {
    if (!text) return 'UN';
    const upperText = text.toUpperCase();

    // Check for common unit patterns
    // Use (?:\b|\d) to match word boundary OR preceded by digit (e.g., "20ENV")
    if (/(?:\b|\d)(?:COM|COMPRIMIDO|COMP|CPR|DRG|DRÁGEA|DRAGEA)\b/.test(upperText)) return 'CP';
    if (/(?:\b|\d)(?:CAP|CÁPS|CAPS|CAPSULA|CÁPSULA)\b/.test(upperText)) return 'CP';
    if (/(?:\b|\d)(?:FLAC|FLACONETE)\b/.test(upperText)) return 'FLD';
    if (/(?:\b|\d)(?:ENV|ENVELOPE|SACHÊ|SACHE)\b/.test(upperText)) return 'ENV';
    if (/(?:\b|\d)(?:FR|FRASCO|FRS)\b/.test(upperText)) return 'FR';
    if (/(?:\b|\d)(?:AMP|AMPOLA)\b/.test(upperText)) return 'AMP';
    if (/(?:\b|\d)(?:BG|BISNAGA)\b/.test(upperText)) return 'BG';
    if (/(?:\b|\d)(?:TB|TUBO)\b/.test(upperText)) return 'TB';
    if (/(?:\b|\d)(?:FA|FAMP)\b|FRASCO.?AMP/.test(upperText)) return 'FA';
    if (/(?:\b|\d)(?:SER|SERINGA)\b/.test(upperText)) return 'SER';
    if (/(?:\b|\d)(?:SOL|SOLUÇÃO|SOLUCAO|SUSPENSÃO|SUSPENSAO|SUSP)\b/.test(upperText)) return 'FR';
    if (/(?:\b|\d)(?:POM|POMADA|CREME|GEL)\b/.test(upperText)) return 'TB';
    if (/(?:\b|\d)(?:XPE|XAROPE)\b/.test(upperText)) return 'FR';
    if (/(?:\b|\d)(?:SUP|SUPOSITÓRIO|SUPOSITORIO)\b/.test(upperText)) return 'UN';
    if (/(?:\b|\d)(?:OV|ÓVULO|OVULO)\b/.test(upperText)) return 'UN';
    if (/(?:\b|\d)(?:PÓ|PO)\b/.test(upperText)) return 'ENV';
    if (/(?:\b|\d)(?:CT|CARTELA)\b/.test(upperText)) return 'CT';
    if (/(?:\b|\d)(?:BL|BLISTER)\b/.test(upperText)) return 'UN';

    return 'UN';
  };

  /**
   * Extract conversion factor from NFe item description
   * Examples:
   * - "BISALAX/BISACODIL 5MG 20DRG UNIA" → 20
   * - "ZOLPIDEM 10MG 30CPR B1" → 30
   * - "SUCRAFILM 2GR 20FLAC 10ML EMS" → 20
   * - "MUVINLAX 20ENV LIBB" → 20
   * - "MONURIL 2ENV 8G" → 2
   * - "REDOXON GTS 20ML BAYE" → 1 (volume only, no count)
   */
  const extractConversionFactor = (text: string): string => {
    if (!text) return '1';
    const upperText = text.toUpperCase();

    // Pattern to match quantity + unit abbreviation (count units, not volume/weight)
    // Captures: 20DRG, 30CPR, 20FLAC, 20ENV, 28CPR, 2ENV, etc.
    // Does NOT capture: 10ML, 20ML, 5MG, 500UI, 2GR, 8G, 4%
    const countUnitPattern =
      /(\d+)\s*(DRG|DRÁGEAS?|DRAGEAS?|CPR|CP|COMP|COMPRIMIDOS?|CAP|CAPS|CÁPSULAS?|CAPSULAS?|FLAC|FLACONETES?|ENV|ENVELOPES?|AMP|AMPOLAS?|SER|SERINGAS?|TB|TUBOS?|BG|BISNAGAS?|SACHES?|SACHÊS?|ÓVULOS?|OVULOS?|SUPOSITÓRIOS?|SUPOSITORIOS?|ADESIVOS?)\b/gi;

    // Find all matches
    const matches = [...upperText.matchAll(countUnitPattern)];

    if (matches.length > 0) {
      // Return the first valid match
      const num = parseInt(matches[0][1], 10);
      if (num > 0 && num <= 1000) {
        return num.toString();
      }
    }

    return '1';
  };

  // Pre-fill form with ref_item data when modal opens
  useEffect(() => {
    if (isOpen && refItemData) {
      // Only initialize on first open
      if (formInitializedRef.current) {
        return;
      }

      formInitializedRef.current = true;

      // Use product_name from ref_item
      const productNameToUse =
        refItemData.product_name || substancia || nfeItem.raw_description || '';
      setProductName(productNameToUse);

      // Use concentration from ref_item or extract from presentation
      const extractedConcentration =
        refItemData.concentration || extractConcentration(refItemData.presentation || '');
      setConcentration(extractedConcentration);

      // Use presentation from ref_item
      setPresentationName(
        refItemData.presentation || apresentacao || nfeItem.raw_description || ''
      );

      // Try to find manufacturer by CNPJ first, then by name
      const manufacturerCnpj =
        cnpj?.replace(/\D/g, '') || refItemData.manufacturer_code?.replace(/\D/g, '') || '';
      const manufacturerName = refItemData.manufacturer_name?.toUpperCase() || '';

      let existingManufacturer = null;

      // First try to match by CNPJ (document field)
      if (manufacturerCnpj) {
        existingManufacturer = manufacturers.find(
          (m) => m.document?.replace(/\D/g, '') === manufacturerCnpj
        );
      }

      // If not found by CNPJ, try by name
      if (!existingManufacturer && manufacturerName) {
        existingManufacturer = manufacturers.find(
          (m) =>
            m.name.toUpperCase().includes(manufacturerName) ||
            manufacturerName.includes(m.name.toUpperCase())
        );
      }

      setSelectedManufacturerId(existingManufacturer?.id || '');

      // Suggest active ingredient by substance name (user can edit or confirm)
      if (substancia) {
        // Always set search term to help user find it, allowing them to edit
        setActiveIngredientSearchTerm(substancia);
        // Enable auto-selection mode for initial fill
        setIsAutoSelectingIngredient(true);
      } else {
        setSelectedActiveIngredientId('');
      }

      // Identify unit from ref_item or apresentacao or NFe description
      const unitSource = nfeItem.raw_description || refItemData.presentation || apresentacao || '';
      const identifiedUnit =
        refItemData.entry_unit || refItemData.base_unit || identifyUnit(unitSource);
      // Check if unit exists in available units
      const unitExists = unitsOfMeasure.some((u) => u.code === identifiedUnit);
      setSelectedUnit(unitExists ? identifiedUnit : 'UN');

      // Extract conversion factor - não usar quantity do ref_item pois sempre está incorreta
      const nfeDesc = nfeItem.raw_description || '';
      const cmedDesc = refItemData.presentation || apresentacao || '';
      const extractedFactor =
        extractConversionFactor(nfeDesc) !== '1'
          ? extractConversionFactor(nfeDesc)
          : extractConversionFactor(cmedDesc);

      // If conversion factor > 1, the entry unit should be CX (box containing multiple base units)
      // Otherwise use the identified unit
      if (parseFloat(extractedFactor) > 1) {
        setPresentationUnit('CX');
      } else {
        setPresentationUnit(unitExists ? identifiedUnit : 'UN');
      }
      setConversionFactor(extractedFactor);
    } else {
      // Reset flag when modal closes
      formInitializedRef.current = false;
      setIsAutoSelectingIngredient(false);
      userSelectedPresentationUnitRef.current = '';
    }
  }, [isOpen, refItemData, nfeItem, manufacturers, unitsOfMeasure, substancia, apresentacao, cnpj]);

  // Pre-select active ingredient once search results come back (only during initial fill)
  useEffect(() => {
    // Only auto-select if we're in initial fill mode and have search term
    if (isAutoSelectingIngredient && activeIngredientSearchTerm && activeIngredients.length > 0) {
      const searchTerm = activeIngredientSearchTerm.toUpperCase().trim();
      const existingActiveIngredient = activeIngredients.find(
        (ai) =>
          ai.name.toUpperCase() === searchTerm ||
          searchTerm.includes(ai.name.toUpperCase()) ||
          ai.name.toUpperCase().includes(searchTerm)
      );
      if (existingActiveIngredient && selectedActiveIngredientId !== existingActiveIngredient.id) {
        setSelectedActiveIngredientId(existingActiveIngredient.id);
        // Disable auto-select after first selection to allow user to search freely
        setIsAutoSelectingIngredient(false);
      }
    }
  }, [
    activeIngredients,
    activeIngredientSearchTerm,
    isAutoSelectingIngredient,
    selectedActiveIngredientId,
  ]);

  const handleCreateFromCmed = async () => {
    if (!productName.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }

    if (!selectedManufacturerId && !refItemData.manufacturer_name) {
      toast.error('Fabricante é obrigatório');
      return;
    }

    setIsCreating(true);

    try {
      // 1. Create manufacturer if not exists and ref_item has manufacturer info
      let manufacturerId = selectedManufacturerId;
      if (!manufacturerId && refItemData.manufacturer_name) {
        const newManufacturer = await createManufacturer.mutateAsync({
          name: refItemData.manufacturer_name,
          trade_name: null,
          document: cnpj || refItemData.manufacturer_code || null,
          active: true,
        });
        manufacturerId = newManufacturer.id;
      }

      // 2. Create active ingredient if not exists and has substance info
      let activeIngredientId = selectedActiveIngredientId;
      if (!activeIngredientId && substancia) {
        const newActiveIngredient = await createActiveIngredient.mutateAsync({
          name: substancia,
          description: classeTerapeutica || null,
          therapeutic_class: classeTerapeutica || null,
          active: true,
        });
        activeIngredientId = newActiveIngredient.id;
      }

      // 3. Create the product
      // Don't use code if it might be duplicate - let it be null to avoid constraint violation
      // The code is optional and can be added later if needed
      const productCode = null; // Always set to null to avoid "duplicate key value violates unique constraint" error

      // Find unit ID from code
      const unitForProduct = unitsOfMeasure.find((u) => u.code === selectedUnit);

      const newProduct = await createProduct.mutateAsync({
        name: productName.trim(),
        description: `${classeTerapeutica || ''} - ${tarja || ''}`.trim() || null,
        unit_stock_id: unitForProduct?.id || null,
        item_type: 'medication',
        active_ingredient_id: activeIngredientId || null,
        concentration: concentration || null,
        active: true,
        code: productCode,
      });

      // 4. Create presentation with EAN
      const ean = nfeItem.ean || refItemData.ean;

      // Use the unit that user selected (tracked in ref), not the state which might have been reset by effects
      const unitForPresentation = userSelectedPresentationUnitRef.current || presentationUnit;

      const newPresentation = await createPresentation.mutateAsync({
        product_id: newProduct.id,
        name: presentationName.trim() || productName.trim(),
        barcode: ean || null,
        unit: unitForPresentation,
        conversion_factor: parseFloat(conversionFactor) || 1,
        manufacturer_id: manufacturerId || null,
      });

      // 5. Link product to ref_item for price tracking
      await linkProductToRefItem.mutateAsync({
        productId: newProduct.id,
        refItemId: refItemData.id,
        sourceId: refItemData.source?.id || refItemData.source_id,
        isPrimary: true,
        conversionFactor: 1,
        notes: `Criado automaticamente via importação NFe - ${refItemData.source?.name || 'CMED'}`,
      });

      toast.success('Produto cadastrado com sucesso via tabela de referência!');
      onProductCreated(newProduct, newPresentation.id);
      onClose();
    } catch (error) {
      console.error('Error creating product from ref_item:', error);
      toast.error('Erro ao cadastrar produto');
    } finally {
      setIsCreating(false);
    }
  };

  const unitOptions = unitsOfMeasure.map((u) => ({
    value: u.code,
    label: `${u.name} (${u.code})`,
  }));

  const manufacturerOptions = [
    { value: '', label: 'Selecione ou crie novo...' },
    ...manufacturers
      .filter((m) => m.active)
      .map((m) => ({
        value: m.id,
        label: m.trade_name ? `${m.name} (${m.trade_name})` : m.name,
      })),
  ];

  const activeIngredientOptions = [
    { value: '', label: 'Selecione ou crie novo...' },
    ...activeIngredients
      .filter((ai) => ai.active)
      .map((ai) => ({
        value: ai.id,
        label: ai.name,
      })),
  ];

  const formatPrice = (value: number | null | undefined) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sugestão de Cadastro - CMED" size="2xl">
      <div className="space-y-4">
        {/* Banner de sugestão */}
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-6 w-6 flex-shrink-0 text-purple-500" />
            <div>
              <h3 className="font-medium text-purple-900 dark:text-purple-100">
                Produto encontrado na tabela {refItemData.source?.name || 'de referência'}!
              </h3>
              <p className="mt-1 text-sm text-purple-700 dark:text-purple-300">
                Código EAN <strong>{nfeItem.ean}</strong>. Você pode criar o produto automaticamente
                com os dados oficiais.
              </p>
            </div>
          </div>
        </div>

        {/* Dados do item de referência */}
        <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
          <div className="flex justify-between gap-4">
            <span className="flex-shrink-0 text-gray-500">Produto:</span>
            <span className="text-right font-medium text-gray-900 dark:text-white">
              {refItemData.product_name || '-'}
            </span>
          </div>
          {refItemData.presentation && (
            <div className="flex justify-between gap-4">
              <span className="flex-shrink-0 text-gray-500">Apresentação:</span>
              <span className="text-right font-medium text-gray-900 dark:text-white">
                {refItemData.presentation}
              </span>
            </div>
          )}
          {refItemData.concentration && (
            <div className="flex justify-between gap-4">
              <span className="flex-shrink-0 text-gray-500">Concentração:</span>
              <span className="text-right font-medium text-gray-900 dark:text-white">
                {refItemData.concentration}
              </span>
            </div>
          )}
          {substancia && (
            <div className="flex justify-between gap-4">
              <span className="flex-shrink-0 text-gray-500">Substância:</span>
              <span className="text-right font-medium text-gray-900 dark:text-white">
                {substancia}
              </span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="flex-shrink-0 text-gray-500">Fabricante:</span>
            <span className="text-right font-medium text-gray-900 dark:text-white">
              {refItemData.manufacturer_name || '-'}
            </span>
          </div>
          {registro && (
            <div className="flex justify-between gap-4">
              <span className="flex-shrink-0 text-gray-500">Registro ANVISA:</span>
              <span className="text-right font-medium text-gray-900 dark:text-white">
                {registro}
              </span>
            </div>
          )}
          {classeTerapeutica && (
            <div className="flex justify-between gap-4">
              <span className="flex-shrink-0 text-gray-500">Classe Terapêutica:</span>
              <span className="text-right font-medium text-gray-900 dark:text-white">
                {classeTerapeutica}
              </span>
            </div>
          )}
          {pfPrice != null && (
            <div className="flex justify-between gap-4">
              <span className="flex-shrink-0 text-gray-500">
                Preço Fábrica ({pfLabel || 'PF'}):
              </span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatPrice(pfPrice)}
              </span>
            </div>
          )}
          {pmcPrice != null && (
            <div className="flex justify-between gap-4">
              <span className="flex-shrink-0 text-gray-500">
                Preço Máx. Consumidor ({pmcLabel || 'PMC'}):
              </span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {formatPrice(pmcPrice)}
              </span>
            </div>
          )}
          {pfPrice == null && pmcPrice == null && (
            <p className="py-2 text-center text-gray-500">Preços não disponíveis</p>
          )}
        </div>

        {/* Formulário de edição */}
        <div className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
          {/* Linha 1: Nome do Produto (10) + Concentração (6) + Unidade Base (8) */}
          <div className="grid-cols-24 grid gap-3">
            <div className="col-span-24 md:col-span-10">
              <Input
                label="Nome do Produto"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Nome do medicamento"
                required
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <Input
                label="Concentração"
                value={concentration}
                onChange={(e) => setConcentration(e.target.value)}
                placeholder="Ex: 25mg"
              />
            </div>
            <div className="col-span-12 md:col-span-8">
              <SearchableSelect
                label="Unidade Base"
                options={unitOptions}
                value={selectedUnit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSelectedUnit(e.target.value)
                }
                placeholder="Selecione..."
                searchPlaceholder="Buscar..."
              />
            </div>
          </div>

          {/* Linha 2: Fabricante (12) + Princípio Ativo (12) */}
          <div className="grid-cols-24 grid gap-3">
            <div className="col-span-24 md:col-span-12">
              <SearchableSelect
                label="Fabricante"
                options={manufacturerOptions}
                value={selectedManufacturerId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSelectedManufacturerId(e.target.value)
                }
                placeholder="Selecione..."
                searchPlaceholder="Buscar fabricante..."
                required
                emptyMessage={
                  refItemData.manufacturer_name
                    ? `Será criado: ${refItemData.manufacturer_name}`
                    : 'Nenhum fabricante encontrado'
                }
              />
            </div>
            <div className="col-span-24 md:col-span-12">
              <SearchableSelect
                label="Princípio Ativo"
                options={activeIngredientOptions}
                value={selectedActiveIngredientId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const newValue = e.target.value;
                  setSelectedActiveIngredientId(newValue);
                }}
                onSearch={(term: string) => setActiveIngredientSearchTerm(term)}
                placeholder="Selecione..."
                searchPlaceholder="Buscar princípio ativo..."
                emptyMessage={
                  substancia ? `Será criado: ${substancia}` : 'Nenhum princípio ativo encontrado'
                }
              />
            </div>
          </div>

          {/* Linha 3: Apresentação (14) + Fator Conversão (4) + Unidade Entrada (6) */}
          <div className="grid-cols-24 grid gap-3">
            <div className="col-span-24 md:col-span-13">
              <Input
                label="Apresentação (EAN)"
                value={presentationName}
                onChange={(e) => setPresentationName(e.target.value)}
                placeholder="Descrição da apresentação"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="w-full">
                <div className="mb-1.5 flex items-center gap-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fator Conversão
                  </label>
                  <div className="group relative">
                    <Info className="h-4 w-4 cursor-help text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    <div className="border-primary-500 pointer-events-none invisible absolute bottom-full right-0 z-50 mb-2 w-48 rounded-lg border bg-gray-900 p-2 text-xs text-white group-hover:visible dark:bg-gray-800">
                      Quantidade de unidades base que em uma unidade de entrada. Ex: 1 cx = 20 cp
                      (fator 20)
                      <div className="absolute right-2 top-full h-0 w-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={conversionFactor}
                  onChange={(e) => setConversionFactor(e.target.value)}
                  placeholder="1"
                  className="input-field"
                />
              </div>
            </div>
            <div className="col-span-12 md:col-span-7">
              <SearchableSelect
                label="Unidade Entrada"
                options={unitOptions}
                value={parseFloat(conversionFactor) > 1 ? 'CX' : presentationUnit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const newUnit = e.target.value;
                  setPresentationUnit(newUnit);
                  // Track user-selected unit
                  userSelectedPresentationUnitRef.current = newUnit;
                }}
                placeholder="Selecione..."
                searchPlaceholder="Buscar..."
              />
            </div>
          </div>
        </div>

        <ModalFooter>
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
              <span>
                O produto será automaticamente vinculado à tabela{' '}
                {refItemData.source?.name || 'de referência'} para acompanhamento de preços.
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="neutral" onClick={onClose} showIcon={false}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleCreateFromCmed} isLoading={isCreating}>
                <Sparkles className="h-5 w-5" />
                Cadastrar Produto
              </Button>
            </div>
          </div>
        </ModalFooter>
      </div>
    </Modal>
  );
}
