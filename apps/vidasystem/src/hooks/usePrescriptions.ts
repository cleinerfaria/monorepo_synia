import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, uploadFile } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useLogAction } from '@/hooks/useLogs';
import { buildLogSnapshot } from '@/lib/logging';
import type {
  Prescription,
  PrescriptionItem,
  PrescriptionItemComponent,
  InsertTables,
  PrescriptionType,
  UpdateTables,
} from '@/types/database';
import type { CreateOrUpsertPrescriptionResult } from '@/types/rpcs';
import toast from 'react-hot-toast';

const QUERY_KEY = 'prescriptions';
const ITEMS_QUERY_KEY = 'prescription-items';
const COMPONENTS_QUERY_KEY = 'prescription-item-components';
const PRESCRIPTION_ITEM_COMPONENT_SELECT = `
  *,
  product:product_id(id, name, concentration),
  prescription_item:prescription_item_id(start_date, end_date)
`;

export function usePrescriptions() {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('prescription')
        .select(
          `
          *,
          patient:patient_id(
            id,
            name,
            billing_client:client(id, name, color),
            patient_payer(
              id,
              is_primary,
              client:client(id, name, color)
            )
          ),
          professional:professional_id(id, name)
        `
        )
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching prescriptions:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }
      return data as (Prescription & {
        patient:
          | {
              id: string;
              name: string;
              billing_client: {
                id: string;
                name: string;
                color: string | null;
              } | null;
              patient_payer: Array<{
                id: string;
                is_primary: boolean;
                client: {
                  id: string;
                  name: string;
                  color: string | null;
                } | null;
              }>;
            }
          | null;
        professional: {
          id: string;
          name: string;
        } | null;
      })[];
    },
    enabled: !!company?.id,
  });
}

export function usePrescription(id: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id || !company?.id) return null;

      console.warn('🔍 usePrescription Debug:', {
        prescriptionId: id,
        companyId: company.id,
        timestamp: new Date().toISOString(),
      });

      // Primeiro tentar uma query com join direto
      const { data, error } = await supabase
        .from('prescription')
        .select(
          `
          *,
          patient:patient_id(
            id,
            name,
            cpf,
            birth_date,
            billing_client:client(id, name, color, logo_url),
            patient_payer(
              id,
              is_primary,
              client:client(id, name, color, logo_url)
            )
          ),
          professional:professional_id(
            id,
            name,
            council_type,
            council_number,
            council_uf,
            signature_path
          )
        `
        )
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .single();

      console.warn('📊 usePrescription Result:', {
        data: data ? 'Found' : 'Not found',
        error: error
          ? {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            }
          : null,
      });

      if (error) {
        console.error('❌ Prescription query failed:', error);
        throw error;
      }

      return data as Prescription & {
        patient: {
          id: string;
          name: string;
          cpf: string | null;
          birth_date: string | null;
          billing_client: {
            id: string;
            name: string;
            color: string | null;
            logo_url: string | null;
          } | null;
          patient_payer: Array<{
            id: string;
            is_primary: boolean;
            client: {
              id: string;
              name: string;
              color: string | null;
              logo_url: string | null;
            } | null;
          }>;
        } | null;
        professional: {
          id: string;
          name: string;
          council_type: string | null;
          council_number: string | null;
          council_uf: string | null;
          signature_path: string | null;
        } | null;
      };
    },
    enabled: !!id && !!company?.id,
  });
}

