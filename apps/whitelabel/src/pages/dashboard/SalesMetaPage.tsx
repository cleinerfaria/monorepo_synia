import { useMemo } from 'react';
import {
  Target,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { SalesFiltersBar, DualLineChart } from '@/components/sales';
import { GroupedBarChart } from '@/components/sales/GroupedBarChart';
import { useMetaData } from '@/hooks/useMetaData';
import { useSalesFilters } from '@/hooks/useSalesFilters';
import { toPercent, toCompactBRL } from '@/utils/metrics';
import { NEUTRAL_COLORS } from '@/lib/themeConstants';

/**
 * Página de Meta - Dashboard de Acompanhamento de Metas vs Faturamento
 */
export default function SalesMetaPage() {
  const {
    period,
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
    produto,
    produtoTemp,
    handleProdutoChange,
    handleApplyProdutoFilter,
    handleCancelProdutoFilter,
    hasProdutoPendingChanges,
    clearFilters,
    queryFilters,
  } = useSalesFilters();

  // Buscar dados da meta
  const {
    data: metaData,
    isLoading,
    isFetching,
    dataUpdatedAt,
    refetch,
  } = useMetaData(queryFilters);

  // Data atual para filtrar faturamento (no timezone local, não UTC)
  const today = useMemo(() => {
    const d = new Date();
    // Formatar como YYYY-MM-DD no timezone local
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Helper para parsear data sem problemas de fuso horário
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    // Pegar apenas a parte da data (YYYY-MM-DD) se vier com timestamp
    const datePart = dateStr.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) return new Date(dateStr);
    const [year, month, day] = parts.map(Number);
    return new Date(year, month - 1, day);
  };

  // KPIs calculados
  const kpis = useMemo(() => {
    if (!metaData || metaData.length === 0) {
      return {
        metaAno: 0,
        faturamentoAcumulado: 0,
        percentualAtingido: 0,
        diferenca: 0,
        diasDecorridos: 0,
        diasRestantes: 0,
      };
    }

    // Pegar o último registro (mais recente)
    const _ultimoRegistro = metaData[metaData.length - 1];

    // Encontrar o último dia com faturamento real (até hoje)
    // Comparar usando datas parseadas para evitar problemas de fuso horário
    const todayDate = parseLocalDate(today);
    const registrosAtéHoje = metaData.filter((d) => parseLocalDate(d.dia_ano_atual) <= todayDate);
    const ultimoComFaturamento = registrosAtéHoje[registrosAtéHoje.length - 1];

    const metaAno = metaData[metaData.length - 1]?.meta_acumulada_ano_atual || 0;
    const faturamentoAcumulado = ultimoComFaturamento?.faturamento_acumulado_ano_atual || 0;
    const metaAcumuladaAteHoje = ultimoComFaturamento?.meta_acumulada_ano_atual || 0;

    const percentualAtingido =
      metaAcumuladaAteHoje > 0 ? (faturamentoAcumulado / metaAcumuladaAteHoje) * 100 : 0;

    const diferenca = faturamentoAcumulado - metaAcumuladaAteHoje;

    const diasDecorridos = registrosAtéHoje.length;
    const diasRestantes = metaData.length - diasDecorridos;

    return {
      metaAno,
      metaAtual: metaAcumuladaAteHoje,
      faturamentoAcumulado,
      percentualAtingido,
      diferenca,
      diasDecorridos,
      diasRestantes,
    };
  }, [metaData, today]);

  // Nomes dos meses para o gráfico de barras
  const monthNames = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];

  // Função para filtrar labels do eixo X: mostrar apenas 1º de cada mês e 31/12
  const filterMetaLabels = useMemo(
    () => (index: number, dateStr: string, _label: string, dataLength: number) => {
      try {
        const date = parseLocalDate(dateStr);
        const day = date.getDate();
        const month = date.getMonth();

        // Mostrar primeiro dia de cada mês (01/01, 01/02, etc)
        if (day === 1) return true;

        // Mostrar último dia do ano (31/12)
        if (month === 11 && day === 31) return true;

        // Mostrar último ponto se for significativo
        if (index === dataLength - 1) return true;

        return false;
      } catch {
        return false;
      }
    },
    []
  );

  // Função para renderizar badge de crescimento
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

  // Componente KpiCard customizado
  const KpiCardCustom = ({
    label,
    value,
    icon: Icon,
    isPrimary = false,
    mom,
    yoy,
    isLoading: loading = false,
  }: {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    isPrimary?: boolean;
    mom?: number | null;
    yoy?: number | null;
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

  // Dados para o gráfico de área (diário acumulado)
  const chartData = useMemo(() => {
    if (!metaData || metaData.length === 0) return [];

    return metaData.map((d) => {
      const date = parseLocalDate(d.dia_ano_atual);
      const name = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;

      // Faturamento só até a data atual
      // Comparar usando a data parseada para evitar problemas de fuso horário
      const dateFromData = parseLocalDate(d.dia_ano_atual);
      const todayDate = parseLocalDate(today);
      const faturamento = dateFromData <= todayDate ? d.faturamento_acumulado_ano_atual : null;

      return {
        name,
        date: d.dia_ano_atual,
        faturamento,
        anoAnterior: 0, // Não há comparação com ano anterior neste gráfico
        meta: d.meta_acumulada_ano_atual,
      };
    });
  }, [metaData, today]);

  // Dados para o gráfico de barras (mensal)
  const monthlyChartData = useMemo(() => {
    if (!metaData || metaData.length === 0) return [];

    // Filtrar apenas registros com meta_mes não nula
    return metaData
      .filter((d) => d.meta_mes !== null)
      .map((d) => {
        const date = parseLocalDate(d.dia_ano_atual);
        const monthName = monthNames[date.getMonth()];

        return {
          name: monthName,
          meta: d.meta_mes || 0,
          realizado: d.real_mes || 0,
          realizadoAnterior: d.real_anterior || 0,
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metaData]);

  // Última atualização formatada
  const lastUpdate = useMemo(() => {
    if (!dataUpdatedAt) return '-';
    return new Date(dataUpdatedAt).toLocaleString('pt-BR');
  }, [dataUpdatedAt]);

  // Estado de loading
  const isLoadingKpis = isLoading || isFetching;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 lg:text-3xl dark:text-white">
            Meta
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Acompanhamento de metas vs faturamento do ano
          </p>
        </div>
        <button
          onClick={() => refetch()}
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
        showPeriodFilter={false}
      />

      {/* KPIs - Cards com design consistente */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Meta do Ano */}
        <KpiCardCustom
          label="Meta do Ano"
          value={toCompactBRL(kpis.metaAno)}
          icon={Target}
          isLoading={isLoadingKpis}
        />

        {/* Meta Atual */}
        <KpiCardCustom
          label="Meta Atual"
          value={toCompactBRL(kpis.metaAtual || 0)}
          icon={Target}
          isLoading={isLoadingKpis}
        />

        {/* Faturamento Acumulado */}
        <KpiCardCustom
          label="Faturamento"
          value={toCompactBRL(kpis.faturamentoAcumulado)}
          icon={DollarSign}
          isPrimary
          isLoading={isLoadingKpis}
        />

        {/* % Atingido */}
        <KpiCardCustom
          label="% da Meta Atingido"
          value={toPercent(kpis.percentualAtingido)}
          icon={TrendingUp}
          isLoading={isLoadingKpis}
        />

        {/* Diferença vs Meta */}
        <KpiCardCustom
          label="Diferença vs Meta"
          value={toCompactBRL(Math.abs(kpis.diferenca))}
          icon={kpis.diferenca >= 0 ? TrendingUp : TrendingDown}
          isPrimary={kpis.diferenca >= 0}
          isLoading={isLoadingKpis}
        />

        {/* Dias Decorridos */}
        <KpiCardCustom
          label="Dias Decorridos"
          value={`${kpis.diasDecorridos} / 365`}
          icon={Calendar}
          isLoading={isLoadingKpis}
        />
      </div>

      {/* Gráfico de Área - Evolução Diária */}
      <div className="w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700/50 dark:bg-gray-800/50">
        <div className="mb-2">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Faturamento vs Meta (Acumulado)
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Evolução diária do faturamento acumulado em comparação com a meta
          </p>
        </div>
        <div className="w-full overflow-hidden">
          <DualLineChart
            data={chartData}
            height={400}
            isLoading={isLoadingKpis}
            metaLabel="Meta"
            faturamentoLabel="Faturamento"
            showFaturamentoMarkers={false}
            showMetaMarkers={false}
            showFaturamentoArea={true}
            showMetaLine={true}
            showAnoAnteriorLine={false}
            filterXLabels={filterMetaLabels}
          />
        </div>
      </div>

      {/* Gráfico de Barras - Meta Mensal */}
      <div className="w-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700/50 dark:bg-gray-800/50">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Meta vs Realizado por Mês
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Comparativo mensal entre meta e faturamento realizado
          </p>
        </div>
        <div className="w-full overflow-hidden">
          <GroupedBarChart
            data={monthlyChartData}
            height={360}
            isLoading={isLoadingKpis}
            metaColor={NEUTRAL_COLORS.gray400}
          />
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-end gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span>Última atualização: {lastUpdate}</span>
      </div>
    </div>
  );
}
