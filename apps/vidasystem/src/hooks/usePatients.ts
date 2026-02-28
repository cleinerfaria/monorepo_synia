import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type {
  Patient,
  InsertTables,
  UpdateTables,
  PatientAddress,
  PatientContact,
  PatientPayer,
} from '@/types/database';
import toast from 'react-hot-toast';
import { DEFAULT_LIST_PAGE_SIZE } from '@/constants/pagination';
import { normalizePhoneForDatabase } from '@/lib/phone';

const QUERY_KEY = 'patients';

const sanitizePatientPayload = (data: Record<string, any>) => {
  const payload = { ...data };
  delete payload.address;
  delete payload.billing_client;
  delete payload.patient_address;
  delete payload.patient_contact;
  delete payload.patient_payer;
  if (payload.phone !== undefined) {
    payload.phone = normalizePhoneForDatabase(payload.phone);
  }
  return payload;
};

const isDuplicatePatientCpfError = (error: { code?: string; message?: string } | null | undefined) =>
  error?.code === '23505' && error?.message?.includes('idx_patient_cpf_unique');

const isDuplicatePatientCodeError = (error: { code?: string; message?: string } | null | undefined) =>
  error?.code === '23505' && error?.message?.includes('uq_patient_company_code');

// Extended type with relations
export type PatientWithRelations = Patient & {
  billing_client: { id: string; name: string } | null;
};

interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export function usePatients() {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const pageSize = 1000;
      let allPatients: PatientWithRelations[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('patient')
          .select(
            `
            *,
            active:is_active,
            billing_client:client(id, name)
          `
          )
          .eq('company_id', companyId)
          .order('name')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allPatients = [...allPatients, ...(data as PatientWithRelations[])];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      return allPatients;
    },
    enabled: !!companyId,
  });
}