export function usePrescriptionItems(prescriptionId: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [ITEMS_QUERY_KEY, prescriptionId],
    queryFn: async () => {
      if (!prescriptionId || !company?.id) return [];

      const { data, error } = await supabase
        .from('prescription_item')
        .select(
          `
          *,
          product:product_id(id, name, concentration, active:is_active, unit_stock:unit_stock_id(id, code, name, symbol), unit_prescription:unit_prescription_id(id, code, name, symbol)),
          equipment:equipment_id(id, name, serial_number, status),
          procedure:procedure_id(id, name),
          components:prescription_item_component(id, quantity, product:product_id(id, name, concentration, unit_stock:unit_stock_id(id, code, name, symbol), unit_prescription:unit_prescription_id(id, code, name, symbol)))
        `
        )
        .eq('prescription_id', prescriptionId)
        .eq('company_id', company.id)
        .order('created_at');

      if (error) throw error;
      return data as (PrescriptionItem & {
        product: {
          id: string;
          name: string;
          concentration: string | null;
          active: boolean | null;
          unit_stock: { id: string; code: string; name: string; symbol: string | null } | null;
          unit_prescription: {
            id: string;
            code: string;
            name: string;
            symbol: string | null;
          } | null;
        } | null;
        equipment: {
          id: string;
          name: string;
          serial_number: string | null;
          status: string;
        } | null;
        procedure: { id: string; name: string } | null;
        components: Array<{
          id: string;
          quantity: number | null;
          product: {
            id: string;
            name: string;
            concentration: string | null;
            unit_stock: { id: string; code: string; name: string; symbol: string | null } | null;
            unit_prescription: {
              id: string;
              code: string;
              name: string;
              symbol: string | null;
            } | null;
          } | null;
        }>;
      })[];
    },
    enabled: !!prescriptionId && !!company?.id,
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      patient_id: string;
      professional_id?: string | null;
      status?: string | null;
      type: PrescriptionType;
      start_date: string;
      end_date?: string | null;
      notes?: string | null;
      attachment_url?: string | null;
    }) => {
      const { data: result, error } = await supabase.rpc('create_or_upsert_prescription', {
        p_patient_id: data.patient_id,
        p_type: data.type,
        p_start_date: data.start_date,
        p_end_date: data.end_date || data.start_date,
        p_status: data.status || 'draft',
        p_notes: data.notes || null,
        p_professional_id: data.professional_id || null,
        p_attachment_url: data.attachment_url || null,
      });

      if (error) throw error;

      const row = (
        Array.isArray(result) ? result[0] : result
      ) as CreateOrUpsertPrescriptionResult | null;
      if (!row?.prescription_id) {
        throw new Error('Falha ao criar/atualizar prescrição');
      }

      return {
        id: row.prescription_id,
        upserted: Boolean(row.upserted),
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(
        result.upserted ? 'Período existente atualizado' : 'Prescrição criada com sucesso!'
      );
    },
    onError: (error) => {
      console.error('Error creating prescription:', error);
      toast.error('Erro ao criar prescrição');
    },
  });
}

export function useUpdatePrescription() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTables<'prescription'> & { id: string }) => {
      if (!company?.id) throw new Error('No company');

      const { data: prescription, error } = await supabase
        .from('prescription')
        .update(data as any)
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .select()
        .single();

      if (error) throw error;
      return prescription as Prescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Prescrição atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating prescription:', error);
      toast.error('Erro ao atualizar prescrição');
    },
  });
}

export function useDeletePrescription() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!company?.id) throw new Error('No company');

      const { error } = await supabase
        .from('prescription')
        .delete()
        .eq('company_id', company.id)
        .filter('id', 'eq', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Prescrição excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting prescription:', error);
      toast.error('Erro ao excluir prescrição');
    },
  });
}

export function useAddPrescriptionItem() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (data: Omit<InsertTables<'prescription_item'>, 'company_id'>) => {
      if (!company?.id) throw new Error('No company');

      const { data: item, error } = await supabase
        .from('prescription_item')
        .insert({ ...data, company_id: company.id } as any)
        .select()
        .single();

      if (error) throw error;
      return item as PrescriptionItem;
    },
    onSuccess: (item, variables) => {
      queryClient.invalidateQueries({
        queryKey: [ITEMS_QUERY_KEY, variables.prescription_id],
      });

      // Registrar log da criação
      logAction.mutate({
        action: 'create',
        entity: 'prescription_item',
        entityId: item.id,
        entityName: `Item ${item.item_type}`,
        newData: buildLogSnapshot(item, { exclude: ['created_at', 'updated_at'] }),
      });

      toast.success('Item adicionado à prescrição!');
    },
    onError: (error) => {
      console.error('Error adding prescription item:', error);
      toast.error('Erro ao adicionar item');
    },
  });
}

