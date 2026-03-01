import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SalesFilters } from '@/types/sales';
import { getDateRange } from '@/utils/metrics';

function getCurrentPeriodValue(referenceDate = new Date()): string {
  return `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
}

function parsePeriodValue(period?: string | null): Date | null {
  if (!period) {
    return null;
  }

  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;

  return new Date(year, month, 1);
}

function formatPeriodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function getPeriodOptions(period?: string | null) {
  const now = new Date();
  const selectedPeriodDate = parsePeriodValue(period);
  const referenceDate =
    selectedPeriodDate &&
    selectedPeriodDate.getTime() > new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      ? selectedPeriodDate
      : now;

  return Array.from({ length: 12 }, (_, index) => {
    const optionDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - index, 1);
    const value = getCurrentPeriodValue(optionDate);

    return {
      value,
      label: formatPeriodLabel(value),
    };
  });
}

export const DEFAULT_PERIOD = getCurrentPeriodValue();
export const periodOptions = getPeriodOptions(DEFAULT_PERIOD);

/**
 * Hook para gerenciar filtros globais do dashboard de vendas
 */
export function useSalesFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [period, setPeriod] = useState<string>(searchParams.get('period') || DEFAULT_PERIOD);
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
  const [vendedor, setVendedor] = useState<string[]>(
    searchParams.get('vendedor') ? searchParams.get('vendedor')!.split(',') : []
  );

  const [clientesTemp, setClientesTemp] = useState<string[]>(clientesAplicados);
  const [filialTemp, setFilialTemp] = useState<string[]>(filial);
  const [grupoTemp, setGrupoTemp] = useState<string[]>(grupo);
  const [regionalTemp, setRegionalTemp] = useState<string[]>(regional);
  const [vendedorTemp, setVendedorTemp] = useState<string[]>(vendedor);

  const prevClientesTempLengthRef = useRef(clientesTemp.length);
  const prevFilialTempLengthRef = useRef(filialTemp.length);
  const prevGrupoTempLengthRef = useRef(grupoTemp.length);
  const prevRegionalTempLengthRef = useRef(regionalTemp.length);
  const prevVendedorTempLengthRef = useRef(vendedorTemp.length);

  const { startDate, endDate } = useMemo(() => {
    if (period === 'custom' && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }

    return getDateRange(period);
  }, [period, customStartDate, customEndDate]);

  const updateSearchParams = useCallback(
    (
      newFilters: Partial<
        SalesFilters & {
          clientes?: string[];
          filial?: string[];
          grupo?: string[];
          regional?: string[];
          vendedor?: string[];
        }
      >
    ) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(newFilters).forEach(([key, value]) => {
        if (
          ['clientes', 'filial', 'grupo', 'regional', 'vendedor'].includes(key) &&
          Array.isArray(value)
        ) {
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

  useEffect(() => {
    if (clientesTemp.length < prevClientesTempLengthRef.current) {
      setClientesAplicados(clientesTemp);
      updateSearchParams({ clientes: clientesTemp });
    }
    prevClientesTempLengthRef.current = clientesTemp.length;
  }, [clientesTemp, updateSearchParams]);

  useEffect(() => {
    if (filialTemp.length < prevFilialTempLengthRef.current) {
      setFilial(filialTemp);
      updateSearchParams({ filial: filialTemp });
    }
    prevFilialTempLengthRef.current = filialTemp.length;
  }, [filialTemp, updateSearchParams]);

  useEffect(() => {
    if (grupoTemp.length < prevGrupoTempLengthRef.current) {
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

  useEffect(() => {
    if (vendedorTemp.length < prevVendedorTempLengthRef.current) {
      setVendedor(vendedorTemp);
      updateSearchParams({ vendedor: vendedorTemp });
    }
    prevVendedorTempLengthRef.current = vendedorTemp.length;
  }, [vendedorTemp, updateSearchParams]);

  const handlePeriodChange = useCallback(
    (newPeriod: string | { target: { value: string } }) => {
      let finalPeriod: string;

      if (typeof newPeriod === 'string') {
        finalPeriod = newPeriod || DEFAULT_PERIOD;
      } else if (newPeriod && typeof newPeriod === 'object' && 'target' in newPeriod) {
        finalPeriod = newPeriod.target.value || DEFAULT_PERIOD;
      } else {
        finalPeriod = DEFAULT_PERIOD;
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

  const handleVendedorChange = useCallback((value: string[]) => {
    const sanitizedValue = value.filter(
      (v) => typeof v === 'string' && v.trim() !== '' && v !== '[object Object]'
    );

    setVendedorTemp(sanitizedValue);
  }, []);

  const handleApplyVendedorFilter = useCallback(() => {
    setVendedor(vendedorTemp);
    updateSearchParams({ vendedor: vendedorTemp });
  }, [vendedorTemp, updateSearchParams]);

  const handleCancelVendedorFilter = useCallback(() => {
    setVendedorTemp(vendedor);
  }, [vendedor]);

  const clearFilters = useCallback(() => {
    setPeriod(DEFAULT_PERIOD);
    setFilial([]);
    setFilialTemp([]);
    setClientesAplicados([]);
    setClientesTemp([]);
    setGrupo([]);
    setGrupoTemp([]);
    setRegional([]);
    setRegionalTemp([]);
    setVendedor([]);
    setVendedorTemp([]);
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return {
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
    vendedor,
    vendedorTemp,

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
    handleVendedorChange,
    handleApplyVendedorFilter,
    handleCancelVendedorFilter,
    handleCustomDateChange,
    clearFilters,

    hasClientesPendingChanges: JSON.stringify(clientesTemp) !== JSON.stringify(clientesAplicados),
    hasFilialPendingChanges: JSON.stringify(filialTemp) !== JSON.stringify(filial),
    hasGrupoPendingChanges: JSON.stringify(grupoTemp) !== JSON.stringify(grupo),
    hasRegionalPendingChanges: JSON.stringify(regionalTemp) !== JSON.stringify(regional),
    hasVendedorPendingChanges: JSON.stringify(vendedorTemp) !== JSON.stringify(vendedor),

    queryFilters: {
      filial: filial.length > 0 ? filial : undefined,
      clientes: clientesAplicados.length > 0 ? clientesAplicados : undefined,
      grupo: grupo.length > 0 ? grupo : undefined,
      regional: regional.length > 0 ? regional : undefined,
      vendedor: vendedor.length > 0 ? vendedor : undefined,
    },
  };
}
