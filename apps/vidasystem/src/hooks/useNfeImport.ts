import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { parseNfeXml, type NfeData } from '@/lib/nfeParser';
import { findPresentationsByBarcodes } from '@/hooks/usePresentations';
import type { NfeImport, NfeImportItem, Supplier } from '@/types/database';

// Helper function to find supplier by document
async function findSupplierByDocument(
  companyId: string,
  document: string
): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from('supplier')
    .select('*')
    .eq('company_id', companyId)
    .eq('document', document)
    .maybeSingle();

  if (error) return null;
  return data as Supplier | null;
}

// ==================== NFe Import ====================

// Extended type for NFE list with mapping stats
export type NfeImportWithStats = NfeImport & {
  total_items?: number;
  mapped_items?: number;
};

export function useNfeImports() {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: ['nfe-imports', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // First get NFE imports
      const { data: imports, error: importsError } = await supabase
        .from('nfe_import')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (importsError) throw importsError;

      // Get item mapping statistics for each NFE
      const nfeIds = imports?.map((nfe) => nfe.id) || [];

      if (nfeIds.length === 0) return imports as NfeImportWithStats[];

      // Get aggregated stats for all NFEs at once
      const { data: stats, error: statsError } = await supabase
        .from('nfe_import_item')
        .select(
          `
          nfe_import_id,
          product_id,
          presentation_id
        `
        )
        .in('nfe_import_id', nfeIds);

      if (statsError) {
        console.warn('Error getting NFE mapping stats:', statsError);
        return imports as NfeImportWithStats[];
      }

      // Calculate stats for each NFE
      const nfeStats = new Map<string, { total: number; mapped: number }>();

      if (stats) {
        // Group by nfe_import_id
        stats.forEach((item) => {
          const nfeId = item.nfe_import_id;
          if (!nfeStats.has(nfeId)) {
            nfeStats.set(nfeId, { total: 0, mapped: 0 });
          }

          const stat = nfeStats.get(nfeId)!;
          stat.total++;

          // Item is mapped if it has either product_id or presentation_id
          if (item.product_id || item.presentation_id) {
            stat.mapped++;
          }
        });
      }

      // Merge stats with imports
      const importsWithStats: NfeImportWithStats[] = imports.map((nfe) => ({
        ...nfe,
        total_items: nfeStats.get(nfe.id)?.total || 0,
        mapped_items: nfeStats.get(nfe.id)?.mapped || 0,
      }));

      return importsWithStats;
    },
    enabled: !!companyId,
  });
}

export function useNfeImport(id?: string) {
  return useQuery({
    queryKey: ['nfe-import', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase.from('nfe_import').select('*').eq('id', id).single();

      if (error) throw error;
      return data as NfeImport;
    },
    enabled: !!id,
  });
}

export function useNfeImportItems(nfeImportId?: string) {
  return useQuery({
    queryKey: ['nfe-import-items', nfeImportId],
    queryFn: async () => {
      if (!nfeImportId) return [];

      const { data, error } = await supabase
        .from('nfe_import_item')
        .select(
          `
          *,
          product:product_id (
            id,
            name,
            unit_stock:unit_stock_id(id, code, name),
            concentration
          ),
          presentation:presentation_id (
            id,
            name,
            barcode,
            product_id,
            conversion_factor,
            unit,
            manufacturer:manufacturer_id (
              id,
              name,
              trade_name
            )
          )
        `
        )
        .eq('nfe_import_id', nfeImportId)
        .order('item_number', { ascending: true, nullsFirst: false })
        .order('created_at')
        .order('id');

      if (error) throw error;
      return data as (NfeImportItem & {
        product: {
          id: string;
          name: string;
          unit_stock: { id: string; code: string; name: string } | null;
          concentration: string | null;
        } | null;
        presentation: {
          id: string;
          name: string;
          barcode: string | null;
          product_id: string;
          conversion_factor: number;
          unit: string | null;
          manufacturer: { id: string; name: string; trade_name: string | null } | null;
        } | null;
      })[];
    },
    enabled: !!nfeImportId,
  });
}