export function useUpdatePrescriptionItem() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({
      id,
      prescriptionId,
      ...data
    }: UpdateTables<'prescription_item'> & {
      id: string;
      prescriptionId: string;
    }) => {
      if (!company?.id) throw new Error('No company');

      // Buscar item atual para log
      const { data: currentItem, error: fetchError } = await supabase
        .from('prescription_item')
        .select('*')
        .eq('id', id)
        .eq('company_id', company.id)
        .single();

      if (fetchError) throw fetchError;

      const { data: item, error } = await supabase
        .from('prescription_item')
        .update(data as any)
        .eq('company_id', company.id)
        .filter('id', 'eq', id)
        .select()
        .single();

      if (error) throw error;
      return { item: item as PrescriptionItem, prescriptionId, currentItem };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [ITEMS_QUERY_KEY, data.prescriptionId],
      });

      // Registrar log da atualização
      logAction.mutate({
        action: 'update',
        entity: 'prescription_item',
        entityId: data.item.id,
        entityName: `Item ${data.item.item_type}`,
        oldData: buildLogSnapshot(data.currentItem, { exclude: ['updated_at'] }),
        newData: buildLogSnapshot(data.item, { exclude: ['updated_at'] }),
      });

      toast.success('Item atualizado!');
    },
    onError: (error) => {
      console.error('Error updating prescription item:', error);
      toast.error('Erro ao atualizar item');
    },
  });
}

export function useDeletePrescriptionItem() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ id, prescriptionId }: { id: string; prescriptionId: string }) => {
      if (!company?.id) throw new Error('No company');

      // Buscar item atual para log
      const { data: currentItem, error: fetchError } = await supabase
        .from('prescription_item')
        .select('*')
        .eq('id', id)
        .eq('company_id', company.id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('prescription_item')
        .delete()
        .eq('company_id', company.id)
        .filter('id', 'eq', id);

      if (error) throw error;
      return { prescriptionId, currentItem };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [ITEMS_QUERY_KEY, data.prescriptionId],
      });

      // Registrar log da exclusão
      logAction.mutate({
        action: 'delete',
        entity: 'prescription_item',
        entityId: data.currentItem.id,
        entityName: `Item ${data.currentItem.item_type}`,
        oldData: buildLogSnapshot(data.currentItem, { exclude: ['updated_at'] }),
      });

      toast.success('Item removido!');
    },
    onError: (error) => {
      console.error('Error deleting prescription item:', error);
      toast.error('Erro ao remover item');
    },
  });
}

export function useUploadPrescriptionAttachment() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async ({ prescriptionId, file }: { prescriptionId: string; file: File }) => {
      if (!company?.id) throw new Error('No company');

      const path = `${company.id}/${prescriptionId}/${file.name}`;
      const uploadedPath = await uploadFile('prescriptions', path, file);

      if (!uploadedPath) throw new Error('Upload failed');

      const {
        data: { publicUrl },
      } = supabase.storage.from('prescriptions').getPublicUrl(uploadedPath);

      // Update prescription with attachment URL
      const { error } = await supabase
        .from('prescription')
        .update({ attachment_url: publicUrl } as any)
        .eq('company_id', company.id)
        .filter('id', 'eq', prescriptionId);

      if (error) throw error;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Anexo enviado com sucesso!');
    },
    onError: (error) => {
      console.error('Error uploading attachment:', error);
      toast.error('Erro ao enviar anexo');
    },
  });
}

// ============================================================
// Prescription Item Components
// ============================================================

export interface PrescriptionItemComponentRow {
  id: string;
  company_id: string;
  prescription_item_id: string;
  product_id: string | null;
  quantity: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ComponentWithProduct extends PrescriptionItemComponentRow {
  product: {
    id: string;
    name: string;
    concentration: string | null;
  } | null;
  prescription_item: {
    start_date: string | null;
    end_date: string | null;
  } | null;
}

export function usePrescriptionItemComponents(prescriptionItemId: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [COMPONENTS_QUERY_KEY, prescriptionItemId],
    queryFn: async () => {
      if (!prescriptionItemId || !company?.id) return [];

      const { data, error } = await supabase
        .from('prescription_item_component')
        .select(PRESCRIPTION_ITEM_COMPONENT_SELECT)
        .eq('prescription_item_id', prescriptionItemId)
        .eq('company_id', company.id)
        .order('created_at');

      if (error) throw error;
      return data as ComponentWithProduct[];
    },
    enabled: !!prescriptionItemId && !!company?.id,
  });
}

