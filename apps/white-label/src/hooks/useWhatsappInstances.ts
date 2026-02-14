import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
  initInstance,
  connectInstance,
  disconnectInstance,
  deleteInstance as deleteInstanceApi,
  getInstanceStatus,
  UazapiInstance,
  UazapiInstanceStatus,
} from '@/services/uazapi/instances';

export interface WhatsappInstance {
  id: string;
  company_id: string;
  provider: 'uazapi';
  provider_instance_id: string;
  name: string;
  phone_number: string | null;
  status: UazapiInstanceStatus | string;
  active: boolean;
  sector: string | null;
  observation: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsappInstanceSecret {
  instance_id: string;
  company_id: string;
  provider: 'uazapi';
  access_token: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWhatsappInstanceInput {
  company_id: string;
  name: string;
  sector?: string;
  observation?: string;
  fingerprintProfile?: string;
  browser?: string;
}

export interface UpdateWhatsappInstanceInput {
  id: string;
  name?: string;
  phone_number?: string | null;
  status?: UazapiInstanceStatus | string;
  active?: boolean;
  sector?: string | null;
  observation?: string | null;
  last_seen_at?: string | null;
}

async function getInstanceLimit(companyId: string) {
  const { data, error } = await supabase
    .from('company_plan_settings')
    .select('whatsapp_instance_limit')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) throw error;
  return data?.whatsapp_instance_limit ?? 1;
}

async function getActiveInstanceCount(companyId: string) {
  const { count, error } = await supabase
    .from('whatsapp_instance')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('active', true);

  if (error) throw error;
  return count || 0;
}

async function assertInstanceLimit(companyId: string, skipCheck?: boolean) {
  if (skipCheck) return;
  const limit = await getInstanceLimit(companyId);
  const activeCount = await getActiveInstanceCount(companyId);

  if (activeCount >= limit) {
    throw new Error(`Limite de instÃ¢ncias atingido (${activeCount}/${limit})`);
  }
}

export function useWhatsappInstances(companyId?: string) {
  return useQuery({
    queryKey: ['whatsapp_instances', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('whatsapp_instance')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as WhatsappInstance[];
    },
    enabled: !!companyId,
  });
}

export function useCreateWhatsappInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWhatsappInstanceInput) => {
      await assertInstanceLimit(input.company_id);

      const response = await initInstance({
        name: input.name,
        fingerprintProfile: input.fingerprintProfile,
        browser: input.browser,
      });

      const instance = response.instance;
      const uazapiInstanceId = instance?.id;
      const uazapiToken = instance?.token || response.token;

      if (!uazapiInstanceId || !uazapiToken) {
        throw new Error('Uazapi instance token not returned');
      }

      // Inserir instÃ¢ncia (sem token)
      const { data, error } = await supabase
        .from('whatsapp_instance')
        .insert({
          company_id: input.company_id,
          provider: 'uazapi',
          provider_instance_id: uazapiInstanceId,
          name: instance?.name || input.name,
          phone_number: null,
          status: instance?.status || 'disconnected',
          active: true,
          sector: input.sector || null,
          observation: input.observation || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Inserir token na tabela de segredos
      const { error: secretError } = await supabase.from('whatsapp_instance_secret').insert({
        instance_id: data.id,
        company_id: input.company_id,
        provider: 'uazapi',
        access_token: uazapiToken,
      });

      if (secretError) {
        // Rollback: remover a instÃ¢ncia criada
        await supabase.from('whatsapp_instance').delete().eq('id', data.id);
        throw secretError;
      }

      return { instance: data as unknown as WhatsappInstance, uazapi: response };
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_instances', input.company_id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_instance_limits', input.company_id] });
    },
  });
}

export function useUpdateWhatsappInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWhatsappInstanceInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('whatsapp_instance')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as WhatsappInstance;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_instances', data.company_id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_instance_limits', data.company_id] });
    },
  });
}

