import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, resolvedSupabaseUrl, resolvedSupabaseAnonKey } from '../lib/supabase';
import type {
  CompanyDatabase,
  CompanyDatabaseCreate,
  CompanyDatabaseUpdate,
  DatabaseConnectionTestResult,
  DatabaseQueryResult,
} from '../types/companyDatabase';

// ============================================
// Funções de API (chamam a Edge Function)
// ============================================

async function callDatabaseFunction<T>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch(`${resolvedSupabaseUrl}/functions/v1/company-database`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: resolvedSupabaseAnonKey,
    },
    body: JSON.stringify({ action, ...params }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Erro ao executar operação');
  }

  return result.data as T;
}

// ============================================
// Queries
// ============================================

/**
 * Lista todas as conexões de banco de uma empresa
 */
export function useCompanyDatabases(companyId?: string) {
  return useQuery({
    queryKey: ['company-databases', companyId],
    queryFn: async () => {
      return callDatabaseFunction<CompanyDatabase[]>('list', { company_id: companyId });
    },
    enabled: !!companyId,
  });
}

/**
 * Busca uma conexão de banco específica
 */
export function useCompanyDatabase(databaseId?: string) {
  return useQuery({
    queryKey: ['company-database', databaseId],
    queryFn: async () => {
      return callDatabaseFunction<CompanyDatabase>('get', { database_id: databaseId });
    },
    enabled: !!databaseId,
  });
}

// ============================================
// Mutations
// ============================================

/**
 * Cria uma nova conexão de banco
 */
export function useCreateCompanyDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connection: CompanyDatabaseCreate) => {
      return callDatabaseFunction<{ id: string; name: string; company_id: string }>('create', {
        connection,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company-databases', data.company_id] });
    },
  });
}

/**
 * Atualiza uma conexão de banco existente
 */
export function useUpdateCompanyDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      databaseId,
      connection,
    }: {
      databaseId: string;
      connection: CompanyDatabaseUpdate;
    }) => {
      return callDatabaseFunction<{ id: string; name: string; company_id: string }>('update', {
        database_id: databaseId,
        connection,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['company-databases', data.company_id] });
      queryClient.invalidateQueries({ queryKey: ['company-database', data.id] });
    },
  });
}

/**
 * Exclui uma conexão de banco
 */
export function useDeleteCompanyDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (databaseId: string) => {
      return callDatabaseFunction<{ deleted: boolean }>('delete', {
        database_id: databaseId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-databases'] });
    },
  });
}

/**
 * Testa a conexão com o banco de dados
 */
export function useTestDatabaseConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (databaseId: string) => {
      return callDatabaseFunction<DatabaseConnectionTestResult>('test', {
        database_id: databaseId,
      });
    },
    onSuccess: (_, databaseId) => {
      queryClient.invalidateQueries({ queryKey: ['company-database', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['company-databases'] });
    },
  });
}

/**
 * Executa uma query no banco de dados externo
 */
export function useExecuteDatabaseQuery() {
  return useMutation({
    mutationFn: async ({
      databaseId,
      query,
      params = [],
    }: {
      databaseId: string;
      query: string;
      params?: unknown[];
    }) => {
      return callDatabaseFunction<DatabaseQueryResult>('query', {
        database_id: databaseId,
        query,
        params,
      });
    },
  });
}

// ============================================
// Hook para execução de query com estado
// ============================================

import { useState, useCallback } from 'react';

export function useDatabaseQueryExecution(databaseId?: string) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<DatabaseQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = useCallback(
    async (query: string, params?: unknown[]) => {
      if (!databaseId) {
        setError('Nenhum banco de dados selecionado');
        return null;
      }

      setIsExecuting(true);
      setError(null);

      try {
        const queryResult = await callDatabaseFunction<DatabaseQueryResult>('query', {
          database_id: databaseId,
          query,
          params,
        });

        setResult(queryResult);
        return queryResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao executar query';
        setError(errorMessage);
        setResult(null);
        return null;
      } finally {
        setIsExecuting(false);
      }
    },
    [databaseId]
  );

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    executeQuery,
    clearResult,
    isExecuting,
    result,
    error,
  };
}
