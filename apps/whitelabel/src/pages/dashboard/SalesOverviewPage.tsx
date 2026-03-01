import { useMemo, lazy, Suspense } from 'react';
import { DollarSign, Target, RefreshCw, ArrowUpRight, ArrowDownRight, Wine } from 'lucide-react';
import { SalesFiltersBar, PremiumTable, DualLineChart } from '@/components/sales';
const BrazilMapChart = lazy(() => import('@/components/sales/BrazilMapChart'));
import {
  useOverviewData,
  useRevenueByState,
  useLatestMovementCreatedAt,
} from '@/hooks/useSalesData';
import { useSalesFilters } from '@/hooks/useSalesFilters';
import { toNumber, toPercent, formatMonth } from '@/utils/metrics';
import { NEUTRAL_COLORS, STATUS_COLORS } from '@/lib/themeConstants';

/**
 * Formata valor em reais
 */
function toBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Página de Visão Geral - Dashboard Executivo de Vendas
 * FONTE ÚNICA: Todos os dados vêm de useOverviewData (query otimizada com CTEs)
 *
 * Comportamento:
 * - Gráfico e tabela sempre mostram últimos 12 meses (fixos)
 * - KPIs mudam instantaneamente com filtro de data (filtragem local)
 * - Nova consulta ao banco apenas com filtros de filial/cliente/grupo/regional
 */