export function usePatientsPaginated(
  page: number = 1,
  pageSize: number = DEFAULT_LIST_PAGE_SIZE,
  searchTerm: string = '',
  filters?: {
    clientId?: string;
    gender?: string;
    status?: string;
  },
  sortColumn: string = 'name',
  sortDirection: 'asc' | 'desc' = 'asc'
) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [
      QUERY_KEY,
      'paginated',
      companyId,
      page,
      pageSize,
      searchTerm,
      filters,
      sortColumn,
      sortDirection,
    ],
    queryFn: async (): Promise<PaginatedResult<PatientWithRelations>> => {
      if (!companyId) return { data: [], totalCount: 0, totalPages: 0, currentPage: page };

      // Build base query for count
      let countQuery = supabase
        .from('patient')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId);

      // Build base query for data
      let dataQuery = supabase
        .from('patient')
        .select(
          `
          *,
          active:is_active,
          billing_client:client(id, name),
          patient_payer(
            id,
            is_primary,
            client:client(id, name, color, type)
          )
        `
        )
        .eq('company_id', companyId);

      // Apply search filter
      if (searchTerm) {
        const searchFilter = `name.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      // Apply filters
      if (filters?.clientId) {
        if (filters.clientId === 'no_operator') {
          // Filtro por pacientes SEM operadora - aqueles que não têm registros em patient_payer ou não têm pagador primário
          const { data: patientIdsWithOperators } = await supabase
            .from('patient_payer')
            .select('patient_id')
            .eq('company_id', companyId)
            .eq('is_primary', true);

          if (patientIdsWithOperators && patientIdsWithOperators.length > 0) {
            const idsWithOperators = patientIdsWithOperators.map((p) => p.patient_id);
            countQuery = countQuery.not('id', 'in', `(${idsWithOperators.join(',')})`);
            dataQuery = dataQuery.not('id', 'in', `(${idsWithOperators.join(',')})`);
          }
          // Se não há pacientes com operadora, todos os pacientes serão retornados (sem filtro adicional)
        } else {
          // Filtro por operadora específica - buscar pacientes que tenham esta operadora como pagador
          const { data: patientIds } = await supabase
            .from('patient_payer')
            .select('patient_id')
            .eq('client_id', filters.clientId)
            .eq('company_id', companyId);

          if (patientIds && patientIds.length > 0) {
            const ids = patientIds.map((p) => p.patient_id);
            countQuery = countQuery.in('id', ids);
            dataQuery = dataQuery.in('id', ids);
          } else {
            // Se não há pacientes com esta operadora, retornar resultado vazio
            countQuery = countQuery.eq('id', 'impossivel-uuid');
            dataQuery = dataQuery.eq('id', 'impossivel-uuid');
          }
        }
      }
      if (filters?.gender) {
        countQuery = countQuery.eq('gender', filters.gender);
        dataQuery = dataQuery.eq('gender', filters.gender);
      }
      if (filters?.status) {
        const isActive = filters.status === 'active';
        countQuery = countQuery.eq('is_active', isActive);
        dataQuery = dataQuery.eq('is_active', isActive);
      }

      // Get total count
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      const totalCount = count ?? 0;
      const totalPages = Math.ceil(totalCount / pageSize);

      // Get paginated data with sorting
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await dataQuery
        .order(sortColumn, { ascending: sortDirection === 'asc' })
        .range(from, to);

      if (error) throw error;

      return {
        data: data as PatientWithRelations[],
        totalCount,
        totalPages,
        currentPage: page,
      };
    },
    enabled: !!companyId,
  });
}

export function usePatient(id: string | undefined) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id || !companyId) return null;

      const { data, error } = await supabase
        .from('patient')
        .select(
          `
          *,
          active:is_active,
          billing_client:client(id, name),
          patient_payer(
            id,
            is_primary,
            client:client(id, name, color, type)
          )
        `
        )
        .eq('company_id', companyId)
        .filter('id', 'eq', id)
        .single();

      if (error) throw error;
      return data as Patient & { billing_client: { id: string; name: string } | null };
    },
    enabled: !!id && !!companyId,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const _companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async (data: Omit<InsertTables<'patient'>, 'company_id'>) => {
      if (!company?.id) throw new Error('No company');
      const payload = sanitizePatientPayload(data as Record<string, any>);
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      const { data: patient, error } = await supabase
        .from('patient')
        .insert({ ...payload, company_id: company.id } as any)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return patient as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Paciente cadastrado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error creating patient:', error);
      if (isDuplicatePatientCpfError(error)) {
        toast.error('O CPF informado já está cadastrado para outro paciente');
      } else if (isDuplicatePatientCodeError(error)) {
        toast.error('O código informado já está em uso para outro paciente');
      } else {
        toast.error('Erro ao cadastrar paciente');
      }
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTables<'patient'> & { id: string }) => {
      if (!company?.id) throw new Error('No company');
      const payload = sanitizePatientPayload(data as Record<string, any>);
      if (payload.active !== undefined) {
        payload.is_active = payload.active;
        delete payload.active;
      }

      const { data: patient, error } = await supabase
        .from('patient')
        .update(payload as any)
        .eq('company_id', companyId)
        .filter('id', 'eq', id)
        .select('*, active:is_active')
        .single();

      if (error) throw error;
      return patient as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Paciente atualizado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error updating patient:', error);
      if (isDuplicatePatientCpfError(error)) {
        toast.error('O CPF informado já está cadastrado para outro paciente');
      } else if (isDuplicatePatientCodeError(error)) {
        toast.error('O código informado já está em uso para outro paciente');
      } else {
        toast.error('Erro ao atualizar paciente');
      }
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('patient')
        .delete()
        .eq('company_id', companyId)
        .filter('id', 'eq', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Paciente excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting patient:', error);
      toast.error('Erro ao excluir paciente');
    },
  });
}

// ========================================
// Patient Address Hooks
// ========================================

export function usePatientAddresses(patientId: string | undefined) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, 'addresses', patientId],
    queryFn: async () => {
      if (!patientId || !companyId) return [];

      const { data, error } = await supabase
        .from('patient_address')
        .select('*, active:is_active')
        .eq('patient_id', patientId)
        .eq('company_id', companyId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PatientAddress[];
    },
    enabled: !!patientId && !!companyId,
  });
}

export function useSavePatientAddresses() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async ({
      patientId,
      addresses,
    }: {
      patientId: string;
      addresses: PatientAddress[];
    }) => {
      if (!company?.id) throw new Error('No company');

      // Deletar endereços existentes que não estão na lista
      const { data: existing } = await supabase
        .from('patient_address')
        .select('id')
        .eq('patient_id', patientId)
        .eq('company_id', companyId);

      const existingIds = existing?.map((a) => a.id) || [];
      const currentIds = addresses.filter((a) => !a.id.startsWith('temp-')).map((a) => a.id);
      const toDelete = existingIds.filter((id) => !currentIds.includes(id));

      if (toDelete.length > 0) {
        await supabase.from('patient_address').delete().in('id', toDelete);
      }

      // Processar cada endereço
      for (const address of addresses) {
        const addressData: Record<string, any> = {
          ...address,
          patient_id: patientId,
          company_id: company.id,
        };
        if (addressData.active !== undefined) {
          addressData.is_active = addressData.active;
          delete addressData.active;
        }

        if (address.id.startsWith('temp-')) {
          // Inserir novo
          const { id: _id, ...insertData } = addressData;
          await supabase.from('patient_address').insert(insertData);
        } else {
          // Atualizar existente
          const { id: addressId, ...updateData } = addressData;
          await supabase
            .from('patient_address')
            .update(updateData)
            .eq('id', addressId)
            .eq('company_id', companyId);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, 'addresses', variables.patientId],
      });
    },
  });
}

// ========================================
// Patient Contact Hooks
// ========================================

export function usePatientContacts(patientId: string | undefined) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, 'contacts', patientId],
    queryFn: async () => {
      if (!patientId || !companyId) return [];

      const { data, error } = await supabase
        .from('patient_contact')
        .select('*, active:is_active')
        .eq('patient_id', patientId)
        .eq('company_id', companyId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PatientContact[];
    },
    enabled: !!patientId && !!companyId,
  });
}

export function useSavePatientContacts() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async ({
      patientId,
      contacts,
    }: {
      patientId: string;
      contacts: PatientContact[];
    }) => {
      if (!company?.id) throw new Error('No company');

      // Deletar contatos existentes que não estão na lista
      const { data: existing } = await supabase
        .from('patient_contact')
        .select('id')
        .eq('patient_id', patientId)
        .eq('company_id', companyId);

      const existingIds = existing?.map((c) => c.id) || [];
      const currentIds = contacts.filter((c) => !c.id.startsWith('temp-')).map((c) => c.id);
      const toDelete = existingIds.filter((id) => !currentIds.includes(id));

      if (toDelete.length > 0) {
        await supabase.from('patient_contact').delete().in('id', toDelete);
      }

      // Processar cada contato
      for (const contact of contacts) {
        const contactData: Record<string, any> = {
          ...contact,
          patient_id: patientId,
          company_id: company.id,
        };
        if (contactData.active !== undefined) {
          contactData.is_active = contactData.active;
          delete contactData.active;
        }

        if (contact.id.startsWith('temp-')) {
          // Inserir novo
          const { id: _id, ...insertData } = contactData;
          await supabase.from('patient_contact').insert(insertData);
        } else {
          // Atualizar existente
          const { id: contactId, ...updateData } = contactData;
          await supabase
            .from('patient_contact')
            .update(updateData)
            .eq('id', contactId)
            .eq('company_id', companyId);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, 'contacts', variables.patientId],
      });
    },
  });
}

// ========================================
// Patient Payer Hooks
// ========================================

export function usePatientPayers(patientId: string | undefined) {
  const companyId = useAuthStore((s) => s.appUser?.company_id ?? s.company?.id ?? null);

  return useQuery({
    queryKey: [QUERY_KEY, 'payers', patientId],
    queryFn: async () => {
      if (!patientId || !companyId) return [];

      const { data, error } = await supabase
        .from('patient_payer')
        .select(
          `
          *,
          active:is_active,
          client:client(id, name, color, type)
        `
        )
        .eq('patient_id', patientId)
        .eq('company_id', companyId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PatientPayer[];
    },
    enabled: !!patientId && !!companyId,
  });
}

export function useSavePatientPayers() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const companyId = company?.id ?? null;

  return useMutation({
    mutationFn: async ({ patientId, payers }: { patientId: string; payers: PatientPayer[] }) => {
      if (!company?.id) throw new Error('No company');

      // Deletar pagadores existentes que não estão na lista
      const { data: existing } = await supabase
        .from('patient_payer')
        .select('id')
        .eq('patient_id', patientId)
        .eq('company_id', companyId);

      const existingIds = existing?.map((p) => p.id) || [];
      const currentIds = payers.filter((p) => !p.id.startsWith('temp-')).map((p) => p.id);
      const toDelete = existingIds.filter((id) => !currentIds.includes(id));

      if (toDelete.length > 0) {
        await supabase.from('patient_payer').delete().in('id', toDelete);
      }

      // Processar cada pagador
      for (const payer of payers) {
        const payerData: Record<string, any> = {
          ...payer,
          patient_id: patientId,
          company_id: company.id,
        };
        if (payerData.active !== undefined) {
          payerData.is_active = payerData.active;
          delete payerData.active;
        }

        if (payer.id.startsWith('temp-')) {
          // Inserir novo
          const { id: _id, ...insertData } = payerData;
          await supabase.from('patient_payer').insert(insertData);
        } else {
          // Atualizar existente
          const { id: payerId, ...updateData } = payerData;
          await supabase
            .from('patient_payer')
            .update(updateData)
            .eq('id', payerId)
            .eq('company_id', companyId);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, 'payers', variables.patientId],
      });
    },
  });
}
