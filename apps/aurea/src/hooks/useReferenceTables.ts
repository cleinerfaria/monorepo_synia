import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type {
  RefSource,
  RefImportBatch,
  RefImportError,
  RefItem,
  RefPriceHistory,
} from '@/types/database';
import toast from 'react-hot-toast';
import { parseCmedFile, buildCmedRefItemData } from '@/lib/cmedParser';
import { parseSimproFile, buildSimproRefItemData } from '@/lib/simproParser';
import { parseBrasindiceFileFromFile, buildBrasindiceRefItemData } from '@/lib/brasindiceParser';
import { todayDateOnly } from '@/lib/dateOnly';

const QUERY_KEY = 'reference-tables';

// ========================================
// Sources
// ========================================

export function useRefSources() {
  return useQuery({
    queryKey: [QUERY_KEY, 'sources'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ref_source').select('*').order('name');

      if (error) throw error;
      return data as RefSource[];
    },
  });
}

// ========================================
// Source Stats (with company context)
// ========================================

export interface RefSourceWithStats extends RefSource {
  last_batch?: RefImportBatch | null;
  active_items_count: number;
  total_imports: number;
  variation?: {
    inserted: number;
    updated: number;
    skipped: number;
  };
}

export function useRefSourcesWithStats() {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, 'sources-stats', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      // Get sources
      const { data: sources, error: sourcesError } = await supabase
        .from('ref_source')
        .select('*')
        .order('name');

      if (sourcesError) throw sourcesError;

      // For each source, get stats
      const sourcesWithStats: RefSourceWithStats[] = await Promise.all(
        (sources as RefSource[]).map(async (source) => {
          // Get last batch
          const { data: lastBatch } = await supabase
            .from('ref_import_batch')
            .select('*')
            .eq('source_id', source.id)
            .eq('company_id', company.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get active items count
          const { count: activeItemsCount } = await supabase
            .from('ref_item')
            .select('*', { count: 'exact', head: true })
            .eq('source_id', source.id)
            .eq('company_id', company.id)
            .eq('is_active', true);

          // Get total imports count
          const { count: totalImports } = await supabase
            .from('ref_import_batch')
            .select('*', { count: 'exact', head: true })
            .eq('source_id', source.id)
            .eq('company_id', company.id);

          return {
            ...source,
            last_batch: lastBatch as RefImportBatch | null,
            active_items_count: activeItemsCount || 0,
            total_imports: totalImports || 0,
            variation: lastBatch
              ? {
                  inserted: (lastBatch as RefImportBatch).rows_inserted ?? 0,
                  updated: (lastBatch as RefImportBatch).rows_updated ?? 0,
                  skipped: (lastBatch as RefImportBatch).rows_skipped ?? 0,
                }
              : undefined,
          };
        })
      );

      return sourcesWithStats;
    },
    enabled: !!company?.id,
  });
}

// ========================================
// Import Batches
// ========================================

export function useRefImportBatches(sourceId?: string) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, 'batches', company?.id, sourceId],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from('ref_import_batch')
        .select(
          `id, source_id, company_id, status, file_name, file_size, rows_read, rows_inserted, rows_updated, rows_skipped, rows_error, error_summary, created_at, started_at, finished_at, import_options, created_by, source:ref_source(id, code, name), created_by_user:app_user(id, name, email)`
        )
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (sourceId) {
        query = query.eq('source_id', sourceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as RefImportBatch[];
    },
    enabled: !!company?.id,
  });
}

export function useRefImportBatch(batchId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'batch', batchId],
    queryFn: async () => {
      if (!batchId) return null;

      const { data, error } = await supabase
        .from('ref_import_batch')
        .select(
          `
          *,
          source:ref_source(*),
          created_by_user:app_user(id, name, email)
        `
        )
        .eq('id', batchId)
        .single();

      if (error) throw error;
      return data as RefImportBatch;
    },
    enabled: !!batchId,
  });
}

// ========================================
// Import Errors
// ========================================

export function useRefImportErrors(batchId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'errors', batchId],
    queryFn: async () => {
      if (!batchId) return [];

      const { data, error } = await supabase
        .from('ref_import_error')
        .select('*')
        .eq('batch_id', batchId)
        .order('row_number');

      if (error) throw error;
      return data as RefImportError[];
    },
    enabled: !!batchId,
  });
}

// ========================================
// Items
// ========================================

export interface RefItemFilters {
  search?: string;
  category?: string;
  isActive?: boolean;
}

export function useRefItems(sourceId: string | undefined, filters?: RefItemFilters) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, 'items', company?.id, sourceId, filters],
    queryFn: async () => {
      if (!company?.id || !sourceId) return [];

      let query = supabase
        .from('ref_item')
        .select('*')
        .eq('company_id', company.id)
        .eq('source_id', sourceId)
        .order('product_name');

      if (filters?.search) {
        query = query.or(
          `external_code.ilike.%${filters.search}%,product_name.ilike.%${filters.search}%,ean.ilike.%${filters.search}%`
        );
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data: items, error } = await query.limit(100);

      if (error) {
        throw error;
      }

      if (!items || items.length === 0) {
        return [];
      }

      // Get all item IDs and fetch their prices
      const itemIds = items.map((item) => item.id);

      const { data: prices, error: _pricesError } = await supabase
        .from('ref_price_history')
        .select('*')
        .in('item_id', itemIds);

      // Map prices by item_id
      const pricesByItemId = new Map<string, any[]>();
      prices?.forEach((price) => {
        if (!pricesByItemId.has(price.item_id)) {
          pricesByItemId.set(price.item_id, []);
        }
        pricesByItemId.get(price.item_id)!.push(price);
      });

      // Attach prices to items
      const itemsWithPrices = items.map((item) => ({
        ...item,
        current_prices: pricesByItemId.get(item.id) || [],
      }));

      return itemsWithPrices as RefItemWithPrices[];
    },
    enabled: !!company?.id && !!sourceId,
  });
}

export function useRefItem(itemId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'item', itemId],
    queryFn: async () => {
      if (!itemId) return null;

      const { data, error } = await supabase
        .from('ref_item')
        .select(
          `
          *,
          source:ref_source(*)
        `
        )
        .eq('id', itemId)
        .single();

      if (error) throw error;
      return data as RefItem;
    },
    enabled: !!itemId,
  });
}

// ========================================
// Price History
// ========================================

export function useRefPriceHistory(itemId: string | undefined, priceType?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'price-history', itemId, priceType],
    queryFn: async () => {
      if (!itemId) return [];

      let query = supabase
        .from('ref_price_history')
        .select('*')
        .eq('item_id', itemId)
        .order('valid_from', { ascending: false });

      if (priceType) {
        query = query.eq('price_type', priceType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as RefPriceHistory[];
    },
    enabled: !!itemId,
  });
}

export function useRefCurrentPrices(itemId: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, 'current-prices', itemId],
    queryFn: async () => {
      if (!itemId) return [];

      const { data, error } = await supabase
        .from('ref_item_current_price')
        .select('*')
        .eq('item_id', itemId);

      if (error) throw error;
      return data as RefPriceHistory[];
    },
    enabled: !!itemId,
  });
}

// ========================================
// Categories (for filters)
// ========================================

export function useRefCategories(sourceId: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, 'categories', company?.id, sourceId],
    queryFn: async () => {
      if (!company?.id || !sourceId) return [];

      const { data, error } = await supabase
        .from('ref_item')
        .select('category')
        .eq('company_id', company.id)
        .eq('source_id', sourceId)
        .not('category', 'is', null);

      if (error) throw error;

      // Get unique categories
      const categories = [...new Set(data.map((d) => d.category).filter(Boolean))];
      return categories.sort() as string[];
    },
    enabled: !!company?.id && !!sourceId,
  });
}

// ========================================
// Mutations
// ========================================

export function useCreateRefImportBatch() {
  const queryClient = useQueryClient();
  const { company, appUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: {
      sourceId: string;
      fileName: string;
      filePath?: string;
      fileHash?: string;
      fileSize?: number;
      importOptions?: Record<string, unknown>;
    }) => {
      if (!company?.id) throw new Error('Company not found');

      const { data: batch, error } = await supabase
        .from('ref_import_batch')
        .insert({
          source_id: data.sourceId,
          company_id: company.id,
          status: 'pending',
          file_name: data.fileName,
          file_path: data.filePath,
          file_hash: data.fileHash,
          file_size: data.fileSize,
          import_options: data.importOptions || {},
          created_by: appUser?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return batch as RefImportBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateRefImportBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      status?: RefImportBatch['status'];
      started_at?: string;
      finished_at?: string;
      rows_read?: number;
      rows_inserted?: number;
      rows_updated?: number;
      rows_skipped?: number;
      rows_error?: number;
      error_summary?: string;
    }) => {
      const { id, ...updateData } = data;

      const { error } = await supabase.from('ref_import_batch').update(updateData).eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateRefSourceConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { sourceId: string; config: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('ref_source')
        .update({ config: data.config })
        .eq('id', data.sourceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'sources'] });
      toast.success('Configuração salva com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar configuração: ${error.message}`);
    },
  });
}

// ========================================
// Import Processing - CMED specific implementation
// ========================================

export interface ImportResult {
  success: boolean;
  batch: RefImportBatch;
  stats: {
    read: number;
    inserted: number;
    updated: number;
    unchanged: number;
    skipped: number;
    errors: number;
  };
  errors: Array<{
    row: number;
    message: string;
    data?: Record<string, unknown>;
  }>;
}

export interface ImportProgress {
  phase: 'parsing' | 'processing' | 'saving';
  current: number;
  total: number;
  percentage: number;
  message: string;
}

// Batch size for processing (optimize for Supabase limits)
const BATCH_SIZE = 100;

/**
 * Process CMED import - handles the specific logic for CMED files
 * Optimized with batch processing for better performance
 */