export function useConnectWhatsappInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ instance, phone }: { instance: WhatsappInstance; phone?: string }) => {
      // NÃ£o Ã© necessÃ¡rio verificar limite aqui pois a instÃ¢ncia jÃ¡ foi criada e estÃ¡ ativa
      // O limite Ã© verificado apenas na criaÃ§Ã£o de novas instÃ¢ncias

      const response = await connectInstance(instance.id, phone ? { phone } : undefined);
      const uazapi = response.instance;

      const updates: Partial<WhatsappInstance> = {
        status: (uazapi?.status || 'connecting') as UazapiInstanceStatus,
        phone_number: instance.phone_number,
        last_seen_at: new Date().toISOString(),
      };

      if (uazapi?.owner && !instance.phone_number) {
        updates.phone_number = uazapi.owner;
      }

      const { data, error } = await supabase
        .from('whatsapp_instance')
        .update(updates)
        .eq('id', instance.id)
        .select()
        .single();

      if (error) throw error;
      return { instance: data as unknown as WhatsappInstance, uazapi: response };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_instances', data.instance.company_id] });
      queryClient.invalidateQueries({
        queryKey: ['whatsapp_instance_limits', data.instance.company_id],
      });
    },
  });
}

export function useDisconnectWhatsappInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instance: WhatsappInstance) => {
      const response = await disconnectInstance(instance.id);

      const { data, error } = await supabase
        .from('whatsapp_instance')
        .update({
          status: response.instance?.status || 'disconnected',
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', instance.id)
        .select()
        .single();

      if (error) throw error;
      return { instance: data as unknown as WhatsappInstance, uazapi: response };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_instances', data.instance.company_id] });
      queryClient.invalidateQueries({
        queryKey: ['whatsapp_instance_limits', data.instance.company_id],
      });
    },
  });
}

export function useDeleteWhatsappInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instance: WhatsappInstance) => {
      await deleteInstanceApi(instance.id);

      const { data, error } = await supabase
        .from('whatsapp_instance')
        .update({
          active: false,
          status: 'disconnected',
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', instance.id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as WhatsappInstance;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_instances', data.company_id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_instance_limits', data.company_id] });
    },
  });
}

export function useRefreshWhatsappInstanceStatus() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (instance: WhatsappInstance) => {
      const response = await getInstanceStatus(instance.id);
      const status = response.instance?.status || instance.status;

      const { data, error } = await supabase
        .from('whatsapp_instance')
        .update({
          status,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', instance.id)
        .select()
        .single();

      if (error) throw error;
      return { instance: data as unknown as WhatsappInstance, uazapi: response };
    },
    onSuccess: () => {
      if (company?.id) {
        queryClient.invalidateQueries({ queryKey: ['whatsapp_instances', company.id] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp_instance_limits', company.id] });
      }
    },
  });
}

export function useWhatsappInstanceLimits(companyId?: string) {
  return useQuery({
    queryKey: ['whatsapp_instance_limits', companyId],
    queryFn: async () => {
      if (!companyId) return { limit: 1, activeCount: 0 };

      const [limit, activeCount] = await Promise.all([
        getInstanceLimit(companyId),
        getActiveInstanceCount(companyId),
      ]);

      return { limit, activeCount };
    },
    enabled: !!companyId,
  });
}

export function mapInstanceStatus(value?: string | null) {
  if (!value) return 'disconnected';
  if (['connected', 'connecting', 'disconnected', 'error'].includes(value)) return value;
  return 'disconnected';
}

/**
 * @deprecated O token nÃ£o estÃ¡ mais disponÃ­vel no frontend.
 */
export function getUazapiToken(_instance?: WhatsappInstance | null) {
  console.warn('getUazapiToken is deprecated. Tokens are resolved only in edge functions.');
  return '';
}

export function resolveInstanceName(instance?: WhatsappInstance | null, fallback = 'Instancia') {
  if (!instance) return fallback;
  return instance.name || fallback;
}

export function resolveInstanceStatus(instance?: WhatsappInstance | null) {
  return mapInstanceStatus(instance?.status || 'disconnected');
}

export function resolveInstancePhone(instance?: WhatsappInstance | null) {
  return instance?.phone_number || '---';
}

export function resolveInstanceProfile(instance?: UazapiInstance | null) {
  return {
    profileName: instance?.profileName || null,
    profilePicUrl: instance?.profilePicUrl || null,
    isBusiness: instance?.isBusiness || false,
  };
}