interface CreateNfeImportData {
  access_key?: string | null;
  number: string;
  issuer_document: string;
  issuer_name: string;
  issued_at: string | null;
  total_value?: number | null;
  xml_url?: string | null;
  supplier_id?: string | null;
  status?: 'importada' | 'pendente' | 'lancada' | 'error';
}

export function useCreateNfeImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNfeImportData) => {
      const { data: result, error } = await supabase
        .from('nfe_import')
        .insert({
          ...data,
          status: data.status ?? 'importada',
        } as any)
        .select()
        .single();

      if (error) throw error;
      return result as NfeImport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] });
    },
  });
}

interface CreateNfeImportItemData {
  nfe_import_id: string;
  item_number?: number | null;
  raw_description: string;
  product_code?: string | null;
  ncm?: string | null;
  ean?: string | null;
  unit?: string | null;
  qty: number;
  unit_price: number;
  total_price: number;
  product_id?: string | null;
  presentation_id?: string | null;
  batch_number?: string | null;
  expiration_date?: string | null;
  manufacture_date?: string | null;
  anvisa_code?: string | null;
  pmc_price?: number | null;
}

export function useCreateNfeImportItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNfeImportItemData) => {
      const { data: result, error } = await supabase
        .from('nfe_import_item')
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return result as NfeImportItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['nfe-import-items', variables.nfe_import_id],
      });
    },
  });
}

export function useUpdateNfeImportItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      nfeImportId: _nfeImportId,
      ...updates
    }: Partial<NfeImportItem> & { id: string; nfeImportId: string }) => {
      const { data, error } = await supabase
        .from('nfe_import_item')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as NfeImportItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['nfe-import-items', variables.nfeImportId],
      });
    },
  });
}

export function useUpdateNfeImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NfeImport> & { id: string }) => {
      const { data, error } = await supabase
        .from('nfe_import')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as NfeImport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] });
    },
  });
}

export function useDeleteNfeImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First delete items
      const { error: itemsError } = await supabase
        .from('nfe_import_item')
        .delete()
        .eq('nfe_import_id', id);

      if (itemsError) throw itemsError;

      // Then delete the import
      const { error } = await supabase.from('nfe_import').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] });
    },
  });
}

// Upload NFe XML
export function useUploadNfeXml() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('nfe-xml').upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('nfe-xml').getPublicUrl(filePath);

      return { url: publicUrl, path: filePath };
    },
  });
}

// Helper function to check if NFe already exists by access key
async function checkNfeExists(companyId: string, accessKey: string): Promise<boolean> {
  if (!accessKey || accessKey.trim() === '') return false;

  const { data, error } = await supabase
    .from('nfe_import')
    .select('id')
    .eq('company_id', companyId)
    .eq('access_key', accessKey)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}

// Helper function to check if NFe already exists by number and issuer document
async function checkNfeExistsByNumber(
  companyId: string,
  number: string,
  issuerDocument: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('nfe_import')
    .select('id')
    .eq('company_id', companyId)
    .eq('number', number)
    .eq('issuer_document', issuerDocument)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}