async function processCmedImport(
  file: File,
  batchId: string,
  sourceId: string,
  companyId: string,
  referenceDate: string,
  pfColumn: string,
  pmcColumn: string,
  onProgress?: (progress: ImportProgress) => void,
  abortSignal?: AbortSignal
): Promise<{
  stats: ImportResult['stats'];
  errors: ImportResult['errors'];
  aborted?: boolean;
}> {
  // Phase 1: Parse file
  onProgress?.({
    phase: 'parsing',
    current: 0,
    total: 1,
    percentage: 0,
    message: 'Lendo arquivo...',
  });

  // Check for abort before parsing
  if (abortSignal?.aborted) {
    return {
      stats: { read: 0, inserted: 0, updated: 0, unchanged: 0, skipped: 0, errors: 0 },
      errors: [],
      aborted: true,
    };
  }

  const parseResult = await parseCmedFile(file);

  onProgress?.({
    phase: 'parsing',
    current: 1,
    total: 1,
    percentage: 100,
    message: `${parseResult.rows.length.toLocaleString('pt-BR')} registros encontrados`,
  });

  const stats = {
    read: parseResult.stats.total,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    errors: parseResult.stats.errors,
  };

  const errors = [...parseResult.errors];

  // Get labels for selected price columns
  const pfLabel = pfColumn.replace(/_/g, ' ').replace('pf ', 'PF ').toUpperCase();
  const pmcLabel = pmcColumn.replace(/_/g, ' ').replace('pmc ', 'PMC ').toUpperCase();

  const totalRows = parseResult.rows.length;

  // Phase 2: Process in batches
  for (let batchStart = 0; batchStart < totalRows; batchStart += BATCH_SIZE) {
    // Check for abort signal at the start of each batch
    if (abortSignal?.aborted) {
      return { stats, errors, aborted: true };
    }

    const batchEnd = Math.min(batchStart + BATCH_SIZE, totalRows);
    const batchRows = parseResult.rows.slice(batchStart, batchEnd);

    onProgress?.({
      phase: 'processing',
      current: batchStart,
      total: totalRows,
      percentage: Math.round((batchStart / totalRows) * 100),
      message: `Processando ${batchStart.toLocaleString('pt-BR')} de ${totalRows.toLocaleString('pt-BR')}...`,
    });

    // Get all external codes from this batch
    const externalCodes = batchRows.map((r) => r.codigo_ggrem);

    // Fetch existing items for this batch in one query (with current prices)
    const { data: existingItems } = await supabase
      .from('ref_item')
      .select('id, external_code')
      .eq('company_id', companyId)
      .eq('source_id', sourceId)
      .in('external_code', externalCodes);

    const existingMap = new Map<string, string>();
    const existingItemIds: string[] = [];
    existingItems?.forEach((item) => {
      existingMap.set(item.external_code, item.id);
      existingItemIds.push(item.id);
    });

    // Fetch current prices for existing items (to compare for changes)
    const existingPricesMap = new Map<string, { pf: number | null; pmc: number | null }>();
    if (existingItemIds.length > 0) {
      const { data: existingPrices } = await supabase
        .from('ref_price_history')
        .select('item_id, price_type, price_value')
        .in('item_id', existingItemIds)
        .in('price_type', ['pf', 'pmc'])
        .order('valid_from', { ascending: false });

      // Get latest price for each item and type
      existingPrices?.forEach((price) => {
        if (!existingPricesMap.has(price.item_id)) {
          existingPricesMap.set(price.item_id, { pf: null, pmc: null });
        }
        const current = existingPricesMap.get(price.item_id)!;
        if (price.price_type === 'pf' && current.pf === null) {
          current.pf = price.price_value;
        }
        if (price.price_type === 'pmc' && current.pmc === null) {
          current.pmc = price.price_value;
        }
      });
    }

    // Prepare batch data
    const itemsToInsert: Array<{
      source_id: string;
      company_id: string;
      external_code: string;
      product_name: string;
      presentation: string | null;
      concentration: string | null;
      entry_unit: string | null;
      base_unit: string | null;
      quantity: number | null;
      tiss: string | null;
      tuss: string | null;
      ean: string | null;
      manufacturer_code: string | null;
      manufacturer_name: string;
      category: string | null;
      subcategory: string | null;
      extra_data: Record<string, unknown>;
      first_import_batch_id: string;
      last_import_batch_id: string;
      is_active: boolean;
    }> = [];

    const itemsToUpdate: Array<{
      id: string;
      product_name: string;
      presentation: string | null;
      concentration: string | null;
      entry_unit: string | null;
      base_unit: string | null;
      quantity: number | null;
      tiss: string | null;
      tuss: string | null;
      ean: string | null;
      manufacturer_code: string | null;
      manufacturer_name: string;
      category: string | null;
      subcategory: string | null;
      extra_data: Record<string, unknown>;
      last_import_batch_id: string;
      is_active: boolean;
      hasChanges: boolean; // Track if prices actually changed
    }> = [];

    // Categorize rows
    for (const row of batchRows) {
      if (!row.codigo_ggrem) {
        stats.skipped++;
        continue;
      }

      const existingId = existingMap.get(row.codigo_ggrem);
      const refItemData = buildCmedRefItemData(row);
      const itemData = {
        ...refItemData,
        last_import_batch_id: batchId,
        is_active: true,
      };

      if (existingId) {
        // Check if prices actually changed
        const currentPrices = existingPricesMap.get(existingId) || { pf: null, pmc: null };

        // Normalize prices: treat 0, null, undefined as "no price"
        const normalizePrice = (p: number | null | undefined): number | null => {
          if (p === null || p === undefined || p === 0) return null;
          return Math.round(p * 100) / 100; // Round to 2 decimal places for comparison
        };

        const currentPf = normalizePrice(currentPrices.pf);
        const currentPmc = normalizePrice(currentPrices.pmc);
        const newPf = normalizePrice(row.prices[pfColumn]);
        const newPmc = normalizePrice(row.prices[pmcColumn]);

        const pfChanged = currentPf !== newPf;
        const pmcChanged = currentPmc !== newPmc;
        const hasChanges = pfChanged || pmcChanged;

        itemsToUpdate.push({ id: existingId, ...itemData, hasChanges });
      } else {
        itemsToInsert.push({
          source_id: sourceId,
          company_id: companyId,
          external_code: row.codigo_ggrem,
          first_import_batch_id: batchId,
          ...itemData,
        });
      }
    }

    // Batch insert new items
    const insertedIds = new Map<string, string>();
    if (itemsToInsert.length > 0) {
      const { data: insertedItems, error: insertError } = await supabase
        .from('ref_item')
        .insert(itemsToInsert)
        .select('id, external_code');

      if (insertError) {
        console.error('Batch insert error:', insertError);
        stats.errors += itemsToInsert.length;
        errors.push({
          row: batchStart,
          message: `Erro ao inserir lote: ${insertError.message}`,
        });
      } else {
        stats.inserted += insertedItems?.length || 0;
        insertedItems?.forEach((item) => {
          insertedIds.set(item.external_code, item.id);
        });
      }
    }

    // Track IDs of items that have price changes (for price history insertion)
    // This needs to be outside the if block to be accessible later
    const itemsWithPriceChanges = new Set<string>();

    // Batch update existing items (using upsert with id)
    if (itemsToUpdate.length > 0) {
      // Separate items with changes from unchanged ones
      const itemsWithChanges = itemsToUpdate.filter((item) => item.hasChanges);
      const itemsUnchanged = itemsToUpdate.filter((item) => !item.hasChanges);

      // Count unchanged items
      stats.unchanged += itemsUnchanged.length;

      // Add IDs of items that have price changes
      itemsWithChanges.forEach((item) => itemsWithPriceChanges.add(item.id));

      // Only update items that have actual changes
      if (itemsWithChanges.length > 0) {
        // Process updates in smaller sub-batches
        for (let i = 0; i < itemsWithChanges.length; i += 50) {
          const subBatch = itemsWithChanges.slice(i, i + 50);

          // Use individual updates for now (Supabase doesn't support bulk update by different IDs easily)
          const updatePromises = subBatch.map((item) =>
            supabase
              .from('ref_item')
              .update({
                product_name: item.product_name,
                presentation: item.presentation,
                concentration: item.concentration,
                entry_unit: item.entry_unit,
                base_unit: item.base_unit,
                quantity: item.quantity,
                tiss: item.tiss,
                tuss: item.tuss,
                ean: item.ean,
                manufacturer_code: item.manufacturer_code,
                manufacturer_name: item.manufacturer_name,
                category: item.category,
                subcategory: item.subcategory,
                extra_data: item.extra_data,
                last_import_batch_id: item.last_import_batch_id,
                is_active: item.is_active,
              })
              .eq('id', item.id)
          );

          await Promise.all(updatePromises);
          stats.updated += subBatch.length;
        }
      }
    }

    // Prepare price records for this batch
    // Only create price records for NEW items or items that had price changes
    const priceRecords: Array<{
      item_id: string;
      import_batch_id: string;
      price_type: string;
      price_value: number;
      currency: string;
      valid_from: string;
      price_meta: Record<string, unknown>;
    }> = [];

    for (const row of batchRows) {
      if (!row.codigo_ggrem) continue;

      const isNewItem = insertedIds.has(row.codigo_ggrem);
      const existingId = existingMap.get(row.codigo_ggrem);
      const itemId = existingId || insertedIds.get(row.codigo_ggrem);
      if (!itemId) continue;

      // Only add price history if it's a new item or if prices changed
      const shouldAddPriceHistory = isNewItem || itemsWithPriceChanges.has(itemId);
      if (!shouldAddPriceHistory) continue;

      // Add PF price
      const pfValue = row.prices[pfColumn];
      if (pfValue !== null && pfValue !== undefined) {
        priceRecords.push({
          item_id: itemId,
          import_batch_id: batchId,
          price_type: 'pf',
          price_value: pfValue,
          currency: 'BRL',
          valid_from: referenceDate,
          price_meta: { label: pfLabel, source: 'cmed', original_column: pfColumn },
        });
      }

      // Add PMC price
      const pmcValue = row.prices[pmcColumn];
      if (pmcValue !== null && pmcValue !== undefined) {
        priceRecords.push({
          item_id: itemId,
          import_batch_id: batchId,
          price_type: 'pmc',
          price_value: pmcValue,
          currency: 'BRL',
          valid_from: referenceDate,
          price_meta: { label: pmcLabel, source: 'cmed', original_column: pmcColumn },
        });
      }
    }

    // Batch insert prices
    if (priceRecords.length > 0) {
      const { error: priceError } = await supabase.from('ref_price_history').upsert(priceRecords, {
        onConflict: 'item_id,price_type,valid_from,import_batch_id',
      });

      if (priceError) {
        console.warn('Price batch insert warning:', priceError);
      }
    }
  }

  // Final progress update
  onProgress?.({
    phase: 'saving',
    current: totalRows,
    total: totalRows,
    percentage: 100,
    message: 'Finalizando importação...',
  });

  return { stats, errors };
}

