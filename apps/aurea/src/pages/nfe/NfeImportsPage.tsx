import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  Button,
  DataTable,
  Modal,
  ModalFooter,
  StatusBadge,
  EmptyState,
  Loading,
  DatePicker,
  SearchableSelect,
  Badge,
  IconButton,
} from '@/components/ui';
import {
  useNfeImports,
  useNfeStats,
  useDeleteNfeImport,
  useImportNfeFromXml,
  type NfeImportWithStats,
} from '@/hooks/useNfeImport';
import { useSuppliers } from '@/hooks/useSuppliers';
import type { NfeImport } from '@/types/database';
import { formatDateOnly, parseDateOnlyOrNull } from '@/lib/dateOnly';
import {
  FileText,
  Upload,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Trash2,
  AlertCircle,
  Filter,
  Search,
  X,
  Link,
} from 'lucide-react';
export default function NfeImportsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: imports = [], isLoading } = useNfeImports();
  const { data: stats } = useNfeStats();
  const { data: suppliers = [] } = useSuppliers();

  const deleteNfe = useDeleteNfeImport();
  const importNfe = useImportNfeFromXml();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedNfe, setSelectedNfe] = useState<NfeImport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Filtros
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    setSearchFilter((prev) => prev.trim());
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const openImportModal = () => {
    setImportError(null);
    setIsImportModalOpen(true);
  };

  const openDeleteModal = (nfe: NfeImport) => {
    setSelectedNfe(nfe);
    setIsDeleteModalOpen(true);
  };

  const handleXmlImport = async (file: File) => {
    try {
      setImportError(null);
      const result = await importNfe.mutateAsync(file);
      setIsImportModalOpen(false);
      // Navigate to detail page to map items
      navigate(`/nfe/${result.nfe.id}`);
    } catch (error: any) {
      setImportError(error.message || 'Erro ao importar XML');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleXmlImport(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.xml')) {
      handleXmlImport(file);
    } else {
      setImportError('Por favor, selecione um arquivo XML válido');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Filtragem de NFes
  const filteredImports = useMemo(() => {
    return imports.filter((nfe) => {
      // Filtro de busca (número ou emitente)
      if (searchFilter) {
        const search = searchFilter.toLowerCase();
        const numberMatch = nfe.number?.toLowerCase().includes(search);
        const issuerMatch = nfe.issuer_name?.toLowerCase().includes(search);
        if (!numberMatch && !issuerMatch) return false;
      }

      // Filtro por status
      if (statusFilter && nfe.status !== statusFilter) return false;

      // Filtro por fornecedor
      if (supplierFilter && (nfe as any).supplier_id !== supplierFilter) return false;

      // Filtro por data de início
      if (startDateFilter && nfe.issued_at) {
        const nfeDate = parseDateOnlyOrNull(nfe.issued_at);
        const startDate = parseDateOnlyOrNull(startDateFilter);
        if (nfeDate && startDate && nfeDate < startDate) return false;
      }

      // Filtro por data de fim
      if (endDateFilter && nfe.issued_at) {
        const nfeDate = parseDateOnlyOrNull(nfe.issued_at);
        const endDate = parseDateOnlyOrNull(endDateFilter);
        if (nfeDate && endDate && nfeDate > endDate) return false;
      }

      return true;
    });
  }, [imports, searchFilter, statusFilter, supplierFilter, startDateFilter, endDateFilter]);

  const clearFilters = () => {
    setSearchFilter('');
    setStatusFilter('');
    setSupplierFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const hasActiveFilters =
    searchFilter || statusFilter || supplierFilter || startDateFilter || endDateFilter;

  const handleDelete = async () => {
    if (selectedNfe) {
      await deleteNfe.mutateAsync(selectedNfe.id);
      setIsDeleteModalOpen(false);
    }
  };

  // Função para formatar CNPJ
  const formatCnpj = (cnpj?: string | null) => {
    if (!cnpj) return '-';
    const numbers = cnpj.replace(/\D/g, '');
    if (numbers.length === 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };

  const columns: ColumnDef<NfeImportWithStats>[] = useMemo(
    () => [
      {
        accessorKey: 'number',
        header: 'Número',
        cell: ({ row }) => (
          <p className="font-medium text-gray-900 dark:text-white">
            NFe {row.original.number || '-'}
          </p>
        ),
      },
      {
        accessorKey: 'issued_at',
        header: 'Emissão',
        cell: ({ row }) => (
          <span className="text-gray-700 dark:text-gray-300">
            {row.original.issued_at ? formatDateOnly(row.original.issued_at) : '-'}
          </span>
        ),
      },
      {
        accessorKey: 'issuer_name',
        header: 'Emitente / Fornecedor',
        cell: ({ row }) => (
          <div>
            <p className="text-gray-900 dark:text-white">{row.original.issuer_name || '-'}</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">
                CNPJ: {formatCnpj(row.original.issuer_document)}
              </p>
              {(row.original as any).supplier_id && (
                <Link
                  className="h-4 w-4 text-green-600 dark:text-green-400"
                  aria-label="Fornecedor vinculado"
                />
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'total_value',
        header: 'Valor Total',
        cell: ({ row }) => (
          <span className="font-medium text-gray-900 dark:text-white">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(row.original.total_value || 0)}
          </span>
        ),
      },
      {
        accessorKey: 'mapping_status',
        header: 'Mapeamento',
        cell: ({ row }) => {
          const totalItems = row.original.total_items || 0;
          const mappedItems = row.original.mapped_items || 0;
          const percentage = totalItems > 0 ? (mappedItems / totalItems) * 100 : 0;

          let badgeVariant: 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';
          if (totalItems === 0) {
            badgeVariant = 'neutral';
          } else if (percentage === 100) {
            badgeVariant = 'success';
          } else if (percentage >= 50) {
            badgeVariant = 'warning';
          } else {
            badgeVariant = 'danger';
          }

          return (
            <div className="flex items-center gap-2">
              <span className="text-md font-mono font-medium text-gray-700 dark:text-gray-300">
                {String(mappedItems).padStart(2, '0')}/{String(totalItems).padStart(2, '0')}
              </span>
              <Badge variant={badgeVariant}>
                {totalItems === 0 ? '0 itens' : `${percentage.toFixed(0)}%`}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'created_at',
        header: 'Importado em',
        cell: ({ row }) => (
          <span className="text-gray-500">
            {row.original.created_at
              ? format(new Date(row.original.created_at), 'dd/MM/yyyy HH:mm')
              : '-'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <IconButton onClick={() => navigate(`/nfe/${row.original.id}`)}>
              <Eye className="h-5 w-5" />
            </IconButton>
            <IconButton variant="danger" onClick={() => openDeleteModal(row.original)}>
              <Trash2 className="h-5 w-5" />
            </IconButton>
            {hasActiveFilters && (
              <Button variant="neutral" onClick={clearFilters}>
                Limpar
              </Button>
            )}
          </div>
        ),
      },
    ],
    [navigate, hasActiveFilters]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Importação de NFe
          </h1>
        </div>
        <Button onClick={openImportModal}>
          <Upload className="h-5 w-5" />
          Importar XML
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900/30">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de NFes</p>
              <p className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.total || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-xl bg-yellow-100 p-3 dark:bg-yellow-900/30">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pendentes</p>
              <p className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.pending || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-xl bg-green-100 p-3 dark:bg-green-900/30">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Processadas</p>
              <p className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.processed || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="rounded-xl bg-purple-100 p-3 dark:bg-purple-900/30">
              <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Valor Processado</p>
              <p className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  notation: 'compact',
                }).format(stats?.totalValue || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          {/* Barra de pesquisa e botão de filtros */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número ou emitente..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <Button variant="neutral" onClick={handleSearch}>
              Buscar
            </Button>
            <Button
              variant="filter"
              active={Boolean(showFilters || hasActiveFilters)}
              onClick={() => setShowFilters(!showFilters)}
              icon={<Filter className="h-5 w-5" />}
              count={
                [searchFilter, statusFilter, supplierFilter, startDateFilter, endDateFilter].filter(
                  Boolean
                ).length
              }
            />
            {hasActiveFilters && (
              <Button variant="neutral" onClick={clearFilters}>
                Limpar
              </Button>
            )}
          </div>

          {/* Painel de filtros */}
          {showFilters && (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Filtro por Status */}
                <SearchableSelect
                  label="Status"
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'importada', label: 'Importada' },
                    { value: 'pendente', label: 'Pendente' },
                    { value: 'lancada', label: 'Lançada' },
                    { value: 'error', label: 'Erro' },
                  ]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar status..."
                  value={statusFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setStatusFilter(e.target.value)
                  }
                />

                {/* Filtro por Fornecedor */}
                <SearchableSelect
                  label="Fornecedor"
                  options={[
                    { value: '', label: 'Todos' },
                    ...suppliers
                      .filter((s) => s.active)
                      .map((s) => ({
                        value: s.id,
                        label: s.name,
                      })),
                  ]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar fornecedor..."
                  value={supplierFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSupplierFilter(e.target.value)
                  }
                />

                {/* Filtro por Data Inicial */}
                <DatePicker
                  label="Data Inicial"
                  value={startDateFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setStartDateFilter(e.target.value)
                  }
                />

                {/* Filtro por Data Final */}
                <DatePicker
                  label="Data Final"
                  value={endDateFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEndDateFilter(e.target.value)
                  }
                />
              </div>
            </div>
          )}

          <DataTable
            data={filteredImports}
            columns={columns}
            isLoading={isLoading}
            emptyState={
              hasActiveFilters ? (
                <EmptyState
                  icon={<Filter className="h-12 w-12 text-gray-400" />}
                  title="Nenhuma NFe encontrada"
                  description="Nenhuma NFe corresponde aos filtros selecionados"
                  action={
                    <Button variant="neutral" onClick={clearFilters} size="sm">
                      <X className="h-4 w-4" />
                      Limpar filtros
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title="Nenhuma NFe importada"
                  description="Importe notas fiscais para dar entrada no estoque automaticamente"
                  action={
                    <Button onClick={openImportModal}>
                      <Upload className="h-4 w-4" />
                      Importar XML
                    </Button>
                  }
                />
              )
            }
          />

          {/* Indicador de resultados filtrados */}
          {hasActiveFilters && (
            <div className="pt-2 text-sm text-gray-500 dark:text-gray-400">
              Exibindo {filteredImports.length} de {imports.length} NFes
            </div>
          )}
        </div>
      </Card>

      {/* Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Importar NFe"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Selecione o arquivo XML da Nota Fiscal Eletrônica. Os dados serão extraídos
            automaticamente.
          </p>

          {/* XML Upload */}
          <div
            className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xml"
              onChange={handleFileSelect}
            />
            {importNfe.isPending ? (
              <div className="flex flex-col items-center gap-3">
                <Loading size="lg" />
                <p className="text-gray-600 dark:text-gray-400">Processando XML...</p>
              </div>
            ) : (
              <>
                <Upload className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                <p className="mb-1 text-gray-600 dark:text-gray-400">Arraste o arquivo XML aqui</p>
                <p className="mb-4 text-sm text-gray-400 dark:text-gray-500">ou</p>
                <Button
                  type="button"
                  variant="neutral"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Selecionar arquivo
                </Button>
              </>
            )}
          </div>

          {/* Error message */}
          {importError && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Erro ao importar NFe
                </p>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{importError}</p>
              </div>
            </div>
          )}

          <ModalFooter>
            <Button
              type="button"
              variant="neutral"
              onClick={() => setIsImportModalOpen(false)}
              showIcon={false}
            >
              Cancelar
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir NFe"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir a NFe <strong>{selectedNfe?.number}</strong>? Esta ação não
          pode ser desfeita.
        </p>

        <ModalFooter>
          <Button
            type="button"
            variant="neutral"
            onClick={() => setIsDeleteModalOpen(false)}
            showIcon={false}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteNfe.isPending}
          >
            Excluir
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