// Import NFe from XML file - parses, uploads, and creates NFe with items
export function useImportNfeFromXml() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async (file: File): Promise<{ nfe: NfeImport; parsedData: NfeData }> => {
      if (!company?.id) {
        throw new Error('Empresa não encontrada. Faça login novamente.');
      }

      // 1. Parse XML to extract data
      const parsedData = await parseNfeXml(file);

      // 2. Check if NFe already exists (prevent duplicates)
      // First check by access key (most reliable)
      if (parsedData.accessKey && parsedData.accessKey.trim() !== '') {
        const existsByAccessKey = await checkNfeExists(company.id, parsedData.accessKey);
        if (existsByAccessKey) {
          throw new Error(
            `Esta NFe já foi importada anteriormente. Chave de acesso: ${parsedData.accessKey.substring(0, 20)}...`
          );
        }
      }

      // Also check by number + issuer document as fallback
      const existsByNumber = await checkNfeExistsByNumber(
        company.id,
        parsedData.number,
        parsedData.issuerDocument
      );
      if (existsByNumber) {
        throw new Error(
          `Esta NFe já foi importada anteriormente. Número: ${parsedData.number}, Emitente: ${parsedData.issuerDocument}`
        );
      }

      // 3. Upload XML file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('nfe-xml').upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('nfe-xml').getPublicUrl(fileName);

      // 4. Check if supplier exists by CNPJ
      const existingSupplier = await findSupplierByDocument(company.id, parsedData.issuerDocument);

      // 5. Create NFe record
      const { data: nfeData, error: nfeError } = await supabase
        .from('nfe_import')
        .insert({
          company_id: company.id,
          status: 'importada',
          access_key: parsedData.accessKey || null,
          number: parsedData.number,
          issuer_name: parsedData.issuerName,
          issuer_document: parsedData.issuerDocument,
          issued_at: parsedData.issuedAt || null,
          total_value: parsedData.totalValue,
          xml_url: publicUrl,
          supplier_id: existingSupplier?.id || null,
        } as any)
        .select()
        .single();

      if (nfeError) throw nfeError;

      // 6. Try to auto-link items by EAN/barcode
      const itemEans = parsedData.items
        .map((item) => item.ean)
        .filter((ean): ean is string => ean !== null && ean.trim() !== '');

      const eanToPresentation = await findPresentationsByBarcodes(company.id, itemEans);

      // 7. Create NFe items - includes batch data from XML if available
      const itemsToInsert = parsedData.items.map((item) => {
        // Get first batch data if available (items may have multiple batches)
        const firstBatch = item.batches && item.batches.length > 0 ? item.batches[0] : null;

        // Try to auto-link by EAN
        const linkedPresentation = item.ean ? eanToPresentation.get(item.ean) : null;

        return {
          company_id: company.id,
          nfe_import_id: nfeData.id,
          item_number: item.itemNumber,
          raw_description: item.description,
          product_code: item.productCode,
          ncm: item.ncm,
          ean: item.ean,
          unit: item.unit,
          qty: item.qty,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          // Auto-link via EAN if found
          product_id: linkedPresentation?.productId || null,
          presentation_id: linkedPresentation?.presentationId || null,
          // Auto-fill batch data from XML rastro
          batch_number: firstBatch?.batchNumber || null,
          expiration_date: firstBatch?.expirationDate || null,
          manufacture_date: firstBatch?.manufactureDate || null,
          // Medication data
          anvisa_code: item.anvisaCode || null,
          pmc_price: item.pmcPrice || null,
        };
      });

      const { error: itemsError } = await supabase
        .from('nfe_import_item')
        .insert(itemsToInsert as any);

      if (itemsError) {
        // Rollback: delete the NFe if items insertion fails
        await supabase.from('nfe_import').delete().eq('id', nfeData.id);
        throw itemsError;
      }

      return { nfe: nfeData as NfeImport, parsedData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] });
      queryClient.invalidateQueries({ queryKey: ['nfe-stats'] });
    },
  });
}

// Link NFe to Supplier
export function useLinkNfeToSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      nfeImportId,
      supplierId,
    }: {
      nfeImportId: string;
      supplierId: string;
    }) => {
      const { data, error } = await supabase
        .from('nfe_import')
        .update({ supplier_id: supplierId } as any)
        .eq('id', nfeImportId)
        .select()
        .single();

      if (error) throw error;
      return data as NfeImport;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nfe-import', variables.nfeImportId] });
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] });
    },
  });
}