// ========================================
// Import Processing - SIMPRO specific implementation
// ========================================

const BATCH_SIZE_SIMPRO = 100;

async function processSimproImport(
  file: File,
  batchId: string,
  sourceId: string,
  companyId: string,
  referenceDate: string,
  pfColumn: string,
  pmcColumn: string,
  taxPercentage: number = 20,
  onProgress?: (progress: ImportProgress) => void,
  abortSignal?: AbortSignal
): Promise<{ stats: ImportResult['stats']; errors: ImportResult['errors']; aborted?: boolean }> {
  // Check for abort before parsing
  if (abortSignal?.aborted) {
    return {
      stats: { read: 0, inserted: 0, updated: 0, unchanged: 0, skipped: 0, errors: 0 },
      errors: [],
      aborted: true,
    };
  }

  onProgress?.({
    phase: 'parsing',
    current: 0,
    total: 1,
    percentage: 0,
    message: 'Lendo arquivo...',
  });

  const parseResult = await parseSimproFile(file);

  onProgress?.({
    phase: 'parsing',
    current: 1,
    total: 1,
    percentage: 100,
    message: `${parseResult.rows.length.toLocaleString('pt-BR')} registros encontrados`,
  });

  const stats = {
    read: parseResult.stats.total,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    errors: parseResult.stats.errors,
  };

  const errors = [...parseResult.errors];

  // Get labels for selected price columns
  const _pfLabel = pfColumn.replace(/_/g, ' ').replace('preco', 'Preço').toUpperCase();
  const _pmcLabel = pmcColumn.replace(/_/g, ' ').replace('preco', 'Preço').toUpperCase();

  const totalRows = parseResult.rows.length;

  // Phase 2: Process in batches
  for (let batchStart = 0; batchStart < totalRows; batchStart += BATCH_SIZE_SIMPRO) {
    // Check for abort signal at the start of each batch
    if (abortSignal?.aborted) {
      return { stats, errors, aborted: true };
    }

    const batchEnd = Math.min(batchStart + BATCH_SIZE_SIMPRO, totalRows);
    const batchRows = parseResult.rows.slice(batchStart, batchEnd);

    onProgress?.({
      phase: 'processing',
      current: batchStart,
      total: totalRows,
      percentage: Math.round((batchStart / totalRows) * 100),
      message: `Processando ${batchStart.toLocaleString('pt-BR')} de ${totalRows.toLocaleString('pt-BR')}...`,
    });

    // Get all external codes (using CÓDIGO from SIMPRO)
    const externalCodes = batchRows.map((r) => r.codigo);

    // Fetch existing items for this batch
    const { data: existingItems } = await supabase
      .from('ref_item')
      .select('id, external_code')
      .eq('company_id', companyId)
      .eq('source_id', sourceId)
      .in('external_code', externalCodes);

    const existingMap = new Map<string, string>();
    const existingItemIds: string[] = [];
    existingItems?.forEach((item) => {
      existingMap.set(item.external_code, item.id);
      existingItemIds.push(item.id);
    });

    // Fetch current prices for existing items
    const existingPricesMap = new Map<string, { pf: number | null; pmc: number | null }>();
    if (existingItemIds.length > 0) {
      const { data: existingPrices } = await supabase
        .from('ref_price_history')
        .select('item_id, price_type, price_value')
        .in('item_id', existingItemIds)
        .in('price_type', ['pf', 'pmc'])
        .order('valid_from', { ascending: false });

      // Get latest price for each item and type
      existingPrices?.forEach((price) => {
        if (!existingPricesMap.has(price.item_id)) {
          existingPricesMap.set(price.item_id, { pf: null, pmc: null });
        }
        const current = existingPricesMap.get(price.item_id)!;
        if (price.price_type === 'pf' && current.pf === null) {
          current.pf = price.price_value;
        }
        if (price.price_type === 'pmc' && current.pmc === null) {
          current.pmc = price.price_value;
        }
      });
    }

    // Prepare batch data
    const itemsToInsert: Array<{
      source_id: string;
      company_id: string;
      external_code: string;
      product_name: string;
      presentation: string | null;
      concentration: string | null;
      entry_unit: string | null;
      base_unit: string | null;
      quantity: number | null;
      tiss: string | null;
      tuss: string | null;
      ean: string | null;
      manufacturer_code: string | null;
      manufacturer_name: string;
      category: string | null;
      subcategory: string | null;
      extra_data: Record<string, unknown>;
      first_import_batch_id: string;
      last_import_batch_id: string;
      is_active: boolean;
    }> = [];

    const itemsToUpdate: Array<{
      id: string;
      product_name: string;
      presentation: string | null;
      concentration: string | null;
      entry_unit: string | null;
      base_unit: string | null;
      quantity: number | null;
      tiss: string | null;
      tuss: string | null;
      ean: string | null;
      manufacturer_code: string | null;
      manufacturer_name: string;
      category: string | null;
      subcategory: string | null;
      extra_data: Record<string, unknown>;
      last_import_batch_id: string;
      is_active: boolean;
      hasChanges: boolean;
    }> = [];

    // Categorize rows
    for (const row of batchRows) {
      if (!row.codigo) {
        stats.skipped++;
        continue;
      }

      const existingId = existingMap.get(row.codigo);
      const refItemData = buildSimproRefItemData(row);
      const itemData = {
        ...refItemData,
        last_import_batch_id: batchId,
        is_active: true, // SIMPRO items are always active by default
      };

      if (existingId) {
        // Check if prices changed
        const currentPrices = existingPricesMap.get(existingId) || { pf: null, pmc: null };

        // Normalize prices: treat 0, null, undefined as "no price"
        const normalizePrice = (p: number | null | undefined): number | null => {
          if (p === null || p === undefined || p === 0) return null;
          return Math.round(p * 100) / 100; // Round to 2 decimal places for comparison
        };

        const currentPf = normalizePrice(currentPrices.pf);
        const currentPmc = normalizePrice(currentPrices.pmc);
        const newPf = normalizePrice(row.prices[pfColumn]);
        const newPmc = normalizePrice(row.prices[pmcColumn]);

        const pfChanged = currentPf !== newPf;
        const pmcChanged = currentPmc !== newPmc;
        const hasChanges = pfChanged || pmcChanged;

        itemsToUpdate.push({ id: existingId, ...itemData, hasChanges });
      } else {
        itemsToInsert.push({
          source_id: sourceId,
          company_id: companyId,
          external_code: row.codigo,
          first_import_batch_id: batchId,
          ...itemData,
        });
      }
    }

    // Batch insert new items
    const insertedIds = new Map<string, string>();
    if (itemsToInsert.length > 0) {
      const { data: insertedItems, error: insertError } = await supabase
        .from('ref_item')
        .insert(itemsToInsert)
        .select('id, external_code');

      if (insertError) {
        console.error('Batch insert error:', insertError);
        stats.errors += itemsToInsert.length;
        errors.push({
          row: batchStart,
          message: `Erro ao inserir lote: ${insertError.message}`,
        });
      } else {
        stats.inserted += insertedItems?.length || 0;
        insertedItems?.forEach((item) => {
          insertedIds.set(item.external_code, item.id);
        });
      }
    }

    // Track IDs of items that have price changes (for price history insertion)
    // This needs to be outside the if block to be accessible later
    const itemsWithPriceChanges = new Set<string>();

    // Batch update existing items
    if (itemsToUpdate.length > 0) {
      const itemsWithChanges = itemsToUpdate.filter((item) => item.hasChanges);
      const itemsUnchanged = itemsToUpdate.filter((item) => !item.hasChanges);

      stats.unchanged += itemsUnchanged.length;

      // Add IDs of items that have price changes
      itemsWithChanges.forEach((item) => itemsWithPriceChanges.add(item.id));

      if (itemsWithChanges.length > 0) {
        for (let i = 0; i < itemsWithChanges.length; i += 50) {
          const subBatch = itemsWithChanges.slice(i, i + 50);

          const updatePromises = subBatch.map((item) =>
            supabase
              .from('ref_item')
              .update({
                product_name: item.product_name,
                presentation: item.presentation,
                concentration: item.concentration,
                entry_unit: item.entry_unit,
                base_unit: item.base_unit,
                quantity: item.quantity,
                tiss: item.tiss,
                tuss: item.tuss,
                ean: item.ean,
                manufacturer_code: item.manufacturer_code,
                manufacturer_name: item.manufacturer_name,
                category: item.category,
                subcategory: item.subcategory,
                extra_data: item.extra_data,
                last_import_batch_id: item.last_import_batch_id,
                is_active: item.is_active,
              })
              .eq('id', item.id)
          );

          await Promise.all(updatePromises);
          stats.updated += subBatch.length;
        }
      }
    }

    // Prepare price records
    // Only create price records for NEW items or items that had price changes
    const priceRecords: Array<{
      item_id: string;
      import_batch_id: string;
      price_type: string;
      price_value: number;
      currency: string;
      valid_from: string;
      price_meta: Record<string, unknown>;
    }> = [];

    for (const row of batchRows) {
      if (!row.codigo) continue;

      const isNewItem = insertedIds.has(row.codigo);
      const existingId = existingMap.get(row.codigo);
      const itemId = existingId || insertedIds.get(row.codigo);
      if (!itemId) continue;

      // Only add price history if it's a new item or if prices changed
      const shouldAddPriceHistory = isNewItem || itemsWithPriceChanges.has(itemId);
      if (!shouldAddPriceHistory) continue;

      // Add PF price
      const pfValue = row.prices[pfColumn];
      if (pfValue !== null && pfValue !== undefined) {
        priceRecords.push({
          item_id: itemId,
          import_batch_id: batchId,
          price_type: 'pf',
          price_value: pfValue,
          currency: 'BRL',
          valid_from: referenceDate,
          price_meta: { label: `PF ${taxPercentage}`, source: 'simpro', original_column: pfColumn },
        });
      }

      // Add PMC price
      const pmcValue = row.prices[pmcColumn];
      if (pmcValue !== null && pmcValue !== undefined) {
        priceRecords.push({
          item_id: itemId,
          import_batch_id: batchId,
          price_type: 'pmc',
          price_value: pmcValue,
          currency: 'BRL',
          valid_from: referenceDate,
          price_meta: {
            label: `PMC ${taxPercentage}`,
            source: 'simpro',
            original_column: pmcColumn,
          },
        });
      }
    }

    // Batch insert prices
    if (priceRecords.length > 0) {
      const { error: priceError } = await supabase.from('ref_price_history').upsert(priceRecords, {
        onConflict: 'item_id,price_type,valid_from,import_batch_id',
      });

      if (priceError) {
        console.warn('Price batch insert warning:', priceError);
      }
    }
  }

  // Final progress update
  onProgress?.({
    phase: 'saving',
    current: totalRows,
    total: totalRows,
    percentage: 100,
    message: 'Finalizando importação...',
  });

  return { stats, errors };
}

