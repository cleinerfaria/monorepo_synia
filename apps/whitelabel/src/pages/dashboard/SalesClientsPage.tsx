import { useMemo, lazy, Suspense } from 'react';
import { Users, Crown, PieChart, Target, MapPin, RefreshCw } from 'lucide-react';
import { KpiCard, SalesFiltersBar, SimpleChart, ChartCard, PremiumTable } from '@/components/sales';
const BrazilMapChart = lazy(() => import('@/components/sales/BrazilMapChart'));
import {
  useSalesData,
  useRevenueByState,
  useRevenueByRegion,
  useClientGoalsData,
  useLatestMovementCreatedAt,
} from '@/hooks/useSalesData';
import { useSalesFilters } from '@/hooks/useSalesFilters';
import {
  sum,
  distinctCount,
  toBRL,
  toNumber,
  toPercent,
  toAxisBRL,
  formatDate,
} from '@/utils/metrics';
import type { ChartDataPoint, ClientAggregate } from '@/types/sales';

/**
 * Página de Clientes - Análise de Distribuidores
 */
export default function SalesClientsPage() {
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    clientesAplicados,
    clientesTemp,
    handleClientesTempChange,
    handleApplyClientesFilter,
    handleCancelClientesFilter,
    hasClientesPendingChanges,
    produto,
    produtoTemp,
    handleProdutoChange,
    handleApplyProdutoFilter,
    handleCancelProdutoFilter,
    hasProdutoPendingChanges,
    clearFilters,
    queryFilters,
  } = useSalesFilters();

  // Busca dados de vendas
  const {
    data: salesData,
    isLoading,
    isFetching,
    refetch,
  } = useSalesData(startDate, endDate, queryFilters);
  const { data: latestMovementCreatedAt, refetch: refetchLatestMovementCreatedAt } =
    useLatestMovementCreatedAt();

  const {
    data: clientGoalsData,
    isLoading: isLoadingClientGoals,
    isFetching: isFetchingClientGoals,
  } = useClientGoalsData(startDate, endDate, queryFilters);

  // Dados de faturamento por estado (UF) - últimos 12 meses
  const {
    data: revenueByStateData,
    isLoading: isLoadingStateData,
    isFetching: isFetchingStateData,
  } = useRevenueByState(queryFilters);

  // Dados de faturamento por região - últimos 12 meses
  const {
    data: revenueByRegionData,
    isLoading: isLoadingRegionData,
    isFetching: isFetchingRegionData,
  } = useRevenueByRegion(queryFilters);

  const clientGoalsMap = useMemo(() => {
    return new Map(
      (clientGoalsData || []).map((item) => [item.cod_cliente, item.meta_faturamento])
    );
  }, [clientGoalsData]);

  // Dados agregados por cliente
  const clientData = useMemo(() => {
    if (!salesData || salesData.length === 0) return [];

    // Helper para garantir número válido
    const safeNum = (val: unknown): number => {
      if (typeof val === 'number' && !isNaN(val)) return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? 0 : num;
    };

    // Agregar por cliente
    const clienteMap = new Map<string, ClientAggregate>();

    salesData.forEach((item) => {
      const vr = safeNum(item.vr_venda);
      const vol = safeNum(item.qtd_itens_venda);
      const existing = clienteMap.get(item.cod_cliente);

      if (existing) {
        existing.faturamento += vr;
        existing.volume += vol;
        existing.compras += 1;
        if (item.dt_mov > existing.ultima_compra) {
          existing.ultima_compra = item.dt_mov;
        }
      } else {
        clienteMap.set(item.cod_cliente, {
          cod_cliente: item.cod_cliente,
          nome_cliente: item.nome_cliente,
          faturamento: vr,
          volume: vol,
          compras: 1,
          ultima_compra: item.dt_mov,
          uf: item.uf,
        });
      }
    });

    return Array.from(clienteMap.values())
      .map((cliente) => {
        const meta = clientGoalsMap.get(cliente.cod_cliente) ?? null;
        const hasMeta = meta !== null && meta > 0;

        return {
          ...cliente,
          meta_faturamento: hasMeta ? meta : null,
          atingimento_meta_pct: hasMeta ? cliente.faturamento / meta : null,
        };
      })
      .sort((a, b) => b.faturamento - a.faturamento);
  }, [salesData, clientGoalsMap]);

  // Faturamento total para cálculo de representatividade
  const faturamentoTotal = useMemo(() => {
    return clientData.reduce((acc, c) => acc + c.faturamento, 0);
  }, [clientData]);

  // KPIs
  const kpis = useMemo(() => {
    if (!salesData || salesData.length === 0) {
      return {
        distribuidoresAtivos: 0,
        topClientePercent: 0,
        concentracaoTop5: 0,
        faturamentoMedio: 0,
      };
    }

    const distribuidoresAtivos = distinctCount(salesData, 'cod_cliente');
    const faturamentoTotal = sum(salesData, 'vr_venda');
    const faturamentoMedio = distribuidoresAtivos > 0 ? faturamentoTotal / distribuidoresAtivos : 0;

    // Top cliente %
    const topCliente = clientData[0];
    const topClientePercent =
      faturamentoTotal > 0 && topCliente ? (topCliente.faturamento / faturamentoTotal) * 100 : 0;

    // Concentração Top 5
    const top5 = clientData.slice(0, 5);
    const top5Faturamento = top5.reduce((acc, c) => acc + c.faturamento, 0);
    const concentracaoTop5 = faturamentoTotal > 0 ? (top5Faturamento / faturamentoTotal) * 100 : 0;

    return {
      distribuidoresAtivos,
      topClientePercent,
      concentracaoTop5,
      faturamentoMedio,
    };
  }, [salesData, clientData]);

  // Top 10 clientes para gráfico
  const topClientesChart = useMemo(() => {
    return clientData.slice(0, 10).map((c) => ({
      name: `${c.cod_cliente} - ${c.nome_cliente.length > 40 ? c.nome_cliente.substring(0, 40) + '...' : c.nome_cliente}`,
      value: c.faturamento,
    })) as ChartDataPoint[];
  }, [clientData]);

  // Clientes ativos por semana
  const clientesPorSemana = useMemo(() => {
    if (!salesData) return [];

    // Contar clientes distintos por semana
    const weekMap = new Map<string, Set<string>>();

    salesData.forEach((item) => {
      const date = new Date(item.dt_mov);
      const week = getWeekKey(date);

      if (!weekMap.has(week)) {
        weekMap.set(week, new Set());
      }
      weekMap.get(week)!.add(item.cod_cliente);
    });

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, clients]) => ({
        name: week.split('-W')[1] ? `S${week.split('-W')[1]}` : week,
        value: clients.size,
      })) as ChartDataPoint[];
  }, [salesData]);

  // Dados por região (do banco de dados)
  const regiaoData = useMemo(() => {
    if (!revenueByRegionData || revenueByRegionData.length === 0) return [];

    return revenueByRegionData.map((r) => ({
      region: r.regiao,
      regionName: r.regiao,
      faturamento: r.faturamento,
      clientes: 0, // Não temos contagem de clientes na query de região
    }));
  }, [revenueByRegionData]);

  // Última atualização formatada
  const lastUpdate = useMemo(() => {
    if (!latestMovementCreatedAt) return '-';
    return new Date(latestMovementCreatedAt).toLocaleString('pt-BR');
  }, [latestMovementCreatedAt]);

  // Estado de loading
  const isLoadingData = isLoading || isFetching;
  const isLoadingClientsTable = isLoadingData || isLoadingClientGoals || isFetchingClientGoals;

  // Colunas da tabela de clientes
  const tableColumns = [
    {
      key: 'nome_cliente',
      header: 'Nome',
      render: (value: unknown, row: ClientAggregate) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {row.cod_cliente} - {String(value)}
        </span>
      ),
    },
    {
      key: 'faturamento',
      header: 'Faturamento',
      align: 'right' as const,
      render: (value: unknown) => (
        <span className="font-semibold text-teal-600 dark:text-teal-400">
          {toBRL(Number(value))}
        </span>
      ),
    },
    {
      key: 'meta_faturamento',
      header: 'Meta',
      align: 'right' as const,
      render: (value: unknown) => {
        const meta = value === null || value === undefined ? null : Number(value);

        if (meta === null || !Number.isFinite(meta) || meta <= 0) {
          return <span className="text-gray-400 dark:text-gray-500">-</span>;
        }

        return <span className="text-gray-700 dark:text-gray-300">{toBRL(meta)}</span>;
      },
    },
    {
      key: 'atingimento_meta_pct',
      header: '% Meta',
      align: 'right' as const,
      render: (value: unknown) => {
        const pct = value === null || value === undefined ? null : Number(value);

        if (pct === null || !Number.isFinite(pct)) {
          return <span className="text-gray-400 dark:text-gray-500">-</span>;
        }

        const isAchieved = pct >= 1;
        const percentageValue = (pct * 100).toFixed(1);

        return (
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              isAchieved
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {percentageValue}%
          </span>
        );
      },
    },
    {
      key: 'percentual_total',
      header: '% Total',
      align: 'right' as const,
      render: (_value: unknown, row: ClientAggregate) => {
        const percent = faturamentoTotal > 0 ? (row.faturamento / faturamentoTotal) * 100 : 0;
        return (
          <span className="font-medium text-gray-600 dark:text-gray-400">
            {percent.toFixed(1)}%
          </span>
        );
      },
    },
    {
      key: 'volume',
      header: 'Volume',
      align: 'right' as const,
      render: (value: unknown) => (
        <span className="text-gray-700 dark:text-gray-300">{toNumber(Number(value))}</span>
      ),
    },
    {
      key: 'compras',
      header: '# Compras',
      align: 'right' as const,
      render: (value: unknown) => (
        <span className="text-gray-700 dark:text-gray-300">{toNumber(Number(value))}</span>
      ),
    },
    {
      key: 'ultima_compra',
      header: 'Última Compra',
      align: 'right' as const,
      render: (value: unknown) => (
        <span className="text-gray-700 dark:text-gray-300">{formatDate(String(value))}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 lg:text-3xl dark:text-white">
            Clientes
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Análise de distribuidores e carteira de clientes
          </p>
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
        produto={produto}
        produtoTemp={produtoTemp}
        onProdutoChange={handleProdutoChange}
        onApplyProdutoFilter={handleApplyProdutoFilter}
        onCancelProdutoFilter={handleCancelProdutoFilter}
        hasProdutoPendingChanges={hasProdutoPendingChanges}
        onClearFilters={clearFilters}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Distribuidores Ativos"
          value={toNumber(kpis.distribuidoresAtivos)}
          icon={Users}
          isLoading={isLoadingData}
        />
        <KpiCard
          label="Top Cliente"
          value={toPercent(kpis.topClientePercent)}
          changeLabel="do total"
          icon={Crown}
          color="teal"
          isLoading={isLoadingData}
        />
        <KpiCard
          label="Concentração Top 5"
          value={toPercent(kpis.concentracaoTop5)}
          icon={PieChart}
          isLoading={isLoadingData}
        />
        <KpiCard
          label="Faturamento Médio"
          value={toBRL(kpis.faturamentoMedio)}
          icon={Target}
          color="teal"
          isLoading={isLoadingData}
        />
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top 10 Clientes */}
        <ChartCard title="Top 10 Clientes" subtitle="Maiores distribuidores por faturamento">
          <SimpleChart
            data={topClientesChart}
            type="horizontal-bar"
            height={300}
            valueFormatter={toAxisBRL}
            isLoading={isLoadingData}
          />
        </ChartCard>

        {/* Clientes Ativos por Semana */}
        <ChartCard
          title="Clientes Ativos por Semana"
          subtitle="Evolução semanal de clientes compradores"
        >
          <SimpleChart
            data={clientesPorSemana}
            type="line"
            height={300}
            valueFormatter={toNumber}
            isLoading={isLoadingData}
          />
        </ChartCard>
      </div>

      {/* Card de Regiões */}
      <ChartCard
        title="Regiões do Brasil"
        subtitle="Distribuição de faturamento por região (últimos 12 meses)"
      >
        {isLoadingRegionData || isFetchingRegionData ? (
          <div className="flex h-32 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {regiaoData.map((r) => (
              <div
                key={r.region}
                className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-700 dark:bg-gray-800/30"
              >
                <div className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <MapPin className="h-3 w-3" />
                  {r.regionName}
                </div>
                <div className="text-lg font-bold text-teal-600 dark:text-teal-400">
                  {toBRL(r.faturamento)}
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      {/* Mapa do Brasil - Faturamento por Estado (últimos 12 meses) */}
      <Suspense
        fallback={
          <div className="flex h-96 items-center justify-center rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div className="text-center">
              <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Carregando mapa do Brasil...
              </p>
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

      {/* Tabela de Clientes */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Detalhamento de Clientes
        </h2>

        <PremiumTable
          columns={tableColumns}
          data={clientData.slice(0, 50)}
          emptyMessage="Nenhum cliente encontrado"
          isLoading={isLoadingClientsTable}
        />

        {clientData.length > 50 && (
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Exibindo os 50 maiores clientes de {clientData.length} total
          </p>
        )}
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-end gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span>Última atualização: {lastUpdate}</span>
      </div>
    </div>
  );
}

// Helper para gerar chave de semana
function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
