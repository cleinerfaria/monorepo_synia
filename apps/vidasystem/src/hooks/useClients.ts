import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useLogAction } from '@/hooks/useLogs';
import { buildLogDiff, buildLogSnapshot } from '@/lib/logging';
import type { Client, InsertTables, UpdateTables } from '@/types/database';
import toast from 'react-hot-toast';

const QUERY_KEY = 'clients';
const CLIENT_LOG_EXCLUDE_FIELDS = ['id', 'company_id', 'created_at', 'updated_at'];

export function useClients() {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('client')
        .select('*, active:is_active')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data as Client[];
    },
    enabled: !!companyId,
  });
}

export function useClient(id: string | undefined) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, id, companyId],
    queryFn: async () => {
      if (!id || !companyId) return null;

      const { data, error } = await supabase
        .from('client')
        .select('*, active:is_active')
        .eq('company_id', companyId)
        .filter('id', 'eq', id)
        .single();

      if (error) throw error;
      return data as Client;
    },
    enabled: !!id && !!companyId,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (data: Omit<InsertTables<'client'>, 'company_id'>) => {
      if (!company?.id) throw new Error('No company');
      const payload: Record<string, any> = { ...data };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      const { data: client, error } = await supabase
        .from('client')
        .insert({ ...payload, company_id: company.id } as any)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return client as Client;
    },
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Cliente cadastrado com sucesso!');

      // Registrar log
      logAction.mutate({
        action: 'create',
        entity: 'client',
        entityId: client.id,
        entityName: client.name,
        newData: buildLogSnapshot(client, {
          exclude: CLIENT_LOG_EXCLUDE_FIELDS,
        }),
      });
    },
    onError: (error) => {
      console.error('Error creating client:', error);
      toast.error('Erro ao cadastrar cliente');
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTables<'client'> & { id: string }) => {
      if (!company?.id) throw new Error('No company');

      // Buscar dados antigos para o log
      const { data: oldClient } = await supabase
        .from('client')
        .select('*, active:is_active')
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .single();
      const payload: Record<string, any> = { ...data };
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      const { data: client, error } = await supabase
        .from('client')
        .update(payload as any)
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return { client: client as Client, oldClient };
    },
    onSuccess: ({ client, oldClient }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Cliente atualizado com sucesso!');

      const { oldData, newData } = buildLogDiff(oldClient, client, {
        exclude: CLIENT_LOG_EXCLUDE_FIELDS,
      });

      // Registrar log
      logAction.mutate({
        action: 'update',
        entity: 'client',
        entityId: client.id,
        entityName: client.name,
        oldData,
        newData,
      });
    },
    onError: (error) => {
      console.error('Error updating client:', error);
      toast.error('Erro ao atualizar cliente');
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      // Buscar dados do cliente antes de excluir para o log
      const { data: clientToDelete } = await supabase
        .from('client')
        .select('*, active:is_active')
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .single();

      const { error } = await supabase
        .from('client')
        .delete()
        .eq('company_id', company.id)
        .filter('id', 'eq', id);

      if (error) throw error;
      return clientToDelete;
    },
    onSuccess: (deletedClient) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Cliente excluído com sucesso!');

      // Registrar log
      if (deletedClient) {
        logAction.mutate({
          action: 'delete',
          entity: 'client',
          entityId: deletedClient.id,
          entityName: deletedClient.name,
          oldData: buildLogSnapshot(deletedClient, {
            exclude: CLIENT_LOG_EXCLUDE_FIELDS,
          }),
        });
      }
    },
    onError: (error) => {
      console.error('Error deleting client:', error);
      toast.error('Erro ao excluir cliente');
    },
  });
}
