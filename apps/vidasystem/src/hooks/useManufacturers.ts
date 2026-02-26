import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Manufacturer, InsertTables, UpdateTables } from '@/types/database';
import toast from 'react-hot-toast';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';

const QUERY_KEY = 'manufacturers';

// Check if reference tables (CMED and Brasíndice) are imported
export function useReferenceTablesStatus() {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: ['reference-tables-status', companyId],
    queryFn: async () => {
      if (!companyId) return { hasCmed: false, hasBrasindice: false };

      // Check for CMED (manufacturer_code contains '/' - CNPJ format)
      const { count: cmedCount } = await supabase
        .from('ref_item')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .like('manufacturer_code', '%/%')
        .limit(1);

      // Check for Brasíndice (manufacturer_code is numeric only)
      const { count: brasindiceCount } = await supabase
        .from('ref_item')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .not('manufacturer_code', 'like', '%/%')
        .not('manufacturer_code', 'is', null)
        .limit(1);

      return {
        hasCmed: (cmedCount ?? 0) > 0,
        hasBrasindice: (brasindiceCount ?? 0) > 0,
      };
    },
    enabled: !!companyId,
  });
}

// Sync manufacturers from reference tables (CMED + Brasíndice)
export function useSyncManufacturersFromReference() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const _companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No company');

      // Execute the SQL query to get paired manufacturers
      const { data: pairedManufacturers, error: queryError } = await supabase.rpc(
        'get_paired_manufacturers',
        { p_company_id: company.id }
      );

      if (queryError) {
        console.error('Error fetching paired manufacturers:', queryError);
        throw new Error('Erro ao buscar fabricantes pareados');
      }

      if (!pairedManufacturers || pairedManufacturers.length === 0) {
        return { inserted: 0, updated: 0, skipped: 0 };
      }

      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      // Process each manufacturer
      for (const mfr of pairedManufacturers) {
        // Check if manufacturer already exists by CNPJ or brasindice_code
        const { data: existing } = await supabase
          .from('manufacturer')
          .select('id, document, brasindice_code')
          .eq('company_id', company.id)
          .or(`document.eq.${mfr.cnpj},brasindice_code.eq.${mfr.brasindice_codigo}`)
          .limit(1);

        if (existing && existing.length > 0) {
          // Update existing manufacturer if needed
          const existingMfr = existing[0];
          const needsUpdate =
            !existingMfr.brasindice_code ||
            !existingMfr.document ||
            existingMfr.brasindice_code !== mfr.brasindice_codigo;

          if (needsUpdate) {
            const { error: updateError } = await supabase
              .from('manufacturer')
              .update({
                document: mfr.cnpj,
                brasindice_code: mfr.brasindice_codigo,
                trade_name: existingMfr.brasindice_code ? undefined : mfr.nome_fantasia,
              })
              .eq('id', existingMfr.id);

            if (updateError) {
              console.error('Error updating manufacturer:', updateError);
              skipped++;
            } else {
              updated++;
            }
          } else {
            skipped++;
          }
        } else {
          // Insert new manufacturer
          const { error: insertError } = await supabase.from('manufacturer').insert({
            company_id: company.id,
            code: mfr.brasindice_codigo,
            name: mfr.razao_social,
            trade_name: mfr.nome_fantasia,
            document: mfr.cnpj,
            brasindice_code: mfr.brasindice_codigo,
            is_active: true,
          });

          if (insertError) {
            console.error('Error inserting manufacturer:', insertError);
            skipped++;
          } else {
            inserted++;
          }
        }
      }

      return { inserted, updated, skipped };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      const total = result.inserted + result.updated;
      if (total > 0) {
        toast.success(
          `Sincronização concluída: ${result.inserted} inseridos, ${result.updated} atualizados`
        );
      } else {
        toast.success('Nenhum fabricante novo encontrado para sincronizar');
      }
    },
    onError: (error) => {
      console.error('Error syncing manufacturers:', error);
      toast.error('Erro ao sincronizar fabricantes');
    },
  });
}

export function useManufacturers() {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('manufacturer')
        .select('*, active:is_active')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data as Manufacturer[];
    },
    enabled: !!companyId,
  });
}

interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export function useManufacturersPaginated(
  page: number = 1,
  pageSize: number = DEFAULT_LIST_PAGE_SIZE,
  searchTerm: string = ''
) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, 'paginated', companyId, page, pageSize, searchTerm],
    queryFn: async (): Promise<PaginatedResult<Manufacturer>> => {
      if (!companyId) return { data: [], totalCount: 0, totalPages: 0, currentPage: page };

      // Build base query for count
      let countQuery = supabase
        .from('manufacturer')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Build base query for data
      let dataQuery = supabase
        .from('manufacturer')
        .select('*, active:is_active')
        .eq('company_id', companyId);

      // Apply search filter if provided
      if (searchTerm) {
        const searchFilter = `name.ilike.%${searchTerm}%,trade_name.ilike.%${searchTerm}%,document.ilike.%${searchTerm}%,brasindice_code.ilike.%${searchTerm}%`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      // Get total count
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      const totalCount = count ?? 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Get paginated data
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await dataQuery.order('name').range(from, to);

      if (error) throw error;

      return {
        data: data as Manufacturer[],
        totalCount,
        totalPages,
        currentPage: page,
      };
    },
    enabled: !!companyId,
  });
}

export function useManufacturer(id: string | undefined) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, id, companyId],
    queryFn: async () => {
      if (!id || !companyId) return null;

      const { data, error } = await supabase
        .from('manufacturer')
        .select('*, active:is_active')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data as Manufacturer;
    },
    enabled: !!id && !!companyId,
  });
}

export function useCreateManufacturer() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const _companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async (data: Omit<InsertTables<'manufacturer'>, 'company_id'>) => {
      if (!company?.id) throw new Error('No company');
      const payload: Record<string, any> = { ...data };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      const { data: manufacturer, error } = await supabase
        .from('manufacturer')
        .insert({ ...payload, company_id: company.id } as any)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return manufacturer as Manufacturer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Fabricante cadastrado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating manufacturer:', error);
      toast.error('Erro ao cadastrar fabricante');
    },
  });
}

export function useUpdateManufacturer() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const _companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTables<'manufacturer'> & { id: string }) => {
      if (!company?.id) throw new Error('No company');
      const payload: Record<string, any> = { ...data };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      const { data: manufacturer, error } = await supabase
        .from('manufacturer')
        .update(payload as any)
        .eq('id', id)
        .eq('company_id', company.id)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return manufacturer as Manufacturer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Fabricante atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating manufacturer:', error);
      toast.error('Erro ao atualizar fabricante');
    },
  });
}

export function useDeleteManufacturer() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const _companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('manufacturer')
        .delete()
        .eq('id', id)
        .eq('company_id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Fabricante excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting manufacturer:', error);
      toast.error('Erro ao excluir fabricante');
    },
  });
}
