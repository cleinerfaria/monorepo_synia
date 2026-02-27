import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { normalizePhoneForDatabase } from '@/lib/phone';
import { useAuthStore } from '@/stores/authStore';
import type { Supplier, InsertTables, UpdateTables } from '@/types/database';
import toast from 'react-hot-toast';

const QUERY_KEY = 'suppliers';

export function useSuppliers() {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('supplier')
        .select('*, active:is_active')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!companyId,
  });
}

export function useSupplier(id: string | undefined) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id || !companyId) return null;

      const { data, error } = await supabase
        .from('supplier')
        .select('*, active:is_active')
        .eq('id', id)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data as Supplier;
    },
    enabled: !!id && !!companyId,
  });
}

export function useSupplierByDocument(document: string | undefined) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, 'document', document],
    queryFn: async () => {
      if (!document || !companyId) return null;

      const { data, error } = await supabase
        .from('supplier')
        .select('*, active:is_active')
        .eq('document', document)
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      return data as Supplier | null;
    },
    enabled: !!document && !!companyId,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const _companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async (data: Omit<InsertTables<'supplier'>, 'company_id'>) => {
      if (!company?.id) throw new Error('No company');
      const payload: Record<string, any> = { ...data };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }
      if (payload.phone !== undefined) {
        payload.phone = normalizePhoneForDatabase(payload.phone);
      }
      if (payload.contact_phone !== undefined) {
        payload.contact_phone = normalizePhoneForDatabase(payload.contact_phone);
      }

      const { data: supplier, error } = await supabase
        .from('supplier')
        .insert({ ...payload, company_id: company.id } as any)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return supplier as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Fornecedor cadastrado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating supplier:', error);
      toast.error('Erro ao cadastrar fornecedor');
    },
  });
}

export function useUpsertSupplierByDocument() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const _companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async (data: Omit<InsertTables<'supplier'>, 'company_id'>) => {
      if (!company?.id) throw new Error('No company');
      if (!data.document) throw new Error('Document is required');

      // Check if supplier exists
      const { data: existing } = await supabase
        .from('supplier')
        .select('*, active:is_active')
        .eq('document', data.document)
        .eq('company_id', company.id)
        .maybeSingle();
      const payload: Record<string, any> = { ...data };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }
      if (payload.phone !== undefined) {
        payload.phone = normalizePhoneForDatabase(payload.phone);
      }
      if (payload.contact_phone !== undefined) {
        payload.contact_phone = normalizePhoneForDatabase(payload.contact_phone);
      }

      if (existing) {
        // Update existing
        const { data: supplier, error } = await supabase
          .from('supplier')
          .update(payload as any)
          .eq('id', existing.id)
          .eq('company_id', company.id)
          .select('*, active:is_active')
          .single();

        if (error) throw error;
        return supplier as Supplier;
      } else {
        // Insert new
        const { data: supplier, error } = await supabase
          .from('supplier')
          .insert({ ...payload, company_id: company.id } as any)
          .select('*, active:is_active')
          .single();

        if (error) throw error;
        return supplier as Supplier;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const _companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTables<'supplier'> & { id: string }) => {
      if (!company?.id) throw new Error('No company');
      const payload: Record<string, any> = { ...data };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }
      if (payload.phone !== undefined) {
        payload.phone = normalizePhoneForDatabase(payload.phone);
      }
      if (payload.contact_phone !== undefined) {
        payload.contact_phone = normalizePhoneForDatabase(payload.contact_phone);
      }

      const { data: supplier, error } = await supabase
        .from('supplier')
        .update(payload as any)
        .eq('id', id)
        .eq('company_id', company.id)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return supplier as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Fornecedor atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating supplier:', error);
      toast.error('Erro ao atualizar fornecedor');
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const _companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('supplier')
        .delete()
        .eq('id', id)
        .eq('company_id', company.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Fornecedor excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting supplier:', error);
      toast.error('Erro ao excluir fornecedor');
    },
  });
}