// ========================================
// Import Processing - BRASÍNDICE specific implementation
// ========================================

const BATCH_SIZE_BRASINDICE = 100;

async function processBrasindiceImport(
  file: File,
  batchId: string,
  sourceId: string,
  companyId: string,
  referenceDate: string,
  taxPercentage: number = 20,
  onProgress?: (progress: ImportProgress) => void,
  abortSignal?: AbortSignal
): Promise<{ stats: ImportResult['stats']; errors: ImportResult['errors']; aborted?: boolean }> {
  // Check for abort before parsing
  if (abortSignal?.aborted) {
    return {
      stats: { read: 0, inserted: 0, updated: 0, unchanged: 0, skipped: 0, errors: 0 },
      errors: [],
      aborted: true,
    };
  }

  onProgress?.({
    phase: 'parsing',
    current: 0,
    total: 1,
    percentage: 0,
    message: 'Lendo arquivo...',
  });

  const parseResult = await parseBrasindiceFileFromFile(file);

  onProgress?.({
    phase: 'parsing',
    current: 1,
    total: 1,
    percentage: 100,
    message: `${parseResult.rows.length.toLocaleString('pt-BR')} registros encontrados`,
  });

  const stats = {
    read: parseResult.stats.total,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    errors: parseResult.stats.errors,
  };

  const errors = [...parseResult.errors];

  const totalRows = parseResult.rows.length;

  // Global cache to track codes already processed in this import (to avoid duplicates across batches)
  const _processedCodesInThisImport = new Set<string>();

  // Phase 2: Process in batches
  for (let batchStart = 0; batchStart < totalRows; batchStart += BATCH_SIZE_BRASINDICE) {
    // Check for abort signal at the start of each batch
    if (abortSignal?.aborted) {
      return { stats, errors, aborted: true };
    }

    const batchEnd = Math.min(batchStart + BATCH_SIZE_BRASINDICE, totalRows);
    let batchRows = parseResult.rows.slice(batchStart, batchEnd);

    // Deduplicate within batch - keep LAST occurrence (which will be the final value saved)
    // This prevents counting changes incorrectly when duplicate rows have different prices
    const batchRowMap = new Map<string, (typeof batchRows)[0]>();
    for (const row of batchRows) {
      batchRowMap.set(row.external_code, row);
    }
    const duplicatesInBatch = batchRows.length - batchRowMap.size;
    if (duplicatesInBatch > 0) {
      stats.skipped += duplicatesInBatch;
    }
    batchRows = Array.from(batchRowMap.values());

    onProgress?.({
      phase: 'processing',
      current: batchStart,
      total: totalRows,
      percentage: Math.round((batchStart / totalRows) * 100),
      message: `Processando ${batchStart.toLocaleString('pt-BR')} de ${totalRows.toLocaleString('pt-BR')}...`,
    });

    // Get all external codes (brasindice_id_code)
    const externalCodes = batchRows.map((r) => r.external_code);

    // Fetch existing items for this batch
    const { data: existingItems } = await supabase
      .from('ref_item')
      .select('id, external_code')
      .eq('company_id', companyId)
      .eq('source_id', sourceId)
      .in('external_code', externalCodes);

    const existingMap = new Map<string, string>();
    const existingItemIds: string[] = [];
    existingItems?.forEach((item) => {
      existingMap.set(item.external_code, item.id);
      existingItemIds.push(item.id);
    });

    // Fetch current prices for existing items
    const existingPricesMap = new Map<string, { pf: number | null; pmc: number | null }>();
    if (existingItemIds.length > 0) {
      const { data: existingPrices } = await supabase
        .from('ref_price_history')
        .select('item_id, price_type, price_value')
        .in('item_id', existingItemIds)
        .in('price_type', ['pf', 'pmc'])
        .order('valid_from', { ascending: false });

      // Get latest price for each item and type
      existingPrices?.forEach((price) => {
        if (!existingPricesMap.has(price.item_id)) {
          existingPricesMap.set(price.item_id, { pf: null, pmc: null });
        }
        const current = existingPricesMap.get(price.item_id)!;
        if (price.price_type === 'pf' && current.pf === null) {
          current.pf = price.price_value;
        }
        if (price.price_type === 'pmc' && current.pmc === null) {
          current.pmc = price.price_value;
        }
      });
    }

    // Prepare batch data
    const itemsToInsert: Array<{
      source_id: string;
      company_id: string;
      external_code: string;
      product_name: string;
      presentation: string | null;
      concentration: string | null;
      entry_unit: string | null;
      base_unit: string | null;
      quantity: number | null;
      tiss: string | null;
      tuss: string | null;
      ean: string | null;
      manufacturer_code: string | null;
      manufacturer_name: string;
      category: string | null;
      subcategory: string | null;
      extra_data: Record<string, unknown>;
      first_import_batch_id: string;
      last_import_batch_id: string;
      is_active: boolean;
    }> = [];

    const itemsToUpdate: Array<{
      id: string;
      product_name: string;
      presentation: string | null;
      concentration: string | null;
      entry_unit: string | null;
      base_unit: string | null;
      quantity: number | null;
      tiss: string | null;
      tuss: string | null;
      ean: string | null;
      manufacturer_code: string | null;
      manufacturer_name: string;
      category: string | null;
      subcategory: string | null;
      extra_data: Record<string, unknown>;
      last_import_batch_id: string;
      is_active: boolean;
      hasChanges: boolean;
    }> = [];

    // Categorize rows
    for (const row of batchRows) {
      if (!row.external_code) {
        stats.skipped++;
        continue;
      }

      const existingId = existingMap.get(row.external_code);
      const refItemData = buildBrasindiceRefItemData(row);
      const itemData = {
        ...refItemData,
        last_import_batch_id: batchId,
        is_active: true,
      };

      if (existingId) {
        // Check if prices changed
        const currentPrices = existingPricesMap.get(existingId) || { pf: null, pmc: null };

        // Normalize prices: treat 0, null, undefined as "no price"
        const normalizePrice = (p: number | null | undefined): number | null => {
          if (p === null || p === undefined || p === 0) return null;
          return Math.round(p * 100) / 100; // Round to 2 decimal places for comparison
        };

        const currentPf = normalizePrice(currentPrices.pf);
        const currentPmc = normalizePrice(currentPrices.pmc);
        const newPf = normalizePrice(row.pf);
        const newPmc = normalizePrice(row.pmc);

        const pfChanged = currentPf !== newPf;
        const pmcChanged = currentPmc !== newPmc;
        const hasChanges = pfChanged || pmcChanged;

        itemsToUpdate.push({ id: existingId, ...itemData, hasChanges });
      } else {
        itemsToInsert.push({
          source_id: sourceId,
          company_id: companyId,
          external_code: row.external_code,
          first_import_batch_id: batchId,
          ...itemData,
        });
      }
    }

    // Remove duplicates within the batch (keep first occurrence)
    const seenCodes = new Set<string>();
    const uniqueItemsToInsert = itemsToInsert.filter((item) => {
      if (seenCodes.has(item.external_code)) {
        stats.skipped++;
        return false;
      }
      seenCodes.add(item.external_code);
      return true;
    });

    // Batch insert new items using upsert to handle race conditions between batches
    const insertedIds = new Map<string, string>();
    if (uniqueItemsToInsert.length > 0) {
      const { data: insertedItems, error: insertError } = await supabase
        .from('ref_item')
        .upsert(uniqueItemsToInsert, {
          onConflict: 'company_id,source_id,external_code',
          ignoreDuplicates: false,
        })
        .select('id, external_code');

      if (insertError) {
        console.error('Batch insert error:', insertError);
        stats.errors += uniqueItemsToInsert.length;
        errors.push({
          row: batchStart,
          message: `Erro ao inserir lote: ${insertError.message}`,
        });
      } else {
        stats.inserted += insertedItems?.length || 0;
        insertedItems?.forEach((item) => {
          insertedIds.set(item.external_code, item.id);
        });
      }
    }

    // Track IDs of items that have price changes
    const itemsWithPriceChanges = new Set<string>();

    // Batch update existing items
    if (itemsToUpdate.length > 0) {
      const itemsWithChanges = itemsToUpdate.filter((item) => item.hasChanges);
      const itemsUnchanged = itemsToUpdate.filter((item) => !item.hasChanges);

      stats.unchanged += itemsUnchanged.length;

      // Add IDs of items that have price changes
      itemsWithChanges.forEach((item) => itemsWithPriceChanges.add(item.id));

      if (itemsWithChanges.length > 0) {
        for (let i = 0; i < itemsWithChanges.length; i += 50) {
          const subBatch = itemsWithChanges.slice(i, i + 50);

          const updatePromises = subBatch.map((item) =>
            supabase
              .from('ref_item')
              .update({
                product_name: item.product_name,
                presentation: item.presentation,
                concentration: item.concentration,
                entry_unit: item.entry_unit,
                base_unit: item.base_unit,
                quantity: item.quantity,
                tiss: item.tiss,
                tuss: item.tuss,
                ean: item.ean,
                manufacturer_code: item.manufacturer_code,
                manufacturer_name: item.manufacturer_name,
                category: item.category,
                subcategory: item.subcategory,
                extra_data: item.extra_data,
                last_import_batch_id: item.last_import_batch_id,
                is_active: item.is_active,
              })
              .eq('id', item.id)
          );

          await Promise.all(updatePromises);
          stats.updated += subBatch.length;
        }
      }
    }

    // Prepare price records
    const priceRecords: Array<{
      item_id: string;
      import_batch_id: string;
      price_type: string;
      price_value: number;
      currency: string;
      valid_from: string;
      price_meta: Record<string, unknown>;
    }> = [];

    for (const row of batchRows) {
      if (!row.external_code) continue;

      const isNewItem = insertedIds.has(row.external_code);
      const existingId = existingMap.get(row.external_code);
      const itemId = existingId || insertedIds.get(row.external_code);
      if (!itemId) continue;

      // Only add price history if it's a new item or if prices changed
      const shouldAddPriceHistory = isNewItem || itemsWithPriceChanges.has(itemId);
      if (!shouldAddPriceHistory) continue;

      // Add PF price (skip zero prices - they indicate no price available)
      if (row.pf !== null && row.pf !== undefined && row.pf > 0) {
        priceRecords.push({
          item_id: itemId,
          import_batch_id: batchId,
          price_type: 'pf',
          price_value: row.pf,
          currency: 'BRL',
          valid_from: referenceDate,
          price_meta: { label: `PF ${taxPercentage}`, source: 'brasindice' },
        });
      }

      // Add PMC price (skip zero prices - they indicate no price available)
      if (row.pmc !== null && row.pmc !== undefined && row.pmc > 0) {
        priceRecords.push({
          item_id: itemId,
          import_batch_id: batchId,
          price_type: 'pmc',
          price_value: row.pmc,
          currency: 'BRL',
          valid_from: referenceDate,
          price_meta: { label: `PMC ${taxPercentage}`, source: 'brasindice' },
        });
      }
    }

    // Deduplicate price records (in case of duplicate rows in the file)
    // Use item_id + price_type as key, keep the last occurrence
    const priceMap = new Map<string, (typeof priceRecords)[0]>();
    for (const price of priceRecords) {
      const key = `${price.item_id}_${price.price_type}`;
      priceMap.set(key, price);
    }
    const uniquePriceRecords = Array.from(priceMap.values());

    // Batch insert prices
    if (uniquePriceRecords.length > 0) {
      const { error: priceError } = await supabase
        .from('ref_price_history')
        .upsert(uniquePriceRecords, {
          onConflict: 'item_id,price_type,valid_from,import_batch_id',
        });

      if (priceError) {
        console.warn('Price batch insert warning:', priceError);
      }
    }
  }

  // Final progress update
  onProgress?.({
    phase: 'saving',
    current: totalRows,
    total: totalRows,
    percentage: 100,
    message: 'Finalizando importação...',
  });

  return { stats, errors };
}

