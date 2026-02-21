import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface EvaluationDefinition {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EvaluationInstance {
  id: string;
  company_id: string;
  evaluation_id: string;
  instance_id: string;
  created_at: string;
  updated_at: string;
}

export interface EvaluationAspect {
  id: string;
  company_id: string;
  evaluation_id: string;
  name: string;
  instructions: string | null;
  weight: number | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEvaluationInput {
  company_id: string;
  name: string;
  description?: string;
  active?: boolean;
  instance_ids?: string[];
}

export interface UpdateEvaluationInput {
  id: string;
  name?: string;
  description?: string;
  active?: boolean;
  instance_ids?: string[];
}

export interface CreateAspectInput {
  company_id: string;
  evaluation_id: string;
  name: string;
  instructions?: string;
  weight?: number | null;
  sort_order?: number;
  active?: boolean;
}

export interface UpdateAspectInput {
  id: string;
  name?: string;
  instructions?: string;
  weight?: number | null;
  sort_order?: number;
  active?: boolean;
}

export function useEvaluations(companyId?: string) {
  return useQuery({
    queryKey: ['whatsapp_evaluations', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('evaluation')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EvaluationDefinition[];
    },
    enabled: !!companyId,
  });
}

export function useEvaluationsForInstance(companyId?: string, instanceId?: string | null) {
  return useQuery({
    queryKey: ['whatsapp_evaluations_for_instance', companyId, instanceId],
    queryFn: async () => {
      if (!companyId) return [];

      if (!instanceId) {
        // Se não há instanceId, retornar apenas avaliações globais (sem instâncias associadas)
        const { data, error } = await supabase
          .from('evaluation')
          .select(
            `
            *,
            evaluation_instance!left(id)
          `
          )
          .eq('company_id', companyId)
          .eq('active', true)
          .is('evaluation_instance.id', null)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as EvaluationDefinition[];
      } else {
        // Buscar avaliações específicas para essa instância ou globais
        const { data, error } = await supabase
          .from('evaluation')
          .select(
            `
            *,
            evaluation_instance!left(instance_id)
          `
          )
          .eq('company_id', companyId)
          .eq('active', true)
          .or(`evaluation_instance.instance_id.eq.${instanceId},evaluation_instance.id.is.null`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as EvaluationDefinition[];
      }
    },
    enabled: !!companyId,
  });
}

export function useEvaluationInstances(evaluationId?: string) {
  return useQuery({
    queryKey: ['whatsapp_evaluation_instances', evaluationId],
    queryFn: async () => {
      if (!evaluationId) return [];

      const { data, error } = await supabase
        .from('evaluation_instance')
        .select('instance_id')
        .eq('evaluation_id', evaluationId);

      if (error) throw error;
      return data.map((item) => item.instance_id);
    },
    enabled: !!evaluationId,
  });
}

export function useEvaluationAspects(evaluationId?: string) {
  return useQuery({
    queryKey: ['whatsapp_evaluation_aspects', evaluationId],
    queryFn: async () => {
      if (!evaluationId) return [];

      const { data, error } = await supabase
        .from('evaluation_aspect')
        .select('*')
        .eq('evaluation_id', evaluationId)
        .order('sort_order')
        .order('name');

      if (error) throw error;
      return data as EvaluationAspect[];
    },
    enabled: !!evaluationId,
  });
}

export function useCreateEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEvaluationInput) => {
      // Criar a avaliação
      const { data: evaluation, error } = await supabase
        .from('evaluation')
        .insert({
          company_id: input.company_id,
          name: input.name,
          description: input.description || null,
          active: input.active ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      // Se instance_ids fornecido, criar relacionamentos
      if (input.instance_ids && input.instance_ids.length > 0) {
        const evaluationInstances = input.instance_ids.map((instanceId) => ({
          company_id: input.company_id,
          evaluation_id: evaluation.id,
          instance_id: instanceId,
        }));

        const { error: instanceError } = await supabase
          .from('evaluation_instance')
          .insert(evaluationInstances);

        if (instanceError) throw instanceError;
      }

      return evaluation as EvaluationDefinition;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_evaluations', data.company_id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_evaluations_for_instance'] });
    },
  });
}

export function useUpdateEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateEvaluationInput) => {
      const { id, instance_ids, ...updates } = input;

      // Atualizar a avaliação
      const { data: evaluation, error } = await supabase
        .from('evaluation')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Se instance_ids foi fornecido, atualizar relacionamentos
      if (instance_ids !== undefined) {
        // Remover relacionamentos existentes
        const { error: deleteError } = await supabase
          .from('evaluation_instance')
          .delete()
          .eq('evaluation_id', id);

        if (deleteError) throw deleteError;

        // Criar novos relacionamentos se houver instâncias
        if (instance_ids.length > 0) {
          const evaluationInstances = instance_ids.map((instanceId) => ({
            company_id: evaluation.company_id,
            evaluation_id: id,
            instance_id: instanceId,
          }));

          const { error: insertError } = await supabase
            .from('evaluation_instance')
            .insert(evaluationInstances);

          if (insertError) throw insertError;
        }
      }

      return evaluation as EvaluationDefinition;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_evaluations', data.company_id] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp_evaluations_for_instance'] });
    },
  });
}

export function useDeleteEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('evaluation').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_evaluations'] });
    },
  });
}

export function useCreateAspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAspectInput) => {
      const { data, error } = await supabase
        .from('evaluation_aspect')
        .insert({
          company_id: input.company_id,
          evaluation_id: input.evaluation_id,
          name: input.name,
          instructions: input.instructions || null,
          weight: input.weight ?? null,
          sort_order: input.sort_order ?? 0,
          active: input.active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EvaluationAspect;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp_evaluation_aspects', data.evaluation_id],
      });
    },
  });
}

export function useUpdateAspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateAspectInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('evaluation_aspect')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as EvaluationAspect;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp_evaluation_aspects', data.evaluation_id],
      });
    },
  });
}

export function useDeleteAspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('evaluation_aspect').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_evaluation_aspects'] });
    },
  });
}
