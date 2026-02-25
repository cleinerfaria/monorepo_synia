import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { StockBatch, InsertTables, UpdateTables } from '@/types/database';
import toast from 'react-hot-toast';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { parseDateOnlyOrNull } from '@/lib/dateOnly';

const QUERY_KEY = 'stock-batches';

// Extended type with relations
export type StockBatchWithRelations = StockBatch & {
  product?: {
    id: string;
    name: string;
    active_ingredient_rel?: { id: string; name: string } | null;
    concentration: string | null;
    unit_stock?: { id: string; code: string; name: string } | null;
  };
  stock_location?: {
    id: string;
    name: string;
  };
};

export function useStockBatches(filters?: {
  locationId?: string;
  productId?: string;
  expiringWithinDays?: number;
}) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, companyId, filters],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('stock_batch')
        .select(
          `
          *,
          product:product_id(id, name, active_ingredient_rel:active_ingredient(id, name), concentration, unit_stock:unit_stock_id(id, code, name)),
          stock_location:location_id(id, name)
        `
        )
        .eq('company_id', companyId)
        .gt('qty_on_hand', 0)
        .order('expiration_date', { ascending: true, nullsFirst: false });

      if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
      }

      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }

      if (filters?.expiringWithinDays) {
        const futureDate = addDays(new Date(), filters.expiringWithinDays);
        query = query.lte('expiration_date', format(futureDate, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as StockBatchWithRelations[];
    },
    enabled: !!companyId,
  });
}

export function useStockBatch(id: string | undefined) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, id, companyId],
    queryFn: async () => {
      if (!id || !companyId) return null;

      const { data, error } = await supabase
        .from('stock_batch')
        .select(
          `
          *,
          product:product_id(id, name, active_ingredient_rel:active_ingredient(id, name), concentration, unit_stock:unit_stock_id(id, code, name)),
          stock_location:location_id(id, name)
        `
        )
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data as StockBatchWithRelations;
    },
    enabled: !!id && !!companyId,
  });
}

export function useCreateStockBatch() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (data: Omit<InsertTables<'stock_batch'>, 'company_id'>) => {
      if (!company?.id) throw new Error('No company');

      const { data: batch, error } = await supabase
        .from('stock_batch')
        .insert({ ...data, company_id: company.id })
        .select()
        .single();

      if (error) throw error;
      return batch as StockBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Lote cadastrado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating stock batch:', error);
      toast.error('Erro ao cadastrar lote');
    },
  });
}

export function useUpdateStockBatch() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTables<'stock_batch'> & { id: string }) => {
      if (!company?.id) throw new Error('No company');

      const { data: batch, error } = await supabase
        .from('stock_batch')
        .update(data)
        .eq('id', id)
        .eq('company_id', company.id)
        .select()
        .single();

      if (error) throw error;
      return batch as StockBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Lote atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating stock batch:', error);
      toast.error('Erro ao atualizar lote');
    },
  });
}

export function useDeleteStockBatch() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('stock_batch')
        .delete()
        .eq('id', id)
        .eq('company_id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Lote excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting stock batch:', error);
      toast.error('Erro ao excluir lote');
    },
  });
}

// Utility function to check batch status
export function getBatchStatus(expirationDate: string | null): {
  status: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry';
  label: string;
  color: string;
  daysUntilExpiration: number | null;
} {
  if (!expirationDate) {
    return {
      status: 'no_expiry',
      label: 'Sem validade',
      color: 'gray',
      daysUntilExpiration: null,
    };
  }

  const expDate = parseDateOnlyOrNull(expirationDate);
  if (!expDate) {
    return {
      status: 'no_expiry',
      label: 'Sem validade',
      color: 'gray',
      daysUntilExpiration: null,
    };
  }

  const diffDays = differenceInCalendarDays(expDate, new Date());

  if (diffDays < 0) {
    return {
      status: 'expired',
      label: 'Vencido',
      color: 'red',
      daysUntilExpiration: diffDays,
    };
  } else if (diffDays <= 30) {
    return {
      status: 'expiring_soon',
      label: `Vence em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`,
      color: 'yellow',
      daysUntilExpiration: diffDays,
    };
  } else {
    return {
      status: 'valid',
      label: 'Válido',
      color: 'green',
      daysUntilExpiration: diffDays,
    };
  }
}