// ========================================
// Clean Orphaned Data from Failed Imports
// ========================================

async function cleanupFailedBatch(batchId: string, sourceId: string, companyId: string) {
  try {
    // Delete prices from this batch
    const { error: priceError } = await supabase
      .from('ref_price_history')
      .delete()
      .eq('import_batch_id', batchId);

    if (priceError) console.error('Error deleting prices:', priceError);

    // Find items that were inserted ONLY in this batch
    const { data: items } = await supabase
      .from('ref_item')
      .select('id, first_import_batch_id')
      .eq('source_id', sourceId)
      .eq('company_id', companyId)
      .eq('first_import_batch_id', batchId);

    if (items && items.length > 0) {
      const itemIds = items.map((i) => i.id);

      // Delete these items (they were new in this batch)
      await supabase.from('ref_item').delete().in('id', itemIds);
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

export function useProcessRefImport() {
  const queryClient = useQueryClient();
  const { company, appUser } = useAuthStore();
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [onBatchCreated, setOnBatchCreated] = useState<((batchId: string) => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isAborting, setIsAborting] = useState(false);

  // Function to abort the current import
  const abortCurrentImport = () => {
    if (abortControllerRef.current) {
      setIsAborting(true);
      abortControllerRef.current.abort();
      toast.success('Abortando importação...');
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: {
      sourceCode: string;
      sourceId: string;
      file: File;
      options?: {
        referenceDate?: string;
        pfColumn?: string;
        pmcColumn?: string;
        taxPercentage?: number;
      };
    }): Promise<ImportResult> => {
      if (!company?.id) throw new Error('Company not found');

      // Create a new AbortController for this import
      abortControllerRef.current = new AbortController();
      setIsAborting(false);

      // Create batch
      const { data: batch, error: batchError } = await supabase
        .from('ref_import_batch')
        .insert({
          source_id: data.sourceId,
          company_id: company.id,
          status: 'running',
          started_at: new Date().toISOString(),
          file_name: data.file.name,
          file_size: data.file.size,
          import_options: data.options || {},
          created_by: appUser?.id,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Notify parent component that batch was created
      onBatchCreated?.(batch.id);

      try {
        // Skip file upload to storage for large files - we only need to process the data
        // const filePath = `${company.id}/${batch.id}/${data.file.name}`;
        // const { error: uploadError } = await supabase.storage
        //   .from("reference-imports")
        //   .upload(filePath, data.file);
        // if (uploadError) {
        //   console.warn("File upload failed:", uploadError);
        // }
        // await supabase.from("ref_import_batch").update({ file_path: filePath }).eq("id", batch.id);

        // Reference date (from options or extract from filename or use today)
        const referenceDate = data.options?.referenceDate || todayDateOnly();

        // Price column options (default to 18% if not specified)
        const pfColumn = data.options?.pfColumn || 'pf_18';
        const pmcColumn = data.options?.pmcColumn || 'pmc_18';
        const simproPfColumn = data.options?.pfColumn || 'preco_pf';
        const simproPmcColumn = data.options?.pmcColumn || 'preco_pmc';

        // Reset progress
        setProgress(null);

        // Get the abort signal
        const abortSignal = abortControllerRef.current?.signal;

        // Process based on source type
        let result: {
          stats: ImportResult['stats'];
          errors: ImportResult['errors'];
          aborted?: boolean;
        };

        if (data.sourceCode === 'cmed') {
          result = await processCmedImport(
            data.file,
            batch.id,
            data.sourceId,
            company.id,
            referenceDate,
            pfColumn,
            pmcColumn,
            setProgress,
            abortSignal
          );
        } else if (data.sourceCode === 'simpro') {
          result = await processSimproImport(
            data.file,
            batch.id,
            data.sourceId,
            company.id,
            referenceDate,
            simproPfColumn,
            simproPmcColumn,
            data.options?.taxPercentage || 20,
            setProgress,
            abortSignal
          );
        } else if (data.sourceCode === 'brasindice') {
          result = await processBrasindiceImport(
            data.file,
            batch.id,
            data.sourceId,
            company.id,
            referenceDate,
            data.options?.taxPercentage || 20,
            setProgress,
            abortSignal
          );
        } else {
          // For other sources, just mark as not implemented yet
          result = {
            stats: { read: 0, inserted: 0, updated: 0, unchanged: 0, skipped: 0, errors: 1 },
            errors: [
              { row: 0, message: `Importador para ${data.sourceCode} ainda não implementado` },
            ],
          };
        }

        // Handle abort case
        if (result.aborted) {
          // Update batch as aborted
          await supabase
            .from('ref_import_batch')
            .update({
              status: 'failed',
              finished_at: new Date().toISOString(),
              rows_read: result.stats.read,
              rows_inserted: result.stats.inserted,
              rows_updated: result.stats.updated,
              rows_skipped: result.stats.skipped,
              rows_error: result.stats.errors,
              error_summary: 'Importação abortada pelo usuário',
            })
            .eq('id', batch.id);

          // Clean up data from aborted batch
          await cleanupFailedBatch(batch.id, data.sourceId, company.id);

          throw new Error('Importação abortada pelo usuário');
        }

        // Insert errors into ref_import_error table
        if (result.errors.length > 0) {
          const errorRecords = result.errors.slice(0, 100).map((err) => ({
            batch_id: batch.id,
            row_number: err.row,
            raw_data: err.data || null,
            error_type: 'processing',
            error_message: err.message,
          }));

          await supabase.from('ref_import_error').insert(errorRecords);
        }

        // Update batch with final stats
        const finalStatus =
          result.errors.length === 0
            ? 'success'
            : result.stats.inserted + result.stats.updated > 0
              ? 'partial'
              : 'failed';

        await supabase
          .from('ref_import_batch')
          .update({
            status: finalStatus,
            finished_at: new Date().toISOString(),
            rows_read: result.stats.read,
            rows_inserted: result.stats.inserted,
            rows_updated: result.stats.updated,
            rows_skipped: result.stats.skipped,
            rows_error: result.stats.errors,
            error_summary:
              result.errors.length > 0 ? `${result.errors.length} erros encontrados` : null,
          })
          .eq('id', batch.id);

        // Refetch the batch
        // Fetch updated batch status
        const { data: updatedBatch, error: fetchError } = await supabase
          .from('ref_import_batch')
          .select(
            'id, source_id, company_id, status, file_name, file_size, rows_read, rows_inserted, rows_updated, rows_skipped, rows_error, error_summary, created_at, finished_at'
          )
          .eq('id', batch.id)
          .single();

        if (fetchError) throw fetchError;

        return {
          success: result.errors.length === 0,
          batch: updatedBatch as RefImportBatch,
          stats: result.stats,
          errors: result.errors,
        };
      } catch (error: any) {
        // Clean up any data that was inserted in this failed batch
        await cleanupFailedBatch(batch.id, data.sourceId, company.id);

        // Update batch with error
        await supabase
          .from('ref_import_batch')
          .update({
            status: 'failed',
            finished_at: new Date().toISOString(),
            error_summary: error.message,
          })
          .eq('id', batch.id);

        throw error;
      }
    },
    onSuccess: (result) => {
      setProgress(null);
      setIsAborting(false);
      abortControllerRef.current = null;
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      if (result.success) {
        toast.success(
          `Importação concluída: ${result.stats.inserted} inseridos, ${result.stats.updated} atualizados`
        );
      } else {
        toast.success(
          `Importação parcial: ${result.stats.inserted} inseridos, ${result.stats.updated} atualizados, ${result.stats.errors} erros`
        );
      }
    },
    onError: (error: Error) => {
      setProgress(null);
      setIsAborting(false);
      abortControllerRef.current = null;
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      // Don't show error toast if it was an abort
      if (error.message !== 'Importação abortada pelo usuário') {
        toast.error(`Erro na importação: ${error.message}`);
      }
    },
  });

  return {
    ...mutation,
    progress,
    setOnBatchCreated,
    abortImport: abortCurrentImport,
    isAborting,
  };
}

// ========================================
// Search Ref Items (for linking products)
// ========================================

export function useSearchRefItems(searchTerm: string, sourceCode?: string) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, 'search-items', company?.id, searchTerm, sourceCode],
    queryFn: async () => {
      if (!company?.id || searchTerm.length < 2) return [];

      let query = supabase
        .from('ref_item')
        .select(
          `
          *,
          source:ref_source(*)
        `
        )
        .eq('company_id', company.id)
        .eq('is_active', true)
        .or(
          `description.ilike.%${searchTerm}%,external_code.ilike.%${searchTerm}%,ean.ilike.%${searchTerm}%`
        )
        .limit(50);

      if (sourceCode) {
        query = query.eq('source.code', sourceCode);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as (RefItem & { source: RefSource })[];
    },
    enabled: !!company?.id && searchTerm.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });
}

// ========================================
// Search Unified Ref Items View (for linking products with consolidated data)
// ========================================

import type { RefItemUnified } from '@/types/database';

export function useSearchRefItemsUnified(searchTerm: string) {
  return useQuery({
    queryKey: [QUERY_KEY, 'search-items-unified', searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 2) return [];

      const searchPattern = `%${searchTerm}%`;

      // Busca por nome, EAN, fabricante, substância (princípio ativo), códigos e classificação fiscal
      const { data, error } = await supabase
        .from('vw_ref_item_unified')
        .select('*')
        .or(`nome.ilike.${searchPattern},ean.ilike.${searchPattern}`)
        .or(`fabricante.ilike.${searchPattern},substancia.ilike.${searchPattern}`)
        .or(`concentracao.ilike.${searchPattern},ggrem.ilike.${searchPattern}`)
        .or(`brasindice_codigo.ilike.${searchPattern},simpro_codigo.ilike.${searchPattern}`)
        .or(`tiss.ilike.${searchPattern},tuss.ilike.${searchPattern}`)
        .order('nome')
        .limit(50);

      if (error) throw error;
      return data as RefItemUnified[];
    },
    enabled: searchTerm.length >= 2,
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Fetch multiple reference items by EANs optimized for NFe processing
 * First tries the materialized view for known products, then falls back to unified view for missing EANs
 * Returns a Map of EAN -> RefItemUnified for fast lookups
 */
export async function fetchRefItemsBatchByEans(
  eans: string[],
  companyId: string
): Promise<Map<string, RefItemUnified>> {
  const result = new Map<string, RefItemUnified>();

  if (eans.length === 0 || !companyId) return result;

  const cleanEans = eans.map((ean) => ean.trim()).filter((ean) => ean.length > 0);
  if (cleanEans.length === 0) return result;

  // First: get price information from the optimized materialized view
  const { data: priceData, error: priceError } = await supabase
    .from('mv_known_products_ref_prices')
    .select('*')
    .eq('company_id', companyId)
    .in('ean', cleanEans);

  console.warn(`fetchRefItemsBatchByEans: Querying price view for ${cleanEans.length} EANs`);
  console.warn(`fetchRefItemsBatchByEans: EANs to search:`, cleanEans);

  const priceMap = new Map<string, any>();
  if (priceError) {
    console.warn('Error querying price materialized view for batch EANs:', priceError);
  } else if (priceData) {
    console.warn(
      `Found ${priceData.length}/${cleanEans.length} price entries in materialized view`
    );
    console.warn(`Price data:`, priceData);
    priceData.forEach((item) => {
      priceMap.set(item.ean, item);
    });
  } else {
    console.warn('No price data returned from materialized view');
  }

  // Second: get product information from the known products materialized view
  const { data: knownProducts, error: knownError } = await supabase
    .from('mv_known_products_ref')
    .select('*')
    .eq('company_id', companyId)
    .in('ean', cleanEans);

  if (knownError) {
    console.warn('Error querying product materialized view for batch EANs:', knownError);
  } else if (knownProducts) {
    console.warn(
      `Found ${knownProducts.length}/${cleanEans.length} product entries in materialized view`
    );
    knownProducts.forEach((productItem) => {
      const priceItem = priceMap.get(productItem.ean);

      // Merge product data with price data
      const mergedItem = {
        ...productItem,
        // Add price fields based on the source priority from the price view
        cmed_pf: priceItem?.source === 'cmed' ? priceItem?.pf : null,
        cmed_pf_label: priceItem?.source === 'cmed' ? priceItem?.pf_label : null,
        cmed_pmc: priceItem?.source === 'cmed' ? priceItem?.pmc : null,
        cmed_pmc_label: priceItem?.source === 'cmed' ? priceItem?.pmc_label : null,
        brasindice_pf: priceItem?.source === 'brasindice' ? priceItem?.pf : null,
        brasindice_pf_label: priceItem?.source === 'brasindice' ? priceItem?.pf_label : null,
        brasindice_pmc: priceItem?.source === 'brasindice' ? priceItem?.pmc : null,
        brasindice_pmc_label: priceItem?.source === 'brasindice' ? priceItem?.pmc_label : null,
        simpro_pf: priceItem?.source === 'simpro' ? priceItem?.pf : null,
        simpro_pf_label: priceItem?.source === 'simpro' ? priceItem?.pf_label : null,
        simpro_pmc: priceItem?.source === 'simpro' ? priceItem?.pmc : null,
        simpro_pmc_label: priceItem?.source === 'simpro' ? priceItem?.pmc_label : null,
        // Also add best available price regardless of source for easier access
        best_pf: priceItem?.pf,
        best_pf_label: priceItem?.pf_label,
        best_pmc: priceItem?.pmc,
        best_pmc_label: priceItem?.pmc_label,
        price_source: priceItem?.source,
        price_date: priceItem?.price_date,
      } as RefItemUnified;

      // Debug log for price data
      if (priceItem) {
        console.warn(`Price data for EAN ${productItem.ean}:`, {
          source: priceItem.source,
          pf: priceItem.pf,
          pmc: priceItem.pmc,
          pf_label: priceItem.pf_label,
          pmc_label: priceItem.pmc_label,
        });
      }

      result.set(productItem.ean, mergedItem);
    });
  }

  // Find EANs not found in materialized views
  const missingEans = cleanEans.filter((ean) => !result.has(ean));

  if (missingEans.length > 0) {
    console.warn(`Looking up ${missingEans.length} missing EANs in full unified view`);

    // Batch fallback: try unified view for missing EANs (slower but comprehensive)
    const { data: unifiedItems, error: unifiedError } = await supabase
      .from('vw_ref_item_unified')
      .select('*')
      .in('ean', missingEans);

    if (unifiedError) {
      console.error('Error querying unified view for missing EANs:', unifiedError);
    } else if (unifiedItems) {
      console.warn(
        `Found ${unifiedItems.length}/${missingEans.length} additional items in unified view`
      );
      unifiedItems.forEach((item) => {
        result.set(item.ean, item as RefItemUnified);
      });
    }
  }

  return result;
}

/**
 * Hook to refresh the materialized view for known products
 * Should be called when new presentations are added to ensure the view is up to date
 */
export function useRefreshKnownProductsView() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('refresh_known_products_ref_view');
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      console.warn('Materialized view refreshed successfully');
    },
    onError: (error) => {
      console.error('Error refreshing materialized view:', error);
    },
  });
}

