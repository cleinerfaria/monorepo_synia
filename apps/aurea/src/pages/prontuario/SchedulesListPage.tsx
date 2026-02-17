import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { CalendarDays, Search, Funnel, FunnelX, X } from 'lucide-react';
import {
  Card,
  Button,
  DataTable,
  ListPagination,
  Badge,
  StatusBadge,
  EmptyState,
  SearchableSelect,
  IconButton,
} from '@/components/ui';
import { usePatientDemands } from '@/hooks/usePatientDemands';
import type { PadWithPatient } from '@/hooks/usePatientDemands';
import { formatDateOnly } from '@/lib/dateOnly';

const PAGE_SIZE = 20;

export default function SchedulesListPage() {
  const navigate = useNavigate();
  const { data: demands = [], isLoading } = usePatientDemands();

  // Busca
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtros
  const [statusFilter, setStatusFilter] = useState('');
  const [regimeFilter, setRegimeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Paginacao client-side
  const [currentPage, setCurrentPage] = useState(1);

  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    setSearchTerm(searchInput);
  }, [searchInput]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setStatusFilter('');
    setRegimeFilter('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || statusFilter || regimeFilter;

  // Agrupar por paciente (manter a demand mais recente de cada paciente)
  const uniqueDemands = useMemo(() => {
    const map = new Map<string, PadWithPatient>();
    for (const demand of demands) {
      const existing = map.get(demand.patient_id);
      if (!existing || new Date(demand.created_at) > new Date(existing.created_at)) {
        map.set(demand.patient_id, demand);
      }
    }
    return Array.from(map.values());
  }, [demands]);

  // Aplicar filtros
  const filteredData = useMemo(() => {
    return uniqueDemands.filter((d) => {
      if (searchTerm && !d.patient.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (statusFilter === 'active' && !d.is_active) return false;
      if (statusFilter === 'inactive' && d.is_active) return false;
      if (regimeFilter && String(d.hours_per_day) !== regimeFilter) return false;
      return true;
    });
  }, [uniqueDemands, searchTerm, statusFilter, regimeFilter]);

  // Paginacao
  const totalCount = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  const columns: ColumnDef<PadWithPatient>[] = useMemo(
    () => [
      {
        accessorKey: 'patient.name',
        header: () => <span>PACIENTE</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{row.original.patient.name}</p>
          </div>
        ),
      },
      {
        accessorKey: 'start_date',
        header: () => <span className="block w-full text-center">INICIO</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-center text-gray-700 dark:text-gray-300">
            {formatDateOnly(row.original.start_date)}
          </div>
        ),
      },
      {
        accessorKey: 'end_date',
        header: () => <span className="block w-full text-center">FIM</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-center text-gray-700 dark:text-gray-300">
            {row.original.end_date ? formatDateOnly(row.original.end_date) : 'Indefinido'}
          </div>
        ),
      },
      {
        accessorKey: 'hours_per_day',
        header: () => <span className="block w-full text-center">REGIME</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Badge variant="info">{row.original.hours_per_day}h/dia</Badge>
          </div>
        ),
      },
      {
        accessorKey: 'is_split',
        header: () => <span className="block w-full text-center">TIPO</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Badge variant={row.original.is_split ? 'warning' : 'neutral'}>
              {row.original.is_split ? 'Dividido' : 'Integral'}
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: 'is_active',
        header: () => <span className="block w-full text-center">STATUS</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-center">
            <StatusBadge status={row.original.is_active ? 'active' : 'inactive'} />
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/prontuario/escala/${row.original.patient_id}`);
              }}
              title="Abrir Escala"
            >
              <CalendarDays className="h-4 w-4" />
            </IconButton>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Escalas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gerencie as escalas de atendimento dos pacientes
          </p>
        </div>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="space-y-4 p-6">
          {/* Barra de pesquisa e filtros */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome do paciente..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="focus:ring-primary-500 w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSearch}
                variant="outline"
                size="md"
                showIcon
                icon={<Search className="h-4 w-4" />}
                label=""
                className="w-9 justify-center pr-3"
              />
              <Button
                variant="filter"
                active={Boolean(showFilters || hasActiveFilters)}
                onClick={() => setShowFilters(!showFilters)}
                icon={<Funnel className="mr-1 h-4 w-4" />}
                count={[searchTerm, statusFilter, regimeFilter].filter(Boolean).length}
                className="min-w-24 justify-center"
              />
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
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
          </div>

          {/* Painel de filtros */}
          {showFilters && (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SearchableSelect
                  label="Status"
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'active', label: 'Ativo' },
                    { value: 'inactive', label: 'Inativo' },
                  ]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar status..."
                  value={statusFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <SearchableSelect
                  label="Regime"
                  options={[
                    { value: '', label: 'Todos' },
                    { value: '24', label: '24h/dia' },
                    { value: '12', label: '12h/dia' },
                    { value: '8', label: '8h/dia' },
                    { value: '6', label: '6h/dia' },
                    { value: '4', label: '4h/dia' },
                  ]}
                  placeholder="Selecione..."
                  searchPlaceholder="Buscar regime..."
                  value={regimeFilter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setRegimeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          )}

          <DataTable
            data={pagedData}
            columns={columns}
            showPagination={false}
            isLoading={isLoading}
            onRowClick={(row) => navigate(`/prontuario/escala/${row.patient_id}`)}
            emptyState={
              hasActiveFilters ? (
                <EmptyState
                  icon={<Funnel className="h-12 w-12 text-gray-400" />}
                  title="Nenhuma escala encontrada"
                  description="Nenhuma escala corresponde aos filtros selecionados"
                  action={
                    <Button
                      onClick={clearFilters}
                      variant="solid"
                      size="sm"
                      icon={<X className="h-4 w-4" />}
                      label="Limpar filtros"
                    />
                  }
                />
              ) : (
                <EmptyState
                  icon={<CalendarDays className="h-12 w-12 text-gray-400" />}
                  title="Sem escalas cadastradas"
                  description="Crie uma escala (PAD) para gerenciar plantoes"
                  action={
                    <Button
                      onClick={() => navigate('/prontuario/pad')}
                      variant="solid"
                      label="Ir para PAD"
                    />
                  }
                />
              )
            }
          />

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            itemLabel="escalas"
            onPreviousPage={() => setCurrentPage((p) => p - 1)}
            onNextPage={() => setCurrentPage((p) => p + 1)}
          />
        </div>
      </Card>
    </div>
  );
}
