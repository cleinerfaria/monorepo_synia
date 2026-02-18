import { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  ModalFooter,
  Button,
  Input,
  Badge,
  EmptyState,
  ListPagination,
} from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useListPageState } from '@/hooks/useListPageState';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import { FlaskConical, Search, Check, Download } from 'lucide-react';
interface CmedSubstance {
  name: string;
  count: number;
  therapeutic_class: string | null;
  already_exists: boolean;
}

interface SubstanceStats {
  total: number;
  newCount: number;
  existingCount: number;
}

interface ImportActiveIngredientsFromCmedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PAGE_SIZE = DEFAULT_LIST_PAGE_SIZE;

export function ImportActiveIngredientsFromCmedModal({
  isOpen,
  onClose,
}: ImportActiveIngredientsFromCmedModalProps) {
  const { company } = useAuthStore();
  const queryClient = useQueryClient();

  const [substances, setSubstances] = useState<CmedSubstance[]>([]);
  const [stats, setStats] = useState<SubstanceStats>({ total: 0, newCount: 0, existingCount: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useListPageState({
    storageKey: 'import-active-ingredients-cmed-page',
  });
  const [selectedSubstances, setSelectedSubstances] = useState<Set<string>>(new Set());
  const [, setCmedSourceId] = useState<string | null>(null);
  const [, setExistingNamesSet] = useState<Set<string>>(new Set());

  // Cache all substances for pagination (computed once)
  const [allSubstancesCache, setAllSubstancesCache] = useState<CmedSubstance[]>([]);

  const fetchAllExistingNames = useCallback(async (): Promise<Set<string>> => {
    if (!company?.id) return new Set();

    const PAGE_SIZE_LARGE = 1000;
    let allNames: string[] = [];
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      const { data, error } = await supabase
        .from('active_ingredient')
        .select('name')
        .eq('company_id', company.id)
        .range(offset, offset + PAGE_SIZE_LARGE - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allNames = [...allNames, ...data.map((d) => d.name.toLowerCase().trim())];
        offset += PAGE_SIZE_LARGE;
        hasMore = data.length === PAGE_SIZE_LARGE;
      } else {
        hasMore = false;
      }
    }

    return new Set(allNames);
  }, [company?.id]);

  const fetchAllSubstances = useCallback(
    async (sourceId: string, existingNames: Set<string>) => {
      if (!company?.id) return;

      const PAGE_SIZE_LARGE = 1000;
      const substanceMap = new Map<
        string,
        {
          displayName: string;
          count: number;
          therapeutic_class: string | null;
        }
      >();

      let hasMore = true;
      let offset = 0;

      while (hasMore) {
        const { data, error } = await supabase
          .from('ref_item')
          .select('extra_data')
          .eq('company_id', company.id)
          .eq('source_id', sourceId)
          .eq('is_active', true)
          .range(offset, offset + PAGE_SIZE_LARGE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          for (const item of data) {
            const extraData = item.extra_data as Record<string, unknown> | null;
            const substancia = extraData?.substancia as string | null;
            const classeTerapeutica = extraData?.classe_terapeutica as string | null;

            if (substancia && substancia.trim()) {
              const displayName = substancia.trim();
              const normalizedKey = displayName.toLowerCase();

              const existing = substanceMap.get(normalizedKey);
              if (existing) {
                existing.count++;
              } else {
                substanceMap.set(normalizedKey, {
                  displayName,
                  count: 1,
                  therapeutic_class: classeTerapeutica || null,
                });
              }
            }
          }
          offset += PAGE_SIZE_LARGE;
          hasMore = data.length === PAGE_SIZE_LARGE;
        } else {
          hasMore = false;
        }
      }

      // Convert to array and sort
      const allSubstances = Array.from(substanceMap.entries())
        .map(([normalizedKey, data]) => ({
          name: data.displayName,
          count: data.count,
          therapeutic_class: data.therapeutic_class,
          already_exists: existingNames.has(normalizedKey),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

      // Cache all substances
      setAllSubstancesCache(allSubstances);

      // Calculate stats
      const newCount = allSubstances.filter((s) => !s.already_exists).length;
      const existingCount = allSubstances.filter((s) => s.already_exists).length;

      setStats({
        total: allSubstances.length,
        newCount,
        existingCount,
      });

      // Apply initial pagination
      setSubstances(allSubstances.slice(0, PAGE_SIZE));
    },
    [company?.id]
  );

  const applyPaginationAndFilter = useCallback(() => {
    const searchFilter = debouncedSearch.trim().toLowerCase();

    // Filter by search term
    let filtered = allSubstancesCache;
    if (searchFilter) {
      filtered = allSubstancesCache.filter(
        (s) =>
          s.name.toLowerCase().includes(searchFilter) ||
          s.therapeutic_class?.toLowerCase().includes(searchFilter)
      );
    }

    // Update stats for filtered results
    const newCount = filtered.filter((s) => !s.already_exists).length;
    const existingCount = filtered.filter((s) => s.already_exists).length;
    setStats({
      total: filtered.length,
      newCount,
      existingCount,
    });

    // Apply pagination
    const offset = (currentPage - 1) * PAGE_SIZE;
    setSubstances(filtered.slice(offset, offset + PAGE_SIZE));
  }, [currentPage, debouncedSearch, allSubstancesCache]);

  const initializeData = useCallback(async () => {
    if (!company?.id) return;

    setIsLoadingStats(true);
    setIsLoading(true);
    try {
      // Get the CMED source id
      const { data: cmedSource } = await supabase
        .from('ref_source')
        .select('id')
        .eq('code', 'cmed')
        .single();

      if (!cmedSource) {
        toast.error('Fonte CMED não encontrada');
        return;
      }

      setCmedSourceId(cmedSource.id);

      // Get all existing active ingredients names (with pagination)
      const existingNames = await fetchAllExistingNames();
      setExistingNamesSet(existingNames);

      // Fetch and aggregate all substances
      await fetchAllSubstances(cmedSource.id, existingNames);
    } catch (error) {
      console.error('Error initializing:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoadingStats(false);
      setIsLoading(false);
    }
  }, [company?.id, fetchAllExistingNames, fetchAllSubstances]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, setCurrentPage]);

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen && company?.id) {
      initializeData();
    }
  }, [isOpen, company?.id, initializeData]);

  // Apply pagination when page or search changes
  useEffect(() => {
    if (allSubstancesCache.length > 0) {
      applyPaginationAndFilter();
    }
  }, [currentPage, debouncedSearch, allSubstancesCache, applyPaginationAndFilter]);

  const totalPages = Math.ceil(stats.total / PAGE_SIZE);

  const handleToggleSubstance = (name: string) => {
    const newSelected = new Set(selectedSubstances);
    if (newSelected.has(name)) {
      newSelected.delete(name);
    } else {
      newSelected.add(name);
    }
    setSelectedSubstances(newSelected);
  };

  const handleSelectAllOnPage = () => {
    const newSelected = new Set(selectedSubstances);
    substances.filter((s) => !s.already_exists).forEach((s) => newSelected.add(s.name));
    setSelectedSubstances(newSelected);
  };

  const handleDeselectAll = () => {
    setSelectedSubstances(new Set());
  };

  const handleImport = async () => {
    if (!company?.id || selectedSubstances.size === 0) return;

    setIsImporting(true);
    try {
      // Refresh existing names before import
      const existingNames = await fetchAllExistingNames();

      // Filter selected substances that don't already exist
      const toImportNames = Array.from(selectedSubstances).filter(
        (name) => !existingNames.has(name.toLowerCase().trim())
      );

      if (toImportNames.length === 0) {
        toast.success('Todos os princípios ativos selecionados já existem.');
        onClose();
        return;
      }

      // Prepare data with truncated names (max 255 chars for varchar)
      const insertData = toImportNames.map((name) => ({
        company_id: company.id,
        name: name.trim().substring(0, 255),
        active: true,
      }));

      // Insert in batches
      const BATCH_SIZE = 50;
      let inserted = 0;
      let errors = 0;

      for (let i = 0; i < insertData.length; i += BATCH_SIZE) {
        const batch = insertData.slice(i, i + BATCH_SIZE);

        const { data, error } = await supabase.from('active_ingredient').insert(batch).select('id');

        if (error) {
          console.error('Error inserting batch:', error);
          errors += batch.length;
        } else {
          inserted += data?.length || batch.length;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['active_ingredients'] });

      const skipped = selectedSubstances.size - toImportNames.length;
      if (errors > 0 || skipped > 0) {
        toast.success(
          `Importados ${inserted} princípios ativos.${skipped > 0 ? ` ${skipped} já existiam.` : ''}${errors > 0 ? ` ${errors} com erro.` : ''}`
        );
      } else {
        toast.success(`${inserted} princípios ativos importados com sucesso!`);
      }

      onClose();
    } catch (error) {
      console.error('Error importing substances:', error);
      toast.error('Erro ao importar princípios ativos');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedSubstances(new Set());
    setCurrentPage(1);
    setSubstances([]);
    setAllSubstancesCache([]);
    setStats({ total: 0, newCount: 0, existingCount: 0 });
    onClose();
  };

  const selectedCount = selectedSubstances.size;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Importar Princípios Ativos do CMED"
      size="xl"
    >
      <div className="space-y-4">
        {/* Info banner */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Esta função importa os princípios ativos (substâncias) encontrados na tabela CMED
            importada anteriormente. Os princípios ativos já cadastrados não serão duplicados.
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            {isLoadingStats ? (
              <span className="animate-pulse">Carregando estatísticas...</span>
            ) : (
              <>
                <span>
                  <strong className="text-gray-900 dark:text-white">
                    {stats.total.toLocaleString('pt-BR')}
                  </strong>{' '}
                  substâncias
                </span>
                <span>
                  <strong className="text-green-600 dark:text-green-400">
                    {stats.newCount.toLocaleString('pt-BR')}
                  </strong>{' '}
                  novas
                </span>
                <span>
                  <strong className="text-gray-500">
                    {stats.existingCount.toLocaleString('pt-BR')}
                  </strong>{' '}
                  já cadastradas
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="neutral"
              onClick={handleSelectAllOnPage}
              disabled={isLoading || isLoadingStats}
            >
              Selecionar Página
            </Button>
            <Button
              size="sm"
              variant="neutral"
              onClick={handleDeselectAll}
              disabled={isLoading || selectedCount === 0}
            >
              Limpar ({selectedCount})
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por substância ou classe terapêutica..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Substance list */}
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading || isLoadingStats ? (
              <div className="p-8 text-center text-gray-500">
                <div className="border-primary-500 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
                <p>Carregando substâncias do CMED...</p>
              </div>
            ) : substances.length === 0 ? (
              <EmptyState
                title={
                  stats.total === 0 && !debouncedSearch
                    ? 'Nenhuma substância encontrada'
                    : 'Nenhum resultado para a busca'
                }
                description={
                  stats.total === 0 && !debouncedSearch
                    ? 'Importe a tabela CMED primeiro para visualizar as substâncias disponíveis.'
                    : 'Tente buscar por outro termo.'
                }
              />
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <span className="sr-only">Selecionar</span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Substância
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Classe Terapêutica
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Produtos
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {substances.map((substance) => (
                    <tr
                      key={substance.name}
                      className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                        selectedSubstances.has(substance.name)
                          ? 'bg-primary-50 dark:bg-primary-900/20'
                          : ''
                      }`}
                      onClick={() => {
                        if (!substance.already_exists) {
                          handleToggleSubstance(substance.name);
                        }
                      }}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedSubstances.has(substance.name)}
                          onChange={() => handleToggleSubstance(substance.name)}
                          disabled={substance.already_exists}
                          className="text-primary-500 focus:ring-primary-500 h-4 w-4 rounded border-gray-300 disabled:opacity-50"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 flex-shrink-0 text-purple-500" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {substance.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {substance.therapeutic_class || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-500">
                          {substance.count.toLocaleString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {substance.already_exists ? (
                          <Badge variant="success">
                            <Check className="mr-1 h-3 w-3" />
                            Cadastrado
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Novo</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <ListPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={stats.total}
          itemLabel="registros"
          isLoading={isLoading}
          onPreviousPage={() => setCurrentPage((page) => page - 1)}
          onNextPage={() => setCurrentPage((page) => page + 1)}
        />

        {/* Selected count */}
        {selectedCount > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>{selectedCount}</strong> substância(s) selecionada(s) para importação
            </p>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="neutral" onClick={handleClose} showIcon={false}>
          Cancelar
        </Button>
        <Button onClick={handleImport} disabled={selectedCount === 0} isLoading={isImporting}>
          <Download className="h-4 w-4" />
          Importar {selectedCount > 0 && `(${selectedCount})`}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