export function useAddPrescriptionItemComponent() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async (data: {
      prescription_item_id: string;
      product_id: string | null;
      quantity: number | null;
    }) => {
      if (!company?.id) throw new Error('No company');

      const { data: component, error } = await supabase
        .from('prescription_item_component')
        .insert({
          company_id: company.id,
          prescription_item_id: data.prescription_item_id,
          product_id: data.product_id,
          quantity: data.quantity,
        } as any)
        .select(PRESCRIPTION_ITEM_COMPONENT_SELECT)
        .single();

      if (error) throw error;
      return {
        component: component as ComponentWithProduct,
        prescriptionItemId: data.prescription_item_id,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [COMPONENTS_QUERY_KEY, data.prescriptionItemId],
      });
      queryClient.invalidateQueries({ queryKey: ['prescription-logs'] });

      // Registrar log da adição de componente no item
      logAction.mutate({
        action: 'create',
        entity: 'prescription_item',
        entityId: data.prescriptionItemId,
        entityName: `Componente adicionado: ${data.component.product?.name || 'Produto'}`,
        newData: buildLogSnapshot(data.component, {
          include: ['id', 'product_id', 'quantity'],
        }),
      });

      toast.success('Componente adicionado!');
    },
    onError: (error) => {
      console.error('Error adding component:', error);
      toast.error('Erro ao adicionar componente');
    },
  });
}

export function useUpdatePrescriptionItemComponent() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({
      id,
      prescriptionItemId,
      ...data
    }: {
      id: string;
      prescriptionItemId: string;
      product_id?: string | null;
      quantity?: number | null;
    }) => {
      if (!company?.id) throw new Error('No company');

      // Buscar componente atual para registrar diff no log
      const { data: currentComponent, error: fetchError } = await supabase
        .from('prescription_item_component')
        .select(PRESCRIPTION_ITEM_COMPONENT_SELECT)
        .eq('company_id', company.id)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data: component, error } = await supabase
        .from('prescription_item_component')
        .update(data as any)
        .eq('company_id', company.id)
        .eq('id', id)
        .select(PRESCRIPTION_ITEM_COMPONENT_SELECT)
        .single();

      if (error) throw error;
      return {
        component: component as ComponentWithProduct,
        currentComponent: currentComponent as ComponentWithProduct,
        prescriptionItemId,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [COMPONENTS_QUERY_KEY, data.prescriptionItemId],
      });
      queryClient.invalidateQueries({ queryKey: ['prescription-logs'] });

      // Registrar log da edição de componente no item
      logAction.mutate({
        action: 'update',
        entity: 'prescription_item',
        entityId: data.prescriptionItemId,
        entityName: `Componente atualizado: ${data.component.product?.name || 'Produto'}`,
        oldData: buildLogSnapshot(data.currentComponent, {
          include: ['id', 'product_id', 'quantity'],
        }),
        newData: buildLogSnapshot(data.component, {
          include: ['id', 'product_id', 'quantity'],
        }),
      });

      toast.success('Componente atualizado!');
    },
    onError: (error) => {
      console.error('Error updating component:', error);
      toast.error('Erro ao atualizar componente');
    },
  });
}

export function useDeletePrescriptionItemComponent() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ id, prescriptionItemId }: { id: string; prescriptionItemId: string }) => {
      if (!company?.id) throw new Error('No company');

      // Buscar componente antes de remover para registrar log
      const { data: currentComponent, error: fetchError } = await supabase
        .from('prescription_item_component')
        .select(PRESCRIPTION_ITEM_COMPONENT_SELECT)
        .eq('company_id', company.id)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('prescription_item_component')
        .delete()
        .eq('company_id', company.id)
        .eq('id', id);

      if (error) throw error;
      return { prescriptionItemId, currentComponent: currentComponent as ComponentWithProduct };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [COMPONENTS_QUERY_KEY, data.prescriptionItemId],
      });
      queryClient.invalidateQueries({ queryKey: ['prescription-logs'] });

      // Registrar log da remoção de componente no item
      logAction.mutate({
        action: 'delete',
        entity: 'prescription_item',
        entityId: data.prescriptionItemId,
        entityName: `Componente removido: ${data.currentComponent.product?.name || 'Produto'}`,
        oldData: buildLogSnapshot(data.currentComponent, {
          include: ['id', 'product_id', 'quantity'],
        }),
      });

      toast.success('Componente removido!');
    },
    onError: (error) => {
      console.error('Error deleting component:', error);
      toast.error('Erro ao remover componente');
    },
  });
}