/**
 * Hook to refresh the materialized view for known products prices
 * Should be called to update the price materialized view
 */
export function useRefreshKnownProductsPricesView() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('refresh_known_products_ref_prices_view');
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      console.warn('Price materialized view refreshed successfully');
    },
    onError: (error) => {
      console.error('Error refreshing price materialized view:', error);
    },
  });
}

/**
 * Test function to check if price materialized view has data
 */
export async function testPriceMaterializedView(companyId: string) {
  console.warn('Testing price materialized view...');

  const { data, error, count } = await supabase
    .from('mv_known_products_ref_prices')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .limit(10);

  console.warn('Price materialized view test results:', {
    error,
    count,
    sampleData: data,
  });

  return { data, error, count };
}

/**
 * Fetch unified ref item data by EAN
 * Used for creating presentations with data from reference tables
 * First tries the materialized view for known products (fast), then falls back to unified view (slow)
 * Also includes price information (PF, PMC) from ref_price_history
 */
export async function fetchRefItemUnifiedByEan(
  ean: string,
  companyId?: string
): Promise<RefItemUnified | null> {
  if (!ean || ean.trim() === '') return null;

  const cleanEan = ean.trim();

  // First try the materialized view for known products (much faster) if companyId is provided
  if (companyId) {
    const { data: knownProductData, error: knownProductError } = await supabase
      .from('mv_known_products_ref')
      .select('*')
      .eq('company_id', companyId)
      .eq('ean', cleanEan)
      .maybeSingle();

    if (knownProductError) {
      console.warn(
        'Error querying materialized view for EAN',
        cleanEan,
        ':',
        knownProductError,
        '- falling back to unified view'
      );
    }

    if (knownProductData) {
      console.warn('Found in materialized view (known products):', knownProductData);
      return knownProductData as RefItemUnified;
    }
  }

  // Fallback: try the full unified view (slower but comprehensive)
  console.warn('Not found in known products, trying full unified view for EAN:', cleanEan);

  let query = supabase.from('vw_ref_item_unified').select('*').eq('ean', cleanEan);

  // If companyId is provided, filter by it to get specific company data
  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data: unifiedData, error: unifiedError } = await query.limit(1).maybeSingle();

  if (unifiedError) {
    console.error(
      'Database error when querying vw_ref_item_unified for EAN',
      cleanEan,
      ':',
      unifiedError
    );
    return null;
  }

  if (unifiedData) {
    console.warn('Found in vw_ref_item_unified:', unifiedData);

    // Fetch prices for the ref items found
    const refItemUnified = unifiedData as RefItemUnified;

    // Fetch prices for each source
    const itemIds = [
      refItemUnified.cmed_item_id,
      refItemUnified.brasindice_item_id,
      refItemUnified.simpro_item_id,
    ].filter(Boolean);

    if (itemIds.length > 0) {
      try {
        const { data: prices, error: priceError } = await supabase
          .from('ref_price_history')
          .select('*')
          .in('item_id', itemIds)
          .order('valid_from', { ascending: false });

        if (priceError) {
          console.warn('Error fetching price history for items', itemIds, ':', priceError);
          // Continue without prices - they are not essential for the main functionality
        } else if (prices && prices.length > 0) {
          // Map prices by item_id, getting the latest for each price_type
          const priceMap = new Map<string, Map<string, any>>();

          for (const price of prices) {
            if (!priceMap.has(price.item_id)) {
              priceMap.set(price.item_id, new Map());
            }
            const itemPrices = priceMap.get(price.item_id)!;
            if (!itemPrices.has(price.price_type)) {
              itemPrices.set(price.price_type, price);
            }
          }

          // Assign prices to unified item
          if (refItemUnified.cmed_item_id && priceMap.has(refItemUnified.cmed_item_id)) {
            const cmedPrices = priceMap.get(refItemUnified.cmed_item_id)!;
            const pfPrice = cmedPrices.get('pf');
            const pmcPrice = cmedPrices.get('pmc');
            if (pfPrice) {
              refItemUnified.cmed_pf = pfPrice.price_value;
              refItemUnified.cmed_pf_label =
                (pfPrice.price_meta as Record<string, any>)?.label || null;
              refItemUnified.cmed_pf_date = pfPrice.valid_from;
            }
            if (pmcPrice) {
              refItemUnified.cmed_pmc = pmcPrice.price_value;
              refItemUnified.cmed_pmc_label =
                (pmcPrice.price_meta as Record<string, any>)?.label || null;
            }
          }

          if (
            refItemUnified.brasindice_item_id &&
            priceMap.has(refItemUnified.brasindice_item_id)
          ) {
            const brasindicePrices = priceMap.get(refItemUnified.brasindice_item_id)!;
            const pfPrice = brasindicePrices.get('pf');
            const pmcPrice = brasindicePrices.get('pmc');
            if (pfPrice) {
              refItemUnified.brasindice_pf = pfPrice.price_value;
              refItemUnified.brasindice_pf_label =
                (pfPrice.price_meta as Record<string, any>)?.label || null;
              refItemUnified.brasindice_pf_date = pfPrice.valid_from;
            }
            if (pmcPrice) {
              refItemUnified.brasindice_pmc = pmcPrice.price_value;
              refItemUnified.brasindice_pmc_label =
                (pmcPrice.price_meta as Record<string, any>)?.label || null;
            }
          }

          if (refItemUnified.simpro_item_id && priceMap.has(refItemUnified.simpro_item_id)) {
            const simproPrices = priceMap.get(refItemUnified.simpro_item_id)!;
            const pfPrice = simproPrices.get('pf');
            const pmcPrice = simproPrices.get('pmc');
            if (pfPrice) {
              refItemUnified.simpro_pf = pfPrice.price_value;
              refItemUnified.simpro_pf_label =
                (pfPrice.price_meta as Record<string, any>)?.label || null;
              refItemUnified.simpro_pf_date = pfPrice.valid_from;
            }
            if (pmcPrice) {
              refItemUnified.simpro_pmc = pmcPrice.price_value;
              refItemUnified.simpro_pmc_label =
                (pmcPrice.price_meta as Record<string, any>)?.label || null;
            }
          }
        }
      } catch (priceQueryError) {
        console.warn('Failed to fetch price history:', priceQueryError);
        // Continue without prices - they are not essential for the main functionality
      }
    }

    return refItemUnified;
  }

  // Fallback: query ref_item directly (the view filters out items without fabricante)
  console.warn('Not found in unified view, trying ref_item directly for EAN:', cleanEan);

  const { data: refItemData, error: refItemError } = await supabase
    .from('ref_item')
    .select('*')
    .eq('ean', cleanEan)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (refItemError) {
    console.error('Database error when querying ref_item for EAN', cleanEan, ':', refItemError);
    return null;
  }

  if (!refItemData) {
    console.warn('No reference data found for EAN:', cleanEan);
    return null;
  }

  console.warn('Found in ref_item:', refItemData);

  // Convert ref_item to RefItemUnified format
  return {
    ean: refItemData.ean,
    name:
      refItemData.product_name + (refItemData.presentation ? ' ' + refItemData.presentation : ''),
    quantity: refItemData.quantity,
    unit: refItemData.base_unit,
    concentration: refItemData.concentration,
    manufacturer: refItemData.manufacturer_name,
    cnpj: refItemData.extra_data?.cnpj || null,
    tiss: refItemData.tiss,
    tuss: refItemData.tuss,
    substance: refItemData.extra_data?.substancia || null,
    ggrem_code: null,
    brasindice_code: refItemData.external_code,
    simpro_code: null,
    cmed_item_id: null,
    brasindice_item_id: refItemData.id,
    simpro_item_id: null,
  } as RefItemUnified;
}

