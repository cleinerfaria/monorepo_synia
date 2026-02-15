import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { StockLocation, StockBalance, StockMovement } from '@/types/database';
import { addDays, format } from 'date-fns';

// ==================== Stock Locations ====================

export function useStockLocations() {
  return useQuery({
    queryKey: ['stock-locations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stock_location').select('*').order('name');

      if (error) throw error;
      return data as StockLocation[];
    },
  });
}

export function useCreateStockLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      location: Omit<StockLocation, 'id' | 'company_id' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await supabase
        .from('stock_location')
        .insert(location as any)
        .select()
        .single();

      if (error) throw error;
      return data as StockLocation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-locations'] });
    },
  });
}

export function useUpdateStockLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StockLocation> & { id: string }) => {
      const { data, error } = await supabase
        .from('stock_location')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as StockLocation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-locations'] });
    },
  });
}

export function useDeleteStockLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stock_location').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-locations'] });
    },
  });
}

// ==================== Stock Balance ====================

export function useStockBalance(locationId?: string) {
  return useQuery({
    queryKey: ['stock-balance', locationId],
    queryFn: async () => {
      let query = supabase
        .from('stock_balance')
        .select(
          `
          *,
          product:product_id (
            id,
            name,
            unit_stock:unit_stock_id(id, code, name),
            item_type,
            min_stock,
            active,
            concentration,
            manufacturer_rel:manufacturer(id, name)
          ),
          stock_location:location_id (
            id,
            name
          )
        `
        )
        .gte('qty_on_hand', 0); // Mostrar itens com quantidade >= 0 (incluindo zero)

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query.order('updated_at', {
        ascending: false,
      });

      if (error) throw error;
      return data as (StockBalance & {
        product: {
          id: string;
          name: string;
          unit_stock: { id: string; code: string; name: string } | null;
          item_type: string;
          min_stock: number | null;
          active: boolean;
          concentration: string | null;
          manufacturer_rel: { id: string; name: string } | null;
        };
        stock_location: { id: string; name: string };
      })[];
    },
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: ['low-stock-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_balance')
        .select(
          `
          *,
          product:product_id (
            id,
            name,
            unit_stock:unit_stock_id(id, code, name),
            item_type,
            min_stock
          ),
          stock_location:location_id (
            id,
            name
          )
        `
        )
        .gte('qty_on_hand', 0); // Mostrar itens com quantidade >= 0

      if (error) throw error;

      // Filter items below minimum stock
      return (data as any[]).filter(
        (item) => item.product?.min_stock && item.qty_on_hand < item.product.min_stock
      );
    },
  });
}

// ==================== Stock Movements ====================

export function useStockMovements(locationId?: string, limit = 100) {
  return useQuery({
    queryKey: ['stock-movements', locationId, limit],
    queryFn: async () => {
      let query = supabase.from('stock_movement').select(`
          *,
          product:product_id (
            id,
            name,
            unit_stock:unit_stock_id(id, code, name),
            item_type
          ),
          stock_location:location_id (
            id,
            name
          ),
          batch:batch_id (
            id,
            batch_number,
            expiration_date
          ),
          presentation:presentation_id (
            id,
            name
          )
        `);

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);

      if (error) throw error;
      return data as (StockMovement & {
        product: {
          id: string;
          name: string;
          unit_stock: { id: string; code: string; name: string } | null;
          item_type: string;
        };
        stock_location: { id: string; name: string };
        batch: { id: string; batch_number: string; expiration_date: string } | null;
        presentation: { id: string; name: string } | null;
      })[];
    },
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      movement: Omit<StockMovement, 'id' | 'company_id' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await supabase
        .from('stock_movement')
        .insert(movement as any)
        .select()
        .single();

      if (error) throw error;
      return data as StockMovement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-balance'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] });
    },
  });
}

// ==================== Stock Stats ====================

export function useStockStats() {
  return useQuery({
    queryKey: ['stock-stats'],
    queryFn: async () => {
      // Get total items in stock
      const { data: balanceData, error: balanceError } = await supabase
        .from('stock_balance')
        .select('qty_on_hand, avg_cost')
        .gt('qty_on_hand', 0);

      if (balanceError) throw balanceError;

      const totalItems = balanceData?.length || 0;
      const totalQty = balanceData?.reduce((sum, b) => sum + (b.qty_on_hand || 0), 0) || 0;
      const totalValue =
        balanceData?.reduce((sum, b) => sum + (b.qty_on_hand || 0) * (b.avg_cost || 0), 0) || 0;

      // Get low stock count
      const { data: catalogData, error: catalogError } = await supabase
        .from('product')
        .select('id, min_stock')
        .not('min_stock', 'is', null);

      if (catalogError) throw catalogError;

      const minStockMap = new Map(catalogData?.map((c) => [c.id, c.min_stock]) || []);

      const { data: allBalance, error: allBalanceError } = await supabase
        .from('stock_balance')
        .select('product_id, qty_on_hand');

      if (allBalanceError) throw allBalanceError;

      const lowStockCount =
        allBalance?.filter((b) => {
          const minStock = minStockMap.get(b.product_id);
          return minStock && b.qty_on_hand < minStock;
        }).length || 0;

      // Get movements this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: movementsCount, error: movementsError } = await supabase
        .from('stock_movement')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      if (movementsError) throw movementsError;

      // Get locations count
      const { count: locationsCount, error: locationsError } = await supabase
        .from('stock_location')
        .select('*', { count: 'exact', head: true });

      if (locationsError) throw locationsError;

      // Get expiring batches count (within 30 days)
      const thirtyDaysFromNow = addDays(new Date(), 30);

      const { count: expiringBatchesCount, error: expiringError } = await supabase
        .from('stock_batch')
        .select('*', { count: 'exact', head: true })
        .gt('qty_on_hand', 0)
        .not('expiration_date', 'is', null)
        .lte('expiration_date', format(thirtyDaysFromNow, 'yyyy-MM-dd'));

      if (expiringError) throw expiringError;

      return {
        totalItems,
        totalQty,
        totalValue,
        lowStockCount,
        movementsThisMonth: movementsCount || 0,
        locationsCount: locationsCount || 0,
        expiringBatchesCount: expiringBatchesCount || 0,
      };
    },
  });
}
