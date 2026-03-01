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
  const [grupo, setGrupo] = useState<string[]>(
    searchParams.get('grupo') ? searchParams.get('grupo')!.split(',') : []
  );
  const [regional, setRegional] = useState<string[]>(
    searchParams.get('regional') ? searchParams.get('regional')!.split(',') : []
  );

  // Estado dos filtros temporários (antes da confirmação)
  const [clientesTemp, setClientesTemp] = useState<string[]>(clientesAplicados);
  const [filialTemp, setFilialTemp] = useState<string[]>(filial);
  const [grupoTemp, setGrupoTemp] = useState<string[]>(grupo);
  const [regionalTemp, setRegionalTemp] = useState<string[]>(regional);

  // Refs para rastrear o tamanho anterior dos arrays (detecção de remoção)
  const prevClientesTempLengthRef = useRef(clientesTemp.length);
  const prevFilialTempLengthRef = useRef(filialTemp.length);
  const prevGrupoTempLengthRef = useRef(grupoTemp.length);
  const prevRegionalTempLengthRef = useRef(regionalTemp.length);

  // Calcula as datas baseado no período
  const { startDate, endDate } = useMemo(() => {
    if (period === 'custom' && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }

    return getDateRange(period);
  }, [period, customStartDate, customEndDate]);

  // Atualiza URL com os filtros
  const updateSearchParams = useCallback(
    (
      newFilters: Partial<
        SalesFilters & {
          clientes?: string[];
          filial?: string[];
          grupo?: string[];
          regional?: string[];
        }
      >
    ) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(newFilters).forEach(([key, value]) => {
        if (['clientes', 'filial', 'grupo', 'regional'].includes(key) && Array.isArray(value)) {
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
    if (grupoTemp.length < prevGrupoTempLengthRef.current) {
      // Usuário removeu um produto - aplicar automaticamente
      setGrupo(grupoTemp);
      updateSearchParams({ grupo: grupoTemp });
    }
    prevGrupoTempLengthRef.current = grupoTemp.length;
  }, [grupoTemp, updateSearchParams]);

  useEffect(() => {
    if (regionalTemp.length < prevRegionalTempLengthRef.current) {
      setRegional(regionalTemp);
      updateSearchParams({ regional: regionalTemp });
    }
    prevRegionalTempLengthRef.current = regionalTemp.length;
  }, [regionalTemp, updateSearchParams]);

  // Handlers - sanitizam o valor antes de armazenar
  const handlePeriodChange = useCallback(
    (newPeriod: string | { target: { value: string } }) => {
      // Extrair valor se for um evento, ou usar diretamente se for string
      let finalPeriod: string;
      if (typeof newPeriod === 'string') {
        finalPeriod = newPeriod || '2026-02';
      } else if (newPeriod && typeof newPeriod === 'object' && 'target' in newPeriod) {
        finalPeriod = newPeriod.target.value || '2026-02';
      } else {
        finalPeriod = '2026-02';
      }

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

  const handleGrupoChange = useCallback((value: string[]) => {
    setGrupoTemp(value);
  }, []);

  const handleApplyGrupoFilter = useCallback(() => {
    setGrupo(grupoTemp);
    updateSearchParams({ grupo: grupoTemp });
  }, [grupoTemp, updateSearchParams]);

  const handleCancelGrupoFilter = useCallback(() => {
    setGrupoTemp(grupo);
  }, [grupo]);

  const handleRegionalChange = useCallback((value: string[]) => {
    setRegionalTemp(value);
  }, []);

  const handleApplyRegionalFilter = useCallback(() => {
    setRegional(regionalTemp);
    updateSearchParams({ regional: regionalTemp });
  }, [regionalTemp, updateSearchParams]);

  const handleCancelRegionalFilter = useCallback(() => {
    setRegionalTemp(regional);
  }, [regional]);

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
    setGrupo([]);
    setGrupoTemp([]);
    setRegional([]);
    setRegionalTemp([]);
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
    grupo,
    grupoTemp,
    regional,
    regionalTemp,

    // Handlers
    handlePeriodChange,
    handleFilialChange,
    handleApplyFilialFilter,
    handleCancelFilialFilter,
    handleClientesTempChange,
    handleApplyClientesFilter,
    handleCancelClientesFilter,
    handleGrupoChange,
    handleApplyGrupoFilter,
    handleCancelGrupoFilter,
    handleRegionalChange,
    handleApplyRegionalFilter,
    handleCancelRegionalFilter,
    handleCustomDateChange,
    clearFilters,

    // Estados de controle
    hasClientesPendingChanges: JSON.stringify(clientesTemp) !== JSON.stringify(clientesAplicados),
    hasFilialPendingChanges: JSON.stringify(filialTemp) !== JSON.stringify(filial),
    hasGrupoPendingChanges: JSON.stringify(grupoTemp) !== JSON.stringify(grupo),
    hasRegionalPendingChanges: JSON.stringify(regionalTemp) !== JSON.stringify(regional),

    // Filtros para a query
    queryFilters: {
      filial: filial.length > 0 ? filial : undefined,
      clientes: clientesAplicados.length > 0 ? clientesAplicados : undefined,
      grupo: grupo.length > 0 ? grupo : undefined,
      regional: regional.length > 0 ? regional : undefined,
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
