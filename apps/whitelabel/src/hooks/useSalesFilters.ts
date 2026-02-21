import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SalesFilters } from '@/types/sales';
import { getDateRange } from '@/utils/metrics';

/**
 * Hook para gerenciar filtros globais do dashboard de vendas
 */
export function useSalesFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Helper para garantir que o valor é uma string válida
  const sanitizeValue = (value: unknown): string => {
    if (typeof value === 'string') {
      if (value === '[object Object]') return '';
      return value;
    }
    if (value && typeof value === 'object' && 'value' in value) {
      return String((value as { value: unknown }).value);
    }
    return '';
  };

  // Estado dos filtros aplicados (atuais)
  const [period, setPeriod] = useState<string>(searchParams.get('period') || '2026-02');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [filial, setFilial] = useState<string[]>(
    searchParams.get('filial') ? searchParams.get('filial')!.split(',') : []
  );
  const [clientesAplicados, setClientesAplicados] = useState<string[]>(
    searchParams.get('clientes') ? searchParams.get('clientes')!.split(',') : []
  );
  const [produto, setProduto] = useState<string[]>(
    searchParams.get('produto') ? searchParams.get('produto')!.split(',') : []
  );

  // Estado dos filtros temporários (antes da confirmação)
  const [clientesTemp, setClientesTemp] = useState<string[]>(clientesAplicados);
  const [filialTemp, setFilialTemp] = useState<string[]>(filial);
  const [produtoTemp, setProdutoTemp] = useState<string[]>(produto);

  // Refs para rastrear o tamanho anterior dos arrays (detecção de remoção)
  const prevClientesTempLengthRef = useRef(clientesTemp.length);
  const prevFilialTempLengthRef = useRef(filialTemp.length);
  const prevProdutoTempLengthRef = useRef(produtoTemp.length);

  // Calcula as datas baseado no período
  const { startDate, endDate } = useMemo(() => {
    console.log('📅 [useSalesFilters] Recalculando datas para período:', period);

    if (period === 'custom' && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }

    const result = getDateRange(period);
    console.log('📅 [useSalesFilters] Datas calculadas:', {
      period,
      startDate: result.startDate.toISOString().split('T')[0],
      endDate: result.endDate.toISOString().split('T')[0],
    });

    return result;
  }, [period, customStartDate, customEndDate]);

  // Atualiza URL com os filtros
  const updateSearchParams = useCallback(
    (
      newFilters: Partial<
        SalesFilters & {
          clientes?: string[];
          filial?: string[];
          produto?: string[];
        }
      >
    ) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(newFilters).forEach(([key, value]) => {
        if (['clientes', 'filial', 'produto'].includes(key) && Array.isArray(value)) {
          if (value.length > 0) {
            params.set(key, value.join(','));
          } else {
            params.delete(key);
          }
        } else if (value !== undefined && value !== '' && value !== null) {
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      });

      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  // Auto-apply quando um filtro é removido (tamanho do array diminui)
  useEffect(() => {
    if (clientesTemp.length < prevClientesTempLengthRef.current) {
      // Usuário removeu um cliente - aplicar automaticamente
      setClientesAplicados(clientesTemp);
      updateSearchParams({ clientes: clientesTemp });
    }
    prevClientesTempLengthRef.current = clientesTemp.length;
  }, [clientesTemp, updateSearchParams]);

  useEffect(() => {
    if (filialTemp.length < prevFilialTempLengthRef.current) {
      // Usuário removeu uma filial - aplicar automaticamente
      setFilial(filialTemp);
      updateSearchParams({ filial: filialTemp });
    }
    prevFilialTempLengthRef.current = filialTemp.length;
  }, [filialTemp, updateSearchParams]);

  useEffect(() => {
    if (produtoTemp.length < prevProdutoTempLengthRef.current) {
      // Usuário removeu um produto - aplicar automaticamente
      setProduto(produtoTemp);
      updateSearchParams({ produto: produtoTemp });
    }
    prevProdutoTempLengthRef.current = produtoTemp.length;
  }, [produtoTemp, updateSearchParams]);

  // Handlers - sanitizam o valor antes de armazenar
  const handlePeriodChange = useCallback(
    (newPeriod: string) => {
      console.log('🗓️ [handlePeriodChange] Mudança de período solicitada:', newPeriod);
      const sanitized = sanitizeValue(newPeriod);
      const finalPeriod = sanitized || '2026-02'; // Default para fevereiro 2026
      console.log('🗓️ [handlePeriodChange] Período final:', finalPeriod);
      setPeriod(finalPeriod);
      updateSearchParams({ period: finalPeriod });
    },
    [updateSearchParams]
  );

  const handleFilialChange = useCallback((value: string[]) => {
    setFilialTemp(value);
  }, []);

  const handleApplyFilialFilter = useCallback(() => {
    setFilial(filialTemp);
    updateSearchParams({ filial: filialTemp });
  }, [filialTemp, updateSearchParams]);

  const handleCancelFilialFilter = useCallback(() => {
    setFilialTemp(filial);
  }, [filial]);

  const handleClientesTempChange = useCallback((value: string[]) => {
    // Garantir que value seja sempre um array com valores válidos
    const sanitizedValue = value.filter(
      (v) => typeof v === 'string' && v.trim() !== '' && v !== '[object Object]'
    );

    setClientesTemp(sanitizedValue);
  }, []);

  const handleApplyClientesFilter = useCallback(() => {
    setClientesAplicados(clientesTemp);
    updateSearchParams({ clientes: clientesTemp });
  }, [clientesTemp, updateSearchParams]);

  const handleCancelClientesFilter = useCallback(() => {
    setClientesTemp(clientesAplicados);
  }, [clientesAplicados]);

  const handleProdutoChange = useCallback((value: string[]) => {
    setProdutoTemp(value);
  }, []);

  const handleApplyProdutoFilter = useCallback(() => {
    setProduto(produtoTemp);
    updateSearchParams({ produto: produtoTemp });
  }, [produtoTemp, updateSearchParams]);

  const handleCancelProdutoFilter = useCallback(() => {
    setProdutoTemp(produto);
  }, [produto]);

  const handleCustomDateChange = useCallback((start: Date, end: Date) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setPeriod('custom');
  }, []);

  const clearFilters = useCallback(() => {
    setPeriod('2026-02'); // Padrão para fevereiro 2026
    setFilial([]);
    setFilialTemp([]);
    setClientesAplicados([]);
    setClientesTemp([]);
    setProduto([]);
    setProdutoTemp([]);
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Retorno
  return {
    // Estado
    period,
    startDate,
    endDate,
    filial,
    filialTemp,
    clientesAplicados,
    clientesTemp,
    produto,
    produtoTemp,

    // Handlers
    handlePeriodChange,
    handleFilialChange,
    handleApplyFilialFilter,
    handleCancelFilialFilter,
    handleClientesTempChange,
    handleApplyClientesFilter,
    handleCancelClientesFilter,
    handleProdutoChange,
    handleApplyProdutoFilter,
    handleCancelProdutoFilter,
    handleCustomDateChange,
    clearFilters,

    // Estados de controle
    hasClientesPendingChanges: JSON.stringify(clientesTemp) !== JSON.stringify(clientesAplicados),
    hasFilialPendingChanges: JSON.stringify(filialTemp) !== JSON.stringify(filial),
    hasProdutoPendingChanges: JSON.stringify(produtoTemp) !== JSON.stringify(produto),

    // Filtros para a query
    queryFilters: {
      filial: filial.length > 0 ? filial : undefined,
      clientes: clientesAplicados.length > 0 ? clientesAplicados : undefined,
      produto: produto.length > 0 ? produto : undefined,
    },
  };
}

// Opções de período disponíveis - últimos 12 meses (ordem decrescente começando do atual)
export const periodOptions = [
  // Últimos 12 meses a partir de fevereiro/2026
  { value: '2026-02', label: 'Fevereiro 2026' },
  { value: '2026-01', label: 'Janeiro 2026' },
  { value: '2025-12', label: 'Dezembro 2025' },
  { value: '2025-11', label: 'Novembro 2025' },
  { value: '2025-10', label: 'Outubro 2025' },
  { value: '2025-09', label: 'Setembro 2025' },
  { value: '2025-08', label: 'Agosto 2025' },
  { value: '2025-07', label: 'Julho 2025' },
  { value: '2025-06', label: 'Junho 2025' },
  { value: '2025-05', label: 'Maio 2025' },
  { value: '2025-04', label: 'Abril 2025' },
  { value: '2025-03', label: 'Março 2025' },
];