export default function SalesOverviewPage() {
  const {
    period,
    startDate,
    endDate,
    filial,
    filialTemp,
    handlePeriodChange,
    handleFilialChange,
    handleApplyFilialFilter,
    handleCancelFilialFilter,
    hasFilialPendingChanges,
    clientesTemp,
    handleClientesTempChange,
    handleApplyClientesFilter,
    handleCancelClientesFilter,
    hasClientesPendingChanges,
    grupo,
    grupoTemp,
    handleGrupoChange,
    handleApplyGrupoFilter,
    handleCancelGrupoFilter,
    hasGrupoPendingChanges,
    regional,
    regionalTemp,
    handleRegionalChange,
    handleApplyRegionalFilter,
    handleCancelRegionalFilter,
    hasRegionalPendingChanges,
    vendedor,
    vendedorTemp,
    handleVendedorChange,
    handleApplyVendedorFilter,
    handleCancelVendedorFilter,
    hasVendedorPendingChanges,
    clearFilters,
    queryFilters,
  } = useSalesFilters();

  // FONTE ÚNICA DE DADOS - Query otimizada com CTEs
  // Só refaz consulta quando mudar filtros de filial/cliente/grupo/regional
  const { data: overviewData, isLoading, isFetching, refetch } = useOverviewData(queryFilters);
  const { data: latestMovementCreatedAt, refetch: refetchLatestMovementCreatedAt } =
    useLatestMovementCreatedAt();

  // Dados de faturamento por estado (UF) - últimos 12 meses
  const {
    data: revenueByStateData,
    isLoading: isLoadingStateData,
    isFetching: isFetchingStateData,
  } = useRevenueByState(queryFilters);

  // Período selecionado em formato YYYY-MM para comparação
  const selectedPeriod = useMemo(() => {
    const start = startDate.toISOString().slice(0, 7); // "2026-01"
    const end = endDate.toISOString().slice(0, 7); // "2026-01"
    return { start, end };
  }, [startDate, endDate]);

  // KPIs calculados a partir do período selecionado (filtragem LOCAL - instantânea)
  const kpis = useMemo(() => {
    if (!overviewData || overviewData.length === 0) {
      return {
        faturamento: 0,
        faturamentoMoM: null as number | null,
        faturamentoYoY: null as number | null,
        metaMes: 0,
        atingimentoMetaPct: null as number | null,
        volume: 0,
        volumeMoM: null as number | null,
        volumeYoY: null as number | null,
        clientesAtivos: 0,
        ticketMedio: 0,
      };
    }

    // Filtrar dados pelo período selecionado
    const dadosPeriodo = overviewData.filter(
      (item) => item.mes >= selectedPeriod.start && item.mes <= selectedPeriod.end
    );

    if (dadosPeriodo.length === 0) {
      return {
        faturamento: 0,
        faturamentoMoM: null as number | null,
        faturamentoYoY: null as number | null,
        metaMes: 0,
        atingimentoMetaPct: null as number | null,
        volume: 0,
        volumeMoM: null as number | null,
        volumeYoY: null as number | null,
        clientesAtivos: 0,
        ticketMedio: 0,
      };
    }

    // Se for apenas um mês, usar direto
    if (dadosPeriodo.length === 1) {
      const mes = dadosPeriodo[0];
      return {
        faturamento: mes.faturamento,
        faturamentoMoM: mes.crescimento_faturamento_mom_pct,
        faturamentoYoY: mes.crescimento_faturamento_yoy_pct,
        metaMes: mes.meta_faturamento ?? 0,
        atingimentoMetaPct:
          mes.meta_faturamento && mes.meta_faturamento > 0
            ? (mes.faturamento / mes.meta_faturamento) * 100
            : null,
        volume: mes.volume_litros,
        volumeMoM: mes.crescimento_volume_mom_pct,
        volumeYoY: mes.crescimento_volume_yoy_pct,
        clientesAtivos: mes.clientes_ativos,
        ticketMedio: mes.ticket_medio,
      };
    }

    // Se for múltiplos meses, agregar
    const faturamentoTotal = dadosPeriodo.reduce((sum, m) => sum + m.faturamento, 0);
    const metaTotal = dadosPeriodo.reduce((sum, m) => sum + (m.meta_faturamento ?? 0), 0);
    const volumeTotal = dadosPeriodo.reduce((sum, m) => sum + m.volume_litros, 0);
    const clientesMax = Math.max(...dadosPeriodo.map((m) => m.clientes_ativos));
    const ticketMedio = clientesMax > 0 ? faturamentoTotal / clientesMax : 0;

    // Usar crescimento do último mês do período
    const ultimoMesPeriodo = dadosPeriodo[dadosPeriodo.length - 1];

    return {
      faturamento: faturamentoTotal,
      faturamentoMoM: ultimoMesPeriodo.crescimento_faturamento_mom_pct,
      faturamentoYoY: ultimoMesPeriodo.crescimento_faturamento_yoy_pct,
      metaMes: metaTotal,
      atingimentoMetaPct: metaTotal > 0 ? (faturamentoTotal / metaTotal) * 100 : null,
      volume: volumeTotal,
      volumeMoM: ultimoMesPeriodo.crescimento_volume_mom_pct,
      volumeYoY: ultimoMesPeriodo.crescimento_volume_yoy_pct,
      clientesAtivos: clientesMax,
      ticketMedio,
    };
  }, [overviewData, selectedPeriod]);

  // Dados para gráfico de faturamento por mês com comparação ano anterior
  const revenueByMonth = useMemo(() => {
    if (!overviewData) return [];

    const monthMap = new Map(overviewData.map((item) => [item.mes, item]));
    const currentMonth = new Date();
    const startMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    return Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(startMonth);
      monthDate.setMonth(startMonth.getMonth() - (11 - index));

      const year = monthDate.getFullYear();
      const month = String(monthDate.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${month}`;
      const item = monthMap.get(monthKey);

      return {
        name: formatMonth(monthKey),
        date: monthKey,
        faturamento: item?.faturamento ?? 0,
        anoAnterior: item?.faturamento_ano_anterior ?? 0,
        meta: item?.meta_faturamento ?? 0,
      };
    });
  }, [overviewData]);

  // Última atualização formatada
  const lastUpdate = useMemo(() => {
    if (!latestMovementCreatedAt) return '-';
    return new Date(latestMovementCreatedAt).toLocaleString('pt-BR');
  }, [latestMovementCreatedAt]);

  // Estado de loading
  const isLoadingData = isLoading || isFetching;

  const currentMonthProgress = useMemo(() => {
    if (selectedPeriod.start !== selectedPeriod.end) {
      return null;
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (selectedPeriod.start !== currentMonthKey) {
      return null;
    }

    const currentDay = now.getDate();
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const metaProporcional = kpis.metaMes > 0 ? (kpis.metaMes / totalDaysInMonth) * currentDay : 0;
    const atingimentoMetaProporcionalPct =
      metaProporcional > 0 ? (kpis.faturamento / metaProporcional) * 100 : null;

    return {
      currentDay,
      totalDaysInMonth,
      metaProporcional,
      atingimentoMetaProporcionalPct,
    };
  }, [kpis.faturamento, kpis.metaMes, selectedPeriod.end, selectedPeriod.start]);

  // Colunas da tabela de detalhamento mensal
  const tableColumns = useMemo(
    () => [
      {
        key: 'mes',
        header: 'Mês',
        render: (value: unknown) => (
          <span className="font-medium text-gray-900 dark:text-white">
            {formatMonth(String(value))}
          </span>
        ),
      },
      {
        key: 'faturamento',
        header: 'Faturamento',
        align: 'right' as const,
        render: (value: unknown) => (
          <span className="text-primary-500 font-semibold">{toBRL(Number(value))}</span>
        ),
      },
      {
        key: 'faturamento_ano_anterior',
        header: 'Ano Anterior',
        align: 'right' as const,
        render: (value: unknown) => {
          const val = value as number | null;
          if (val === null || val === 0) {
            return <span className="text-gray-400">-</span>;
          }
          return <span className="text-gray-600 dark:text-gray-400">{toBRL(val)}</span>;
        },
      },
      {
        key: 'meta_faturamento',
        header: 'Meta',
        align: 'right' as const,
        render: (value: unknown) => (
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {toBRL(Number(value ?? 0))}
          </span>
        ),
      },
      {
        key: 'atingimento_meta_pct',
        header: '% da Meta',
        align: 'right' as const,
        render: (value: unknown) => {
          const pct = value as number | null;
          if (pct === null) {
            return <span className="text-gray-400">-</span>;
          }

          const isAchieved = pct >= 100;

          return (
            <span
              className="font-semibold"
              style={{ color: isAchieved ? STATUS_COLORS.success : STATUS_COLORS.danger }}
            >
              {toPercent(pct)}
            </span>
          );
        },
      },
      {
        key: 'crescimento_faturamento_mom_pct',
        header: 'Fat. MoM',
        align: 'right' as const,
        render: (value: unknown) => {
          const pct = value as number | null;
          if (pct === null) {
            return <span className="text-gray-400">-</span>;
          }
          const isPositive = pct >= 0;
          return (
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                isPositive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {toPercent(pct * 100)}
            </span>
          );
        },
      },
      {
        key: 'crescimento_faturamento_yoy_pct',
        header: 'Fat. YoY',
        align: 'right' as const,
        render: (value: unknown) => {
          const pct = value as number | null;
          if (pct === null) {
            return <span className="text-gray-400">-</span>;
          }
          const isPositive = pct >= 0;
          return (
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                isPositive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {toPercent(pct * 100)}
            </span>
          );
        },
      },
      {
        key: 'volume_litros',
        header: 'Volume (L)',
        align: 'right' as const,
        render: (value: unknown) => (
          <span className="text-gray-700 dark:text-gray-300">{toNumber(Number(value))}</span>
        ),
      },
      {
        key: 'crescimento_volume_mom_pct',
        header: 'Vol. MoM',
        align: 'right' as const,
        render: (value: unknown) => {
          const pct = value as number | null;
          if (pct === null) {
            return <span className="text-gray-400">-</span>;
          }
          const isPositive = pct >= 0;
          return (
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                isPositive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {toPercent(pct * 100)}
            </span>
          );
        },
      },
      {
        key: 'crescimento_volume_yoy_pct',
        header: 'Vol. YoY',
        align: 'right' as const,
        render: (value: unknown) => {
          const pct = value as number | null;
          if (pct === null) {
            return <span className="text-gray-400">-</span>;
          }
          const isPositive = pct >= 0;
          return (
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                isPositive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {toPercent(pct * 100)}
            </span>
          );
        },
      },
    ],
    []
  );

  // Dados da tabela ordenados do mais recente para o mais antigo (sempre FIXO)
  const tableData = useMemo(() => {
    if (!overviewData) return [];
    return [...overviewData].reverse().map((item) => ({
      ...item,
      atingimento_meta_pct:
        item.meta_faturamento && item.meta_faturamento > 0
          ? (item.faturamento / item.meta_faturamento) * 100
          : null,
    }));
  }, [overviewData]);

  // Renderiza badge de crescimento inline
  const renderGrowthBadge = (value: number | null, label: string) => {
    if (value === null) {
      return <span className="text-xs text-gray-400">{label}: N/A</span>;
    }
    const isPositive = value >= 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-medium ${
          isPositive ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400'
        }`}
      >
        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {label}: {toPercent(value * 100)}
      </span>
    );
  };

  const renderMetaBadge = (value: number | null) => {
    if (value === null) {
      return <span className="text-xs text-gray-400">Atingido: N/A</span>;
    }

    const isAchieved = value >= 100;

    return (
      <span
        className={`inline-flex items-center gap-0.5 text-xs font-medium ${
          isAchieved ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400'
        }`}
      >
        {isAchieved ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        Atingido: {toPercent(value)}
      </span>
    );
  };

  // Componente de Card KPI com design consistente
  const KpiCardCustom = ({
    label,
    value,
    icon: Icon,
    isPrimary = false,
    mom,
    yoy,
    footer,
    isLoading: loading = false,
  }: {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    isPrimary?: boolean;
    mom?: number | null;
    yoy?: number | null;
    footer?: React.ReactNode;
    isLoading?: boolean;
  }) => (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700/50 dark:bg-gray-800/50">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50">
          <div className="border-primary-500 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
        </div>
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p
            className={`mt-2 text-2xl font-bold ${
              isPrimary ? 'text-primary-500' : 'text-gray-900 dark:text-white'
            }`}
          >
            {value}
          </p>
          {(mom !== undefined || yoy !== undefined) && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {mom !== undefined && renderGrowthBadge(mom, 'MoM')}
              {yoy !== undefined && renderGrowthBadge(yoy, 'YoY')}
            </div>
          )}
          {footer && <div className="mt-2 space-y-1">{footer}</div>}
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center ${
            isPrimary ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 lg:text-3xl dark:text-white">
            Visão Geral
          </h1>
        </div>
        <button
          onClick={() => {
            void Promise.all([refetch(), refetchLatestMovementCreatedAt()]);
          }}
          disabled={isLoading || isFetching}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <SalesFiltersBar
        period={period}
        onPeriodChange={handlePeriodChange}
        filial={filial}
        filialTemp={filialTemp}
        onFilialChange={handleFilialChange}
        onApplyFilialFilter={handleApplyFilialFilter}
        onCancelFilialFilter={handleCancelFilialFilter}
        hasFilialPendingChanges={hasFilialPendingChanges}
        clientesTemp={clientesTemp}
        onClientesTempChange={handleClientesTempChange}
        onApplyClientesFilter={handleApplyClientesFilter}
        onCancelClientesFilter={handleCancelClientesFilter}
        hasClientesPendingChanges={hasClientesPendingChanges}
        grupo={grupo}
        grupoTemp={grupoTemp}
        onGrupoChange={handleGrupoChange}
        onApplyGrupoFilter={handleApplyGrupoFilter}
        onCancelGrupoFilter={handleCancelGrupoFilter}
        hasGrupoPendingChanges={hasGrupoPendingChanges}
        regional={regional}
        regionalTemp={regionalTemp}
        onRegionalChange={handleRegionalChange}
        onApplyRegionalFilter={handleApplyRegionalFilter}
        onCancelRegionalFilter={handleCancelRegionalFilter}
        hasRegionalPendingChanges={hasRegionalPendingChanges}
        vendedor={vendedor}
        vendedorTemp={vendedorTemp}
        onVendedorChange={handleVendedorChange}
        onApplyVendedorFilter={handleApplyVendedorFilter}
        onCancelVendedorFilter={handleCancelVendedorFilter}
        hasVendedorPendingChanges={hasVendedorPendingChanges}
        onClearFilters={clearFilters}
      />

      {/* KPIs */}
      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
          currentMonthProgress ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        }`}
      >
        {/* Faturamento */}
        <KpiCardCustom
          label="Faturamento Total"
          value={toBRL(kpis.faturamento)}
          icon={DollarSign}
          isPrimary
          mom={kpis.faturamentoMoM}
          yoy={kpis.faturamentoYoY}
          isLoading={isLoadingData}
        />

        {/* Meta do Mês */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700/50 dark:bg-gray-800/50">
          {isLoadingData && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50">
              <div className="border-primary-500 h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          )}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Meta do Mês
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {toBRL(kpis.metaMes)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {renderMetaBadge(kpis.atingimentoMetaPct)}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center text-gray-400 dark:text-gray-500">
              <Target className="h-6 w-6" />
            </div>
          </div>
        </div>
        {currentMonthProgress && (
          <KpiCardCustom
            label={`Meta proporcional (${currentMonthProgress.currentDay}/${currentMonthProgress.totalDaysInMonth})`}
            value={toBRL(currentMonthProgress.metaProporcional)}
            icon={Target}
            footer={renderMetaBadge(currentMonthProgress.atingimentoMetaProporcionalPct)}
            isLoading={isLoadingData}
          />
        )}
        {/* Volume */}
        <KpiCardCustom
          label="Volume (L)"
          value={toNumber(kpis.volume)}
          icon={Wine}
          mom={kpis.volumeMoM}
          yoy={kpis.volumeYoY}
          isLoading={isLoadingData}
        />
      </div>

      {/* Gráfico de Faturamento (sempre últimos 12 meses - FIXO) */}
      <div className="w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700/50 dark:bg-gray-800/50">
        <div className="mb-2">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Faturamento por Mês vs Ano Anterior vs Meta
          </h3>
        </div>
        <div className="w-full overflow-hidden">
          <DualLineChart
            data={revenueByMonth}
            height={340}
            isLoading={isLoadingData}
            anoAnteriorColor={NEUTRAL_COLORS.gray400}
            metaColor="#eab308"
            showMetaMarkers
          />
        </div>
      </div>

      {/* Tabela de Detalhamento Mensal (sempre últimos 12 meses - FIXO) */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Detalhamento Mensal</h2>

        <PremiumTable
          columns={tableColumns}
          data={tableData}
          emptyMessage="Nenhum dado encontrado"
          isLoading={isLoadingData}
        />
      </div>

      {/* Mapa do Brasil - Faturamento por Estado (últimos 12 meses) */}
      <Suspense
        fallback={
          <div className="flex h-96 items-center justify-center rounded-lg border border-gray-200 bg-white p-6">
            <div className="text-center">
              <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-gray-400" />
              <p className="text-sm text-gray-500">Carregando mapa do Brasil...</p>
            </div>
          </div>
        }
      >
        <BrazilMapChart
          data={revenueByStateData || []}
          height={520}
          isLoading={isLoadingStateData || isFetchingStateData}
          title="Faturamento por Estado"
          subtitle="Últimos 12 meses"
        />
      </Suspense>

      {/* Rodapé */}
      <div className="flex items-center justify-end gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span>Última atualização: {lastUpdate}</span>
      </div>
    </div>
  );
}