/**
 * Hook to fetch unified ref item data by EAN
 */
export function useRefItemUnifiedByEan(ean: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, 'unified-by-ean', ean],
    queryFn: async () => {
      if (!ean) return null;
      return fetchRefItemUnifiedByEan(ean);
    },
    enabled: !!ean,
    staleTime: 60000, // Cache for 1 minute
  });
}

// ========================================
// Reference Item Lookup by EAN (for NFe import suggestions)
// Uses ref_item table which contains imported CMED, SIMPRO, BRASINDICE data
// ========================================

export interface RefItemWithPrices extends RefItem {
  source?: RefSource;
  current_prices?: RefPriceHistory[];
}

/**
 * Search ref_item table by EAN code
 * Used when NFe import has EAN but no product relationship
 */
export async function searchRefItemByEan(
  companyId: string,
  ean: string
): Promise<RefItemWithPrices | null> {
  if (!ean || ean.trim() === '') return null;

  const cleanEan = ean.trim();

  const { data, error } = await supabase
    .from('ref_item')
    .select(
      `
      *,
      source:ref_source(*),
      current_prices:ref_price_history(*)
    `
    )
    .eq('company_id', companyId)
    .eq('ean', cleanEan)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error searching ref_item by EAN:', error);
    return null;
  }

  return data as RefItemWithPrices | null;
}

/**
 * Search multiple EANs in ref_item table
 * Returns a map of EAN -> RefItemWithPrices
 */
export async function searchRefItemsByEans(
  companyId: string,
  eans: string[]
): Promise<Map<string, RefItemWithPrices>> {
  const result = new Map<string, RefItemWithPrices>();

  if (!eans.length || !companyId) return result;

  // Filter valid EANs
  const validEans = [...new Set(eans.filter((e) => e && e.trim() !== ''))];
  if (!validEans.length) return result;

  const { data, error } = await supabase
    .from('ref_item')
    .select(
      `
      *,
      source:ref_source(*),
      current_prices:ref_price_history(*)
    `
    )
    .eq('company_id', companyId)
    .in('ean', validEans)
    .eq('is_active', true);

  if (error) {
    console.error('Error searching ref_items by EANs:', error);
    return result;
  }

  if (data) {
    for (const item of data as RefItemWithPrices[]) {
      if (item.ean && validEans.includes(item.ean) && !result.has(item.ean)) {
        result.set(item.ean, item);
      }
    }
  }

  return result;
}

/**
 * Hook to search ref_item by EAN
 */
export function useRefItemByEan(ean: string | null | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, 'ref-item-by-ean', company?.id, ean],
    queryFn: async () => {
      if (!company?.id || !ean) return null;
      return searchRefItemByEan(company.id, ean);
    },
    enabled: !!company?.id && !!ean,
    staleTime: 60000, // Cache for 1 minute
  });
}

// ========================================
// Product Ref Links
// ========================================

export function useProductRefLinks(productId: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, 'product-links', productId],
    queryFn: async () => {
      if (!company?.id || !productId) return [];

      const { data, error } = await supabase
        .from('product_ref_link')
        .select(
          `
          *,
          source:ref_source(*),
          ref_item:ref_item(*)
        `
        )
        .eq('company_id', company.id)
        .eq('product_id', productId);

      if (error) throw error;

      // For each link, fetch the latest prices for the ref_item
      const linksWithPrices = await Promise.all(
        (data || []).map(async (link: any) => {
          const item = link.ref_item;
          if (item) {
            // Get the latest PF and PMC prices
            const { data: prices } = await supabase
              .from('ref_price_history')
              .select('*')
              .eq('item_id', item.id)
              .in('price_type', ['pf', 'pmc'])
              .order('valid_from', { ascending: false })
              .limit(10);

            // Get only the most recent for each price type
            const priceMap = new Map<string, RefPriceHistory>();
            (prices || []).forEach((p: RefPriceHistory) => {
              if (!priceMap.has(p.price_type)) {
                priceMap.set(p.price_type, p);
              }
            });
            item.current_prices = Array.from(priceMap.values());
          }
          return link;
        })
      );

      return linksWithPrices;
    },
    enabled: !!company?.id && !!productId,
  });
}