// Hook para alternar status ativo/inativo do item de prescrição
export function useTogglePrescriptionItemActive() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!company?.id) throw new Error('No company');

      // Buscar item atual para log
      const { data: currentItem, error: fetchError } = await supabase
        .from('prescription_item')
        .select('*')
        .eq('id', id)
        .eq('company_id', company.id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('prescription_item')
        .update({ is_active })
        .eq('company_id', company.id)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { data, currentItem, prescriptionId: currentItem.prescription_id };
    },
    onSuccess: ({ data, currentItem, prescriptionId }) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: [ITEMS_QUERY_KEY, prescriptionId],
      });

      // Registrar log da alteração
      logAction.mutate({
        action: 'update',
        entity: 'prescription_item',
        entityId: data.id,
        entityName: `Item ${data.item_type} - ${data.is_active ? 'Ativado' : 'Desativado'}`,
        oldData: buildLogSnapshot(currentItem, { exclude: ['updated_at'] }),
        newData: buildLogSnapshot(data, { exclude: ['updated_at'] }),
      });

      toast.success(`Item ${data.is_active ? 'ativado' : 'desativado'} com sucesso!`);
    },
    onError: (error) => {
      console.error('Error toggling prescription item is_active:', error);
      toast.error('Erro ao alterar status do item');
    },
  });
}

// Hook para suspender medicação com data final
export function useSuspendPrescriptionItemWithDate() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({ id, endDate }: { id: string; endDate: string }) => {
      if (!company?.id) throw new Error('No company');

      // Buscar item atual para log
      const { data: currentItem, error: fetchError } = await supabase
        .from('prescription_item')
        .select('*')
        .eq('id', id)
        .eq('company_id', company.id)
        .single();

      if (fetchError) throw fetchError;

      // Preparar dados de atualização
      const updateData: any = {
        is_continuous_use: false,
        end_date: endDate,
      };

      // Preencher data inicial com data de criação se não existir
      if (!currentItem.start_date) {
        const createdAt = currentItem.created_at;
        if (createdAt) {
          // Extrair apenas a data (formato YYYY-MM-DD)
          updateData.start_date = createdAt.split('T')[0];
        }
      }

      const { data, error } = await supabase
        .from('prescription_item')
        .update(updateData)
        .eq('company_id', company.id)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { data, currentItem, prescriptionId: currentItem.prescription_id };
    },
    onSuccess: ({ data, currentItem, prescriptionId }) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({
        queryKey: [ITEMS_QUERY_KEY, prescriptionId],
      });

      // Registrar log da alteração
      logAction.mutate({
        action: 'update',
        entity: 'prescription_item',
        entityId: data.id,
        entityName: `Item ${data.item_type} - Suspenso em ${data.end_date}`,
        oldData: buildLogSnapshot(currentItem, { exclude: ['updated_at'] }),
        newData: buildLogSnapshot(data, { exclude: ['updated_at'] }),
      });

      toast.success(`Item suspenso com sucesso até ${data.end_date}!`);
    },
    onError: (error) => {
      console.error('Error suspending prescription item:', error);
      toast.error('Erro ao suspender item');
    },
  });
}