// Process NFe - Create stock movements and batches from imported items
export function useProcessNfeImport() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async ({
      nfeImportId,
      stockLocationId,
    }: {
      nfeImportId: string;
      stockLocationId: string;
    }) => {
      if (!company?.id) {
        throw new Error('Empresa não encontrada');
      }

      // Get all items that have product_id mapped (with presentation data for conversion)
      const { data: items, error: itemsError } = await supabase
        .from('nfe_import_item')
        .select(
          `
          *,
          presentation:presentation_id (
            id,
            conversion_factor
          )
        `
        )
        .eq('nfe_import_id', nfeImportId)
        .not('product_id', 'is', null);

      if (itemsError) throw itemsError;

      if (!items || items.length === 0) {
        throw new Error('Nenhum item mapeado para processar');
      }

      // Create stock batches and movements for each item
      for (const item of items) {
        // Calculate quantity in base unit using conversion factor
        // If presentation_id is set, use its conversion_factor; otherwise assume 1:1
        const conversionFactor = (item as any).presentation?.conversion_factor || 1;
        const qtyInBaseUnit = Math.abs(item.qty * conversionFactor); // Garantir que a quantidade seja sempre positiva

        // Calculate unit cost in base unit (divide by conversion factor)
        // Usar valor absoluto para garantir custo positivo
        const unitCostInBaseUnit = Math.abs(item.unit_price / conversionFactor);

        // Create batch if batch_number is provided
        let batchId: string | null = null;

        if (item.batch_number) {
          const { data: batchData, error: batchError } = await supabase
            .from('stock_batch')
            .insert({
              company_id: company.id,
              product_id: item.product_id!,
              location_id: stockLocationId,
              batch_number: item.batch_number,
              expiration_date: item.expiration_date || null,
              manufacture_date: item.manufacture_date || null,
              qty_on_hand: qtyInBaseUnit,
              unit_cost: unitCostInBaseUnit,
              nfe_import_id: nfeImportId,
              presentation_id: item.presentation_id || null,
              supplier_name: null,
            })
            .select()
            .single();

          if (batchError) throw batchError;
          batchId = batchData.id;
        }

        // Create stock movement
        const { error: movementError } = await supabase.from('stock_movement').insert({
          company_id: company.id,
          movement_type: 'IN' as const,
          product_id: item.product_id!,
          location_id: stockLocationId,
          qty: qtyInBaseUnit,
          unit_cost: unitCostInBaseUnit,
          total_cost: item.total_price,
          reference_type: 'nfe_import',
          reference_id: nfeImportId,
          batch_id: batchId,
          notes: `Importação NFe${item.batch_number ? ` - Lote: ${item.batch_number}` : ''}${conversionFactor !== 1 ? ` (${item.qty} × ${conversionFactor})` : ''}`,
        });

        if (movementError) throw movementError;
      }

      // Update NFe status to posted
      const { error: updateError } = await supabase
        .from('nfe_import')
        .update({ status: 'posted' } as any)
        .eq('id', nfeImportId);

      if (updateError) throw updateError;

      return { processedCount: items.length, nfeImportId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['nfe-imports'] });
      queryClient.invalidateQueries({ queryKey: ['nfe-import', data.nfeImportId] });
      queryClient.invalidateQueries({ queryKey: ['stock-balance'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-batches'] });
    },
  });
}

// NFe Stats
export function useNfeStats() {
  return useQuery({
    queryKey: ['nfe-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('nfe_import').select('status, total_value');

      if (error) throw error;

      const total = data?.length || 0;
      const pending = data?.filter((n) => n.status === 'pendente').length || 0;
      const processed = data?.filter((n) => n.status === 'lancada').length || 0;
      const totalValue =
        data
          ?.filter((n) => n.status === 'lancada')
          .reduce((sum, n) => sum + (n.total_value || 0), 0) || 0;

      return {
        total,
        pending,
        processed,
        totalValue,
      };
    },
  });
}
