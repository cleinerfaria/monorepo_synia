import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getValidAccessToken } from '@/lib/authToken';
import { WhatsappContact } from '@/hooks/useWhatsappMessages';

// Types
type WhatsappInstance = any;
type SyncWhatsappContactsInput = {
  instance: WhatsappInstance;
  limit?: number;
  offset?: number;
  previewOnly?: boolean;
};

async function invokeSyncContacts({
  instance,
  limit = 50,
  offset = 0,
  previewOnly = false,
}: SyncWhatsappContactsInput) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    throw new Error('Sessao expirada. Faca login novamente.');
  }

  const { data, error } = await supabase.functions.invoke('sync-contacts', {
    body: {
      instanceId: instance.id,
      limit,
      offset,
      previewOnly,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    console.error('Sync Contacts Error:', error);
    const response = (error as any)?.context?.response;
    if (response) {
      let message = 'Erro ao sincronizar contatos';
      try {
        const detail = await response.clone().json();
        message = detail?.error || detail?.details || message;
      } catch {
        try {
          const text = await response.clone().text();
          if (text) message = text;
        } catch {
          // noop
        }
      }
      throw new Error(message);
    }
    throw error;
  }

  return data;
}

// Placeholder functions (se ainda não estão implementadas)

export function useWhatsappContacts(companyId?: string) {
  return useQuery({
    queryKey: ['whatsapp_contacts', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('whatsapp_contact')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_archived', false)
        .order('display_name', { ascending: true });

      if (error) throw error;
      return data as unknown as WhatsappContact[];
    },
    enabled: !!companyId,
  });
}

export function resolveContactDisplayName(contact: WhatsappContact): string {
  return (
    contact.display_name ||
    contact.phone_number ||
    contact.external_jid ||
    contact.external_lid ||
    'Contato sem nome'
  );
}

export function resolveContactPhone(contact: WhatsappContact): string | null {
  return contact.phone_number || contact.external_jid || null;
}

export function useSyncWhatsappContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: invokeSyncContacts,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp_contacts', variables.instance.company_id],
      });
    },
  });
}

export function usePreviewWhatsappContactsSync() {
  return useMutation({
    mutationFn: async ({ instance }: { instance: WhatsappInstance }) =>
      invokeSyncContacts({
        instance,
        limit: 10,
        offset: 0,
        previewOnly: true,
      }),
  });
}

export function useExportWhatsappContacts() {
  return useMutation({
    mutationFn: async ({ companyId }: { companyId: string }) => {
      const allContacts: WhatsappContact[] = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      // Buscar todos os contatos com paginação
      while (hasMore) {
        const { data, error } = await supabase
          .from('whatsapp_contact')
          .select('*')
          .eq('company_id', companyId)
          .order('display_name', { ascending: true })
          .range(offset, offset + limit - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allContacts.push(...(data as unknown as WhatsappContact[]));
          hasMore = data.length === limit;
          offset += limit;
        } else {
          hasMore = false;
        }
      }

      // Preparar dados para CSV
      if (allContacts.length === 0) {
        throw new Error('Nenhum contato encontrado para exportar');
      }

      const csvData = allContacts.map((contact) => ({
        Nome: resolveContactDisplayName(contact),
        Telefone: resolveContactPhone(contact) || '',
        'ID WhatsApp': contact.external_jid || '',
        Tipo: contact.is_group ? 'Grupo' : 'Individual',
        Arquivado: contact.is_archived ? 'Sim' : 'Não',
        'Primeiro Contato': new Date(contact.created_at).toLocaleString('pt-BR'),
      }));

      // Gerar CSV
      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map((row) =>
          headers
            .map((header) => {
              const value = row[header as keyof typeof row] || '';
              // Escapar valores que contém vírgula ou aspas
              return typeof value === 'string' && (value.includes(',') || value.includes('"'))
                ? `"${value.replace(/"/g, '""')}"`
                : value;
            })
            .join(',')
        ),
      ].join('\n');

      // Download do arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `contatos-whatsapp-${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { total: allContacts.length };
    },
  });
}
