import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Package, Search, ExternalLink, FunnelX } from 'lucide-react';
import {
  Card,
  Button,
  DataTable,
  ListPagination,
  Modal,
  ModalFooter,
  Input,
  SearchableSelect,
  Badge,
  EmptyState,
  SwitchNew,
  IconButton,
} from '@/components/ui';
import {
  usePresentationsPaginated,
  useCreatePresentation,
  useUpdatePresentation,
  useDeletePresentation,
} from '@/hooks/usePresentations';
import type { PresentationWithRelations } from '@/hooks/usePresentations';
import { useProducts } from '@/hooks/useProducts';
import { useManufacturers, useCreateManufacturer } from '@/hooks/useManufacturers';
import { useUnitsOfMeasure } from '@/hooks/useUnitsOfMeasure';
import { useListPageState } from '@/hooks/useListPageState';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import { useForm } from 'react-hook-form';
import PresentationSearchModal from '@/components/product/PresentationSearchModal';
import type { RefItemUnified } from '@/types/database';

interface PresentationFormData {
  name: string;
  barcode: string;
  conversion_factor: number;
  unit: string;
  product_id: string;
  manufacturer_id: string;
  active: boolean;
}

interface NewManufacturerFormData {
  name: string;
  trade_name: string;
  document: string;
}

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export default function PresentationsPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useListPageState();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data: paginatedData, isLoading } = usePresentationsPaginated(
    currentPage,
    PAGE_SIZE,
    searchTerm
  );

  const presentations = paginatedData?.data ?? [];
  const totalCount = paginatedData?.totalCount ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  const createPresentation = useCreatePresentation();
  const updatePresentation = useUpdatePresentation();
  const deletePresentation = useDeletePresentation();
  const createManufacturer = useCreateManufacturer();

  const { data: products = [] } = useProducts();
  const { data: manufacturers = [] } = useManufacturers();
  const { data: unitsOfMeasure = [] } = useUnitsOfMeasure();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCurrentPage(1);
      setSearchTerm(searchInput);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput, setCurrentPage]);

  const hasActiveSearch = searchTerm.trim().length > 0;

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPresentationSearchModalOpen, setIsPresentationSearchModalOpen] = useState(false);
  const [isNewManufacturerModalOpen, setIsNewManufacturerModalOpen] = useState(false);
  const [selectedPresentation, setSelectedPresentation] =
    useState<PresentationWithRelations | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedManufacturerId, setSelectedManufacturerId] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [refItemData, setRefItemData] = useState<RefItemUnified | null>(null);
  const [suggestedManufacturer, setSuggestedManufacturer] = useState<{
    name: string;
    cnpj: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PresentationFormData>();

  const {
    register: registerNewManufacturer,
    handleSubmit: handleSubmitNewManufacturer,
    reset: resetNewManufacturer,
    formState: { errors: newManufacturerErrors },
  } = useForm<NewManufacturerFormData>();

  const { name: activeName, ref: activeRef, onBlur: activeOnBlur } = register('active');
  const activeValue = watch('active');

  const productOptions = useMemo(
    () => [
      { value: '', label: 'Selecione o produto...' },
      ...products
        .filter((p) => p.active)
        .map((p) => ({
          value: p.id,
          label: p.concentration ? `${p.name} ${p.concentration}` : p.name,
        })),
    ],
    [products]
  );

  const manufacturerOptions = useMemo(
    () => [
      { value: '', label: 'Selecione...' },
      ...manufacturers
        .filter((m) => m.active)
        .map((m) => ({
          value: m.id,
          label: m.trade_name || m.name,
        })),
    ],
    [manufacturers]
  );

  const unitOptions = useMemo(
    () =>
      unitsOfMeasure.map((u) => ({
        value: u.id,
        label: u.symbol ? `${u.name} (${u.symbol})` : u.name,
      })),
    [unitsOfMeasure]
  );

  // Auto-select default unit when product is selected manually (not from reference)
  useEffect(() => {
    if (selectedProductId && !refItemData && !selectedUnit) {
      // Se é um cadastro manual e não tem unidade selecionada, usar Caixa como padrão
      const caixaUnit = unitsOfMeasure.find(
        (u) => u.code.toLowerCase() === 'cx' || u.name.toLowerCase() === 'caixa'
      );
      if (caixaUnit) {
        setSelectedUnit(caixaUnit.id);
        setValue('unit', caixaUnit.id);
      }
    }
  }, [selectedProductId, refItemData, selectedUnit, unitsOfMeasure, setValue]);

  const openCreateModal = () => {
    setSelectedPresentation(null);
    setRefItemData(null);
    setSuggestedManufacturer(null);
    setSelectedProductId('');
    setSelectedManufacturerId('');
    setSelectedUnit('');
    reset({
      name: '',
      barcode: '',
      conversion_factor: 1,
      unit: '',
      product_id: '',
      manufacturer_id: '',
      active: true,
    });
    setIsModalOpen(true);
  };

  const openCreateFromReferenceModal = () => {
    setIsPresentationSearchModalOpen(true);
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

  const handleCreateManufacturer = async (data: NewManufacturerFormData) => {
    const newManufacturer = await createManufacturer.mutateAsync({
      name: data.name,
      trade_name: data.trade_name || null,
      document: data.document || null,
      active: true,
    });
    setSelectedManufacturerId(newManufacturer.id);
    setSuggestedManufacturer(null);
    setIsNewManufacturerModalOpen(false);
  };

  const handleSelectFromReference = (item: RefItemUnified) => {
    setRefItemData(item);
    setIsPresentationSearchModalOpen(false);

    // Determinar a unidade de entrada baseado na unidade do item
    // Se a unidade for "ml", usar "Frasco", senão usar "Caixa"
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

    // Buscar fabricante pelo nome
    let manufacturerId = '';
    if (item.manufacturer) {
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
        cnpj: item.cnpj || '',
      });
    } else {
      setSuggestedManufacturer(null);
    }

    // Converter quantidade para número válido
    const quantidade = item.quantity ? Number(item.quantity) : 1;

    setSelectedProductId('');
    setSelectedManufacturerId(manufacturerId);
    setSelectedUnit(unitId);
    setSelectedPresentation(null);

    reset({
      name: item.name || '',
      barcode: item.ean || '',
      conversion_factor: quantidade > 0 ? quantidade : 1,
      unit: unitId,
      product_id: '',
      manufacturer_id: manufacturerId,
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = useCallback(
    (presentation: PresentationWithRelations) => {
      setSelectedPresentation(presentation);
      setSelectedProductId(presentation.product_id);
      setSelectedManufacturerId(presentation.manufacturer_id || '');
      setSelectedUnit(presentation.unit || '');
      reset({
        name: presentation.name,
        barcode: presentation.barcode || '',
        conversion_factor: presentation.conversion_factor,
        unit: presentation.unit || '',
        product_id: presentation.product_id,
        manufacturer_id: presentation.manufacturer_id || '',
        active: presentation.active ? true : false,
      });
      setIsModalOpen(true);
    },
    [reset]
  );

  const openDeleteModal = (presentation: PresentationWithRelations) => {
    setSelectedPresentation(presentation);
    setIsDeleteModalOpen(true);
  };

  const onSubmit = async (data: PresentationFormData) => {
    const payload = {
      name: data.name,
      barcode: data.barcode || null,
      conversion_factor: data.conversion_factor,
      unit: selectedUnit || null,
      product_id: selectedProductId,
      manufacturer_id: selectedManufacturerId || null,
      active: data.active,
    };

    if (!selectedProductId) {
      return;
    }

    if (selectedPresentation) {
      await updatePresentation.mutateAsync({
        id: selectedPresentation.id,
        ...payload,
      });
    } else {
      await createPresentation.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (selectedPresentation) {
      await deletePresentation.mutateAsync({
        id: selectedPresentation.id,
        productId: selectedPresentation.product_id,
      });
      setIsDeleteModalOpen(false);
    }
  };

  const columns: ColumnDef<PresentationWithRelations>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Apresentação',
        cell: ({ row }) => {
          const name = row.original.name || '';
          const truncatedName = name.length > 80 ? name.substring(0, 80) + '...' : name;

          return (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900 dark:text-white" title={name}>
                  {truncatedName}
                </p>
                {row.original.barcode && (
                  <p className="text-sm text-gray-500">EAN: {row.original.barcode}</p>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'product',
        header: 'Produto',
        cell: ({ row }) => {
          const product = row.original.product;
          if (!product) return <span className="text-gray-400">-</span>;
          return (
            <div>
              <p className="text-gray-700 dark:text-gray-300">{product.name}</p>
              {product.concentration && (
                <p className="text-sm text-gray-500">{product.concentration}</p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'manufacturer',
        header: 'Fabricante',
        cell: ({ row }) => {
          const manufacturer = row.original.manufacturer;
          if (!manufacturer) return <span className="text-gray-400">-</span>;
          return (
            <span className="text-gray-700 dark:text-gray-300">
              {manufacturer.trade_name || manufacturer.name}
            </span>
          );
        },
      },
      {
        accessorKey: 'conversion_factor',
        header: 'Fator Conversão',
        cell: ({ row }) => {
          const presentation = row.original;

          // Busca a unidade da apresentação
          const inputUnit = unitsOfMeasure.find((u) => u.id === presentation.unit);

          // Busca a unidade base usando o array products (mesma lógica do modal)
          const selectedProduct = products.find((p) => p.id === presentation.product_id);
          const unitStock = selectedProduct?.unit_stock as any;
          const outputUnit = unitStock || null;

          const inputSymbol = inputUnit?.symbol || inputUnit?.name || 'UN';
          const outputSymbol = outputUnit?.symbol || outputUnit?.name || 'UN';

          return (
            <Badge variant="warning" className="w-fit gap-1.5 rounded-lg px-2.5 py-1">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                1 {inputSymbol}
              </span>
              <span className="text-xs text-amber-500">=</span>
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                {presentation.conversion_factor} {outputSymbol}
              </span>
            </Badge>
          );
        },
      },
      {
        accessorKey: 'active',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant={row.original.active ? 'success' : 'neutral'}>
            {row.original.active ? 'Ativo' : 'Inativo'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(row.original);
              }}
            >
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                openDeleteModal(row.original);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        ),
      },
    ],
    [unitsOfMeasure, openEditModal, products]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Produtos Apresentação
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button
            icon={<Search className="mr-1 h-4 w-4" />}
            onClick={openCreateFromReferenceModal}
            variant="neutral"
          >
            Buscar nas Tabelas
          </Button>
          <Button onClick={openCreateModal} variant="solid" label="Manual" />
        </div>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          {/* Search */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[60%]">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por nome da apresentação, produto ou EAN..."
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            {hasActiveSearch && (
              <Button
                onClick={handleClearSearch}
                variant="outline"
                size="md"
                showIcon
                icon={<FunnelX className="h-4 w-4" />}
                label=""
                title="Limpar filtros"
                aria-label="Limpar filtros"
                className="w-9 justify-center pr-3"
              />
            )}
          </div>
          <DataTable
            data={presentations}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            onRowClick={openEditModal}
            emptyState={
              <EmptyState
                title={
                  searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma apresentação cadastrada'
                }
                description={
                  searchTerm
                    ? 'Tente uma busca diferente'
                    : 'Comece cadastrando sua primeira apresentação de produto'
                }
                action={
                  !searchTerm && (
                    <div className="flex gap-2">
                      <Button onClick={openCreateFromReferenceModal} size="sm" variant="secondary">
                        <Search className="h-4 w-4" />
                        Buscar nas Tabelas
                      </Button>
                      <Button onClick={openCreateModal} size="sm" variant="solid" label="Manual" />
                    </div>
                  )
                }
              />
            }
          />

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            itemLabel="registros"
            onPreviousPage={() => setCurrentPage((page) => page - 1)}
            onNextPage={() => setCurrentPage((page) => page + 1)}
          />
        </div>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedPresentation ? 'Editar Apresentação' : 'Nova Apresentação'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Info banner when coming from reference tables */}
          {refItemData && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Dados importados das tabelas de referência: <strong>{refItemData.name}</strong>
                {refItemData.substance && (
                  <span className="ml-2">
                    • Substância: <strong>{refItemData.substance}</strong>
                  </span>
                )}
                {refItemData.manufacturer && (
                  <span className="ml-2">
                    • Fabricante: <strong>{refItemData.manufacturer}</strong>
                  </span>
                )}
                {refItemData.ean && (
                  <span className="ml-2">
                    • EAN: <strong>{refItemData.ean}</strong>
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Revise os campos e selecione o produto para vincular esta apresentação.
              </p>
            </div>
          )}

          {/* Produto */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <SearchableSelect
                label="Produto"
                options={productOptions}
                placeholder="Selecione o produto..."
                searchPlaceholder="Buscar produto..."
                value={selectedProductId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const newValue = e.target.value;
                  setSelectedProductId(newValue);
                  setValue('product_id', newValue);
                }}
                error={
                  !selectedProductId && errors.product_id?.message
                    ? 'Produto é obrigatório'
                    : undefined
                }
                required
              />
            </div>
            {selectedProductId && (
              <IconButton
                onClick={() => navigate(`/produtos/${selectedProductId}`)}
                title="Abrir página do produto"
              >
                <ExternalLink className="h-5 w-5" />
              </IconButton>
            )}
          </div>

          {/* Nome da Apresentação */}
          <Input
            label="Nome da Apresentação"
            placeholder="Ex: Caixa 30 comp, Blister 10 comp"
            {...register('name', { required: 'Nome é obrigatório' })}
            error={errors.name?.message}
            required
          />

          {/* Fabricante + EAN */}
          {suggestedManufacturer && !selectedManufacturerId && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
              <p className="mb-2 text-sm text-blue-700 dark:text-blue-300">
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Cadastrar "{suggestedManufacturer.name}"
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SearchableSelect
              label="Fabricante"
              options={manufacturerOptions}
              placeholder="Selecione o fabricante..."
              searchPlaceholder="Buscar fabricante..."
              value={selectedManufacturerId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSelectedManufacturerId(e.target.value)
              }
              onCreateNew={openNewManufacturerModal}
              createNewLabel="Cadastrar novo fabricante"
            />
            <Input
              label="Código de Barras (EAN)"
              placeholder="7891234567890"
              {...register('barcode')}
            />
          </div>

          {/* Conversão de Unidades */}
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
                  value={selectedUnit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const newValue = e.target.value;
                    setSelectedUnit(newValue);
                    setValue('unit', newValue);
                  }}
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
                  min={0.001}
                  step="any"
                  placeholder="30"
                  {...register('conversion_factor', {
                    required: 'Fator é obrigatório',
                    valueAsNumber: true,
                    min: { value: 0.001, message: 'Mínimo: 0.001' },
                  })}
                  error={errors.conversion_factor?.message}
                  required
                />
              </div>

              {/* Unidade Base label */}
              <div className="min-w-[140px] flex-1">
                <Input
                  label="Unidade Base"
                  value={
                    selectedProductId
                      ? (() => {
                          const selectedProduct = products.find((p) => p.id === selectedProductId);
                          const unitStock = selectedProduct?.unit_stock as any;
                          return unitStock
                            ? `${unitStock.name} (${unitStock.symbol})`
                            : '(do produto)';
                        })()
                      : '(do produto)'
                  }
                  disabled
                  className="cursor-not-allowed bg-gray-100 dark:bg-gray-700"
                />
              </div>
            </div>
          </div>

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

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              showIcon={false}
              onClick={() => setIsModalOpen(false)}
              label="Cancelar"
            />
            <Button
              type="submit"
              variant="solid"
              showIcon={false}
              disabled={!selectedProductId}
              label={selectedPresentation ? 'Salvar Alterações' : 'Cadastrar'}
            />
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Apresentação"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir a apresentação{' '}
          <strong className="text-gray-900 dark:text-white">{selectedPresentation?.name}</strong>?
          Esta ação não pode ser desfeita.
        </p>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            showIcon={false}
            onClick={() => setIsDeleteModalOpen(false)}
            label="Cancelar"
          />
          <Button type="button" variant="danger" onClick={handleDelete}>
            Excluir
          </Button>
        </ModalFooter>
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
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Após salvar, o fabricante será selecionado automaticamente no formulário.
            </p>
          </div>

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

      {/* Presentation Search Modal */}
      <PresentationSearchModal
        isOpen={isPresentationSearchModalOpen}
        onClose={() => setIsPresentationSearchModalOpen(false)}
        productId=""
        productName=""
        existingPresentations={[]}
        onSelectItem={handleSelectFromReference}
      />
    </div>
  );
}
