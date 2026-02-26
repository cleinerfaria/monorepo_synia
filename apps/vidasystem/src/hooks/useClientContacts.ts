import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { ClientContact } from '@/types/database';
import toast from 'react-hot-toast';

const QUERY_KEY = 'client-contacts';

export function useClientContacts(clientId: string | undefined) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, clientId, companyId],
    queryFn: async () => {
      if (!clientId || !companyId) return [];

      const { data, error } = await supabase
        .from('client_contact')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ClientContact[];
    },
    enabled: !!clientId && !!companyId,
  });
}

export function useSaveClientContacts() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const _companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async ({ clientId, contacts }: { clientId: string; contacts: ClientContact[] }) => {
      if (!company?.id) throw new Error('No company');

      // Deletar contatos existentes que não estão na lista
      const { data: existing } = await supabase
        .from('client_contact')
        .select('id')
        .eq('client_id', clientId)
        .eq('company_id', company.id);

      const existingIds = existing?.map((c) => c.id) || [];
      const currentIds = contacts.filter((c) => !c.id.startsWith('temp-')).map((c) => c.id);
      const toDelete = existingIds.filter((id) => !currentIds.includes(id));

      if (toDelete.length > 0) {
        await supabase.from('client_contact').delete().in('id', toDelete);
      }

      // Processar cada contato
      for (const contact of contacts) {
        const contactData = {
          ...contact,
          client_id: clientId,
          company_id: company.id,
        };

        if (contact.id.startsWith('temp-')) {
          // Inserir novo
          const { id: _id, ...insertData } = contactData;
          await supabase.from('client_contact').insert(insertData);
        } else {
          // Atualizar existente
          const { id: contactId, ...updateData } = contactData;
          await supabase
            .from('client_contact')
            .update(updateData)
            .eq('id', contactId)
            .eq('company_id', company.id);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, variables.clientId],
      });
      toast.success('Contatos salvos com sucesso!');
    },
    onError: (error) => {
      console.error('Error saving client contacts:', error);
      toast.error('Erro ao salvar contatos');
    },
  });
}
