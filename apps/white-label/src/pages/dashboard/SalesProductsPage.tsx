import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Layers, TrendingUp, Crown, Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui';
import { KpiCard, SalesFiltersBar, SimpleChart, ChartCard, PremiumTable } from '@/components/sales';
import { useSalesData } from '@/hooks/useSalesData';
import { useSalesFilters } from '@/hooks/useSalesFilters';
import { sum, distinctCount, groupAndSum, toBRL, toNumber, toPercent } from '@/utils/metrics';
import type { ChartDataPoint, ProductAggregate } from '@/types/sales';

/**
 * Página de Produtos - Análise de Performance de Produtos
 */
export default function SalesProductsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

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
    dataUpdatedAt,
    refetch,
  } = useSalesData(startDate, endDate, queryFilters);

  // Dados agregados por produto
  const productData = useMemo(() => {
    if (!salesData || salesData.length === 0) return [];

    // Helper para garantir número válido
    const safeNum = (val: unknown): number => {
      if (typeof val === 'number' && !isNaN(val)) return val;
      const num = parseFloat(String(val));
      return isNaN(num) ? 0 : num;
    };

    const faturamentoTotal = sum(salesData, 'vr_venda');
    const produtosPorFaturamento = groupAndSum(
      salesData,
      'cod_produto',
      'vr_venda',
      'nome_produto'
    );

    // Agregar volume por produto
    const volumePorProduto = salesData.reduce(
      (acc, item) => {
        if (!acc[item.cod_produto]) {
          acc[item.cod_produto] = 0;
        }
        acc[item.cod_produto] += safeNum(item.qtd_itens_venda);
        return acc;
      },
      {} as Record<string, number>
    );

    return produtosPorFaturamento.map((p, index) => ({
      rank: index + 1,
      cod_produto: p.key,
      nome_produto: p.label,
      faturamento: p.value,
      volume: volumePorProduto[p.key] || 0,
      percentual: faturamentoTotal > 0 ? (p.value / faturamentoTotal) * 100 : 0,
    })) as (ProductAggregate & { rank: number })[];
  }, [salesData]);

  // KPIs
  const kpis = useMemo(() => {
    if (!salesData || salesData.length === 0) {
      return {
        skusAtivos: 0,
        top3Percent: 0,
        caudaLonga: 0,
        produtoLider: { nome: '-', valor: 0 },
      };
    }

    const skusAtivos = distinctCount(salesData, 'cod_produto');
    const faturamentoTotal = sum(salesData, 'vr_venda');

    // Top 3 %
    const top3 = productData.slice(0, 3);
    const top3Faturamento = top3.reduce((acc, p) => acc + p.faturamento, 0);
    const top3Percent = faturamentoTotal > 0 ? (top3Faturamento / faturamentoTotal) * 100 : 0;

    // Cauda longa (fora top 10)
    const top10 = productData.slice(0, 10);
    const top10Faturamento = top10.reduce((acc, p) => acc + p.faturamento, 0);
    const caudaLonga =
      faturamentoTotal > 0 ? ((faturamentoTotal - top10Faturamento) / faturamentoTotal) * 100 : 0;

    // Produto líder
    const lider = productData[0] || { nome_produto: '-', faturamento: 0 };

    return {
      skusAtivos,
      top3Percent,
      caudaLonga,
      produtoLider: {
        nome: lider.nome_produto,
        valor: lider.faturamento,
      },
    };
  }, [salesData, productData]);

  // Dados filtrados por busca
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return productData;
    const term = searchTerm.toLowerCase();
    return productData.filter(
      (p) =>
        p.nome_produto.toLowerCase().includes(term) || p.cod_produto.toLowerCase().includes(term)
    );
  }, [productData, searchTerm]);

  // Dados para gráfico donut (Top 5 + Outros)
  const donutData = useMemo(() => {
    const _faturamentoTotal = productData.reduce((acc, p) => acc + p.faturamento, 0);
    const top5 = productData.slice(0, 5);
    const outrosFaturamento = productData.slice(5).reduce((acc, p) => acc + p.faturamento, 0);

    const result: ChartDataPoint[] = top5.map((p) => ({
      name: p.nome_produto.length > 20 ? p.nome_produto.substring(0, 20) + '...' : p.nome_produto,
      value: p.faturamento,
    }));

    if (outrosFaturamento > 0) {
      result.push({ name: 'Outros', value: outrosFaturamento });
    }

    return result;
  }, [productData]);

  // Dados para curva ABC (acumulado)
  const abcCurve = useMemo(() => {
    const faturamentoTotal = productData.reduce((acc, p) => acc + p.faturamento, 0);
    let acumulado = 0;

    return productData.slice(0, 20).map((p, i) => {
      acumulado += p.faturamento;
      const percentAcumulado = faturamentoTotal > 0 ? (acumulado / faturamentoTotal) * 100 : 0;
      return {
        name: `#${i + 1}`,
        value: percentAcumulado,
      };
    }) as ChartDataPoint[];
  }, [productData]);

  // Última atualização formatada
  const lastUpdate = useMemo(() => {
    if (!dataUpdatedAt) return '-';
    return new Date(dataUpdatedAt).toLocaleString('pt-BR');
  }, [dataUpdatedAt]);

  // Estado de loading
  const isLoadingData = isLoading || isFetching;

  // Click handler para filtrar por produto
  const handleProductClick = (row: ProductAggregate & { rank: number }) => {
    navigate(`/dashboard/produtos?produto=${row.cod_produto}`);
  };

  // Colunas da tabela
  const tableColumns = [
    {
      key: 'rank',
      header: '#',
      width: '50px',
      render: (value: unknown) => (
        <span className="text-gray-400 dark:text-gray-500">{String(value)}</span>
      ),
    },
    {
      key: 'nome_produto',
      header: 'Produto',
      render: (value: unknown) => (
        <span className="font-medium text-gray-900 dark:text-white">{String(value)}</span>
      ),
    },
    {
      key: 'faturamento',
      header: 'Faturamento (R$)',
      align: 'right' as const,
      render: (value: unknown) => (
        <span className="font-semibold text-teal-600 dark:text-teal-400">
          {toBRL(Number(value))}
        </span>
      ),
    },
    {
      key: 'percentual',
      header: '% Total',
      align: 'right' as const,
      render: (value: unknown) => (
        <span className="text-gray-700 dark:text-gray-300">{toPercent(Number(value))}</span>
      ),
    },
    {
      key: 'volume',
      header: 'Volume',
      align: 'right' as const,
      render: (value: unknown) => (
        <span className="text-gray-700 dark:text-gray-300">{toNumber(Number(value))}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white lg:text-3xl">
            Produtos
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Análise de performance por produto
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
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="SKUs Ativos"
          value={toNumber(kpis.skusAtivos)}
          icon={Package}
          isLoading={isLoadingData}
        />
        <KpiCard
          label="Faturamento Top 3"
          value={toPercent(kpis.top3Percent)}
          icon={TrendingUp}
          color="teal"
          isLoading={isLoadingData}
        />
        <KpiCard
          label="Cauda Longa (fora Top 10)"
          value={toPercent(kpis.caudaLonga)}
          icon={Layers}
          isLoading={isLoadingData}
        />
        <KpiCard
          label="Produto Líder"
          value={toBRL(kpis.produtoLider.valor)}
          changeLabel={kpis.produtoLider.nome.substring(0, 25)}
          icon={Crown}
          color="teal"
          isLoading={isLoadingData}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Participação (Donut) */}
        <ChartCard title="Participação por Produto" subtitle="Top 5 produtos + outros">
          <SimpleChart data={donutData} type="donut" height={220} isLoading={isLoadingData} />
        </ChartCard>

        {/* Curva ABC */}
        <ChartCard title="Curva ABC" subtitle="% acumulado do faturamento por ranking">
          <SimpleChart
            data={abcCurve}
            type="line"
            height={220}
            valueFormatter={(v) => toPercent(v)}
            isLoading={isLoadingData}
          />
        </ChartCard>
      </div>

      {/* Tabela de Produtos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Detalhamento de Produtos
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              inputSize="sm"
            />
          </div>
        </div>

        <PremiumTable
          columns={tableColumns}
          data={filteredProducts}
          onRowClick={handleProductClick}
          emptyMessage="Nenhum produto encontrado"
          isLoading={isLoadingData}
        />
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-end gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span>Última atualização: {lastUpdate}</span>
      </div>
    </div>
  );
}