export function useLinkProductToRefItem() {
  const { company } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      refItemId,
      sourceId,
      isPrimary = false,
      conversionFactor = 1,
      notes,
    }: {
      productId: string;
      refItemId: string;
      sourceId: string;
      isPrimary?: boolean;
      conversionFactor?: number;
      notes?: string;
    }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      // If setting as primary, unset any existing primary for this product
      if (isPrimary) {
        await supabase
          .from('product_ref_link')
          .update({ is_primary: false })
          .eq('company_id', company.id)
          .eq('product_id', productId)
          .eq('is_primary', true);
      }

      const { data, error } = await supabase
        .from('product_ref_link')
        .upsert(
          {
            company_id: company.id,
            product_id: productId,
            ref_item_id: refItemId,
            source_id: sourceId,
            is_primary: isPrimary,
            conversion_factor: conversionFactor,
            notes: notes || null,
          },
          {
            onConflict: 'product_id,source_id',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, 'product-links', variables.productId],
      });
      toast.success('Vínculo salvo com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao vincular: ${error.message}`);
    },
  });
}

export function useUnlinkProductFromRefItem() {
  const { company } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, sourceId }: { productId: string; sourceId: string }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      const { error } = await supabase
        .from('product_ref_link')
        .delete()
        .eq('company_id', company.id)
        .eq('product_id', productId)
        .eq('source_id', sourceId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, 'product-links', variables.productId],
      });
      toast.success('Vínculo removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover vínculo: ${error.message}`);
    },
  });
}

export function useSetPrimaryRefLink() {
  const { company } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, linkId }: { productId: string; linkId: string }) => {
      if (!company?.id) throw new Error('Empresa não encontrada');

      // First, unset all primary flags for this product
      await supabase
        .from('product_ref_link')
        .update({ is_primary: false })
        .eq('company_id', company.id)
        .eq('product_id', productId);

      // Then set the selected link as primary
      const { data, error } = await supabase
        .from('product_ref_link')
        .update({ is_primary: true })
        .eq('id', linkId)
        .eq('company_id', company.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, 'product-links', variables.productId],
      });
      toast.success('Referência principal definida');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao definir principal: ${error.message}`);
    },
  });
}

// ========================================
// Bulk Fetch Ref Prices for Products
// ========================================

export interface ProductRefPriceData {
  productId: string;
  refItemId: string | null;
  pfPrice: number | null;
  pmcPrice: number | null;
  pfLabel: string | null;
  pmcLabel: string | null;
}

/**
 * Fetch reference prices for multiple products at once
 * Uses the product_ref_link table to find linked ref_items
 */
export async function fetchProductsRefPrices(
  companyId: string,
  productIds: string[]
): Promise<Map<string, ProductRefPriceData>> {
  const result = new Map<string, ProductRefPriceData>();

  if (!productIds.length || !companyId) return result;

  const uniqueProductIds = [...new Set(productIds.filter(Boolean))];
  if (!uniqueProductIds.length) return result;

  // Fetch all product_ref_links for the given products (primary links preferred)
  const { data: links, error: linksError } = await supabase
    .from('product_ref_link')
    .select(
      `
      product_id,
      ref_item_id,
      is_primary
    `
    )
    .eq('company_id', companyId)
    .in('product_id', uniqueProductIds);

  if (linksError || !links || links.length === 0) {
    return result;
  }

  // Group by product_id, preferring primary links
  const productToRefItem = new Map<string, string>();
  for (const link of links) {
    if (!productToRefItem.has(link.product_id) || link.is_primary) {
      productToRefItem.set(link.product_id, link.ref_item_id);
    }
  }

  const refItemIds = [...new Set(productToRefItem.values())];
  if (!refItemIds.length) return result;

  // Fetch latest prices for all ref_items
  const { data: prices, error: pricesError } = await supabase
    .from('ref_price_history')
    .select('*')
    .in('item_id', refItemIds)
    .in('price_type', ['pf', 'pmc'])
    .order('valid_from', { ascending: false });

  if (pricesError) {
    console.error('Error fetching ref prices:', pricesError);
    return result;
  }

  // Build a map of ref_item_id -> { pf, pmc }
  const refItemPrices = new Map<
    string,
    { pf: RefPriceHistory | null; pmc: RefPriceHistory | null }
  >();
  for (const price of prices || []) {
    const existing = refItemPrices.get(price.item_id) || { pf: null, pmc: null };
    if (price.price_type === 'pf' && !existing.pf) {
      existing.pf = price as RefPriceHistory;
    } else if (price.price_type === 'pmc' && !existing.pmc) {
      existing.pmc = price as RefPriceHistory;
    }
    refItemPrices.set(price.item_id, existing);
  }

  // Build result map
  for (const [productId, refItemId] of productToRefItem.entries()) {
    const itemPrices = refItemPrices.get(refItemId);
    result.set(productId, {
      productId,
      refItemId,
      pfPrice: itemPrices?.pf?.price_value ?? null,
      pmcPrice: itemPrices?.pmc?.price_value ?? null,
      pfLabel:
        ((itemPrices?.pf?.price_meta as Record<string, unknown>)?.label as string | null) ?? null,
      pmcLabel:
        ((itemPrices?.pmc?.price_meta as Record<string, unknown>)?.label as string | null) ?? null,
    });
  }

  return result;
}

// ========================================
// Abort Import
// ========================================

export function useAbortImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      // Update batch status to failed
      const { error: updateError } = await supabase
        .from('ref_import_batch')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_summary: 'Importação abortada pelo usuário',
        })
        .eq('id', batchId);

      if (updateError) throw updateError;

      return { batchId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Importação abortada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao abortar importação: ${error.message}`);
    },
  });
}

// ========================================
// Reset Stuck Imports
// ========================================

export function useResetStuckImports() {
  const { company } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('Company not found');

      // Find batches stuck in "running" status
      const { data: stuckBatches, error: fetchError } = await supabase
        .from('ref_import_batch')
        .select('id, status')
        .eq('company_id', company.id)
        .eq('status', 'running');

      if (fetchError) throw fetchError;

      if (!stuckBatches || stuckBatches.length === 0) {
        return { message: 'Nenhuma importação em execução para resetar' };
      }

      // Reset stuck batches to "failed" status
      const { error: updateError } = await supabase
        .from('ref_import_batch')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_summary: 'Importação interrompida manualmente',
        })
        .eq('company_id', company.id)
        .eq('status', 'running');

      if (updateError) throw updateError;

      return {
        message: `${stuckBatches.length} importação(ões) resetada(s)`,
        count: stuckBatches.length,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Importações foram resetadas');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao resetar importações: ${error.message}`);
    },
  });
}

// ========================================
// Delete Import Batch (only price records)
// ========================================

export function useDeleteImportBatch() {
  const { company } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      console.warn('[useDeleteImportBatch] Starting deletion for batch:', batchId);

      // Show loading toast
      const loadingToast = toast.loading('Removendo registros de preço...');

      try {
        if (!company?.id) {
          console.error('[useDeleteImportBatch] Company not found');
          throw new Error('Company not found');
        }
        console.warn('[useDeleteImportBatch] Company ID:', company.id);

        // 1. Verify the batch belongs to this company
        console.warn('[useDeleteImportBatch] Step 1: Fetching batch...');
        const { data: batch, error: fetchError } = await supabase
          .from('ref_import_batch')
          .select('id, status, file_name')
          .eq('id', batchId)
          .eq('company_id', company.id)
          .single();

        if (fetchError) {
          console.error('[useDeleteImportBatch] Fetch error:', fetchError);
          throw new Error('Lote de importação não encontrado');
        }
        if (!batch) {
          console.error('[useDeleteImportBatch] Batch not found');
          throw new Error('Lote de importação não encontrado');
        }
        console.warn('[useDeleteImportBatch] Batch found:', batch);

        // 2. Delete price history records for this batch
        console.warn('[useDeleteImportBatch] Step 2: Deleting price history records...');
        toast.loading('Deletando registros de preço...', { id: loadingToast });

        const { error: deletePricesError, count: deletedCount } = await supabase
          .from('ref_price_history')
          .delete({ count: 'exact' })
          .eq('import_batch_id', batchId);

        if (deletePricesError) {
          console.error('[useDeleteImportBatch] Delete prices error:', deletePricesError);
          throw new Error(`Erro ao deletar preços: ${deletePricesError.message}`);
        }
        console.warn('[useDeleteImportBatch] Deleted', deletedCount, 'price records');

        // 3. Update the batch status to indicate it was cancelled/deleted
        console.warn('[useDeleteImportBatch] Step 3: Updating batch status...');
        toast.loading('Atualizando status...', { id: loadingToast });

        const updateData = {
          error_summary: `Importação cancelada. ${deletedCount || 0} registros de preço removidos.`,
          rows_inserted: 0,
          rows_updated: 0,
          finished_at: new Date().toISOString(),
        };

        // Try with 'cancelled' status first
        const { error: cancelledError } = await supabase
          .from('ref_import_batch')
          .update({ ...updateData, status: 'cancelled' })
          .eq('id', batchId);

        if (cancelledError) {
          // If 'cancelled' is not valid, try with 'failed'
          console.warn(
            "[useDeleteImportBatch] 'cancelled' status not supported, using 'failed':",
            cancelledError
          );
          const { error: failedError } = await supabase
            .from('ref_import_batch')
            .update({ ...updateData, status: 'failed' })
            .eq('id', batchId);

          if (failedError) {
            console.error('[useDeleteImportBatch] Update status error:', failedError);
          } else {
            console.warn('[useDeleteImportBatch] Status updated to "failed"');
          }
        } else {
          console.warn('[useDeleteImportBatch] Status updated to "cancelled"');
        }

        // Dismiss loading toast
        toast.dismiss(loadingToast);

        console.warn('[useDeleteImportBatch] Deletion completed successfully');
        return {
          batchId,
          fileName: batch.file_name,
          deletedPrices: deletedCount || 0,
        };
      } catch (error) {
        // Dismiss loading toast on error
        toast.dismiss(loadingToast);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.warn('[useDeleteImportBatch] onSuccess:', data);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(`Importação cancelada! ${data.deletedPrices} registros de preço removidos.`, {
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      console.error('[useDeleteImportBatch] onError:', error);
      toast.error(`Erro ao cancelar importação: ${error.message}`, { duration: 5000 });
    },
  });
}