// Hook para buscar logs de uma prescrição específica
export function usePrescriptionLogs(prescriptionId: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['prescription-logs', prescriptionId],
    queryFn: async () => {
      if (!prescriptionId || !company?.id) return [];

      // Primeiro, buscar todos os itens da prescrição para obter seus IDs
      const { data: items, error: itemsError } = await supabase
        .from('prescription_item')
        .select('id')
        .eq('prescription_id', prescriptionId);

      if (itemsError) throw itemsError;

      const itemIds = items?.map((item) => item.id) || [];

      const selectFields = `
          *,
          app_user:user_id(name, email)
        `;

      const prescriptionQuery = supabase
        .from('user_action_logs')
        .select(selectFields)
        .eq('company_id', company.id)
        .eq('entity', 'prescription')
        .eq('entity_id', prescriptionId);

      const itemQuery =
        itemIds.length > 0
          ? supabase
              .from('user_action_logs')
              .select(selectFields)
              .eq('company_id', company.id)
              .eq('entity', 'prescription_item')
              .in('entity_id', itemIds)
          : null;

      const [prescriptionResult, itemResult] = await Promise.all([
        prescriptionQuery.order('created_at', { ascending: false }),
        itemQuery
          ? itemQuery.order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (prescriptionResult.error) throw prescriptionResult.error;
      if (itemResult.error) throw itemResult.error;

      const merged = [...(prescriptionResult.data || []), ...(itemResult.data || [])];
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return merged as Array<{
        id: string;
        company_id: string;
        user_id?: string;
        action: 'create' | 'update' | 'delete';
        entity: string;
        entity_id?: string;
        entity_name?: string;
        old_data?: Record<string, any>;
        new_data?: Record<string, any>;
        created_at: string;
        app_user?: {
          name: string;
          email: string;
        };
      }>;
    },
    enabled: !!prescriptionId && !!company?.id,
  });
}

export function useDuplicatePrescriptionItem() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const logAction = useLogAction();

  return useMutation({
    mutationFn: async ({
      item,
      prescriptionId,
      components = [],
    }: {
      item: PrescriptionItem;
      prescriptionId: string;
      components?: PrescriptionItemComponent[];
    }) => {
      if (!company?.id) throw new Error('No company');

      // Prepare data for duplication, excluding id and timestamps
      const duplicateData = {
        prescription_id: prescriptionId,
        company_id: company.id,
        item_type: item.item_type,
        product_id: item.product_id,
        equipment_id: item.equipment_id,
        procedure_id: (item as any).procedure_id,
        quantity: item.quantity,
        frequency_mode: item.frequency_mode,
        times_value: item.times_value,
        times_unit: item.times_unit,
        interval_minutes: item.interval_minutes,
        time_start: item.time_start,
        time_checks: item.time_checks,
        week_days: item.week_days,
        route_id: item.route_id,
        start_date: item.start_date,
        end_date: item.end_date,
        is_prn: item.is_prn,
        is_continuous_use: item.is_continuous_use,
        justification: item.justification,
        instructions_use: item.instructions_use,
        instructions_pharmacy: item.instructions_pharmacy,
        is_active: item.is_active,
      };

      const { data: duplicatedItem, error } = await supabase
        .from('prescription_item')
        .insert(duplicateData as any)
        .select()
        .single();

      if (error) throw error;
      // Duplicate components if any exist
      if (components && components.length > 0) {
        const componentsData = components.map((comp: any) => {
          // Extract product_id from either direct field or product object
          let productId = comp.product_id;
          if (!productId && comp.product && typeof comp.product === 'object') {
            productId = comp.product.id;
          }

          return {
            prescription_item_id: duplicatedItem.id,
            company_id: company.id,
            product_id: productId,
            quantity: comp.quantity,
          };
        });

        const { error: componentsError } = await supabase
          .from('prescription_item_component')
          .insert(componentsData as any);

        if (componentsError) {
          console.error('Error duplicating components:', componentsError);
          // Don't throw, just log - the item was successfully created
        }
      }

      return duplicatedItem as PrescriptionItem;
    },
    onSuccess: (duplicatedItem, { prescriptionId, components }) => {
      queryClient.invalidateQueries({
        queryKey: [ITEMS_QUERY_KEY, prescriptionId],
      });
      if (components && components.length > 0) {
        queryClient.invalidateQueries({
          queryKey: [COMPONENTS_QUERY_KEY, duplicatedItem.id],
        });
      }

      // Registrar log da duplicação
      logAction.mutate({
        action: 'create',
        entity: 'prescription_item',
        entityId: duplicatedItem.id,
        entityName: `Item ${duplicatedItem.item_type} (duplicado)`,
        newData: buildLogSnapshot(duplicatedItem, { exclude: ['created_at', 'updated_at'] }),
      });

      const componentCount =
        components && components.length > 0 ? ` com ${components.length} componente(s)` : '';
      toast.success(`Item duplicado com sucesso!${componentCount}`);
    },
    onError: (error) => {
      console.error('Error duplicating prescription item:', error);
      toast.error('Erro ao duplicar item');
    },
  });
}
