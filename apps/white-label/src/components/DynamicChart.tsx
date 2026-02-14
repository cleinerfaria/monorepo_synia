import { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { usePageCharts } from '@/hooks/usePageCharts';
import type { PageChart, PageChartYAxisConfig } from '@/types/database';
import { NEUTRAL_COLORS } from '@/lib/themeConstants';
import { getPrimaryColorRgb, resolveSeriesColor, toRgba } from '@/lib/themeColors';

interface DynamicChartProps {
  chart: PageChart;
  pageId?: string;
  filters?: Record<string, any>;
  className?: string;
}

/**
 * Componente de gráfico dinâmico - renderiza gráficos baseados na configuração
 * Design inspirado no PremiumAreaChart (visual executivo moderno)
 */
export default function DynamicChart({ chart, pageId, filters, className }: DynamicChartProps) {
  const { getChartData } = usePageCharts();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Carregar dados do gráfico
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const yAxisFields = chart.y_axis.map((y: PageChartYAxisConfig) => y.field);
        const chartData = await getChartData(
          chart.options_view,
          chart.x_axis,
          yAxisFields,
          pageId,
          filters
        );

        if (import.meta.env.MODE !== 'test') {
          console.log(`📊 [DynamicChart] Dados carregados para ${chart.name}:`, chartData);
        }
        setData(chartData);
      } catch (err: any) {
        if (import.meta.env.MODE !== 'test') {
          console.error(`❌ [DynamicChart] Erro ao carregar dados:`, err);
        }
        setError(err.message || 'Erro ao carregar dados');
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (chart.options_view) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chart.id,
    chart.options_view,
    chart.x_axis,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(chart.y_axis),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(filters),
  ]);

  const height = chart.height || 300;
  const padding = { top: 50, right: 16, bottom: 40, left: 70 };
  const viewBoxWidth = 1600;
  const viewBoxHeight = height;

  const chartWidth = viewBoxWidth - padding.left - padding.right;
  const chartHeight = viewBoxHeight - padding.top - padding.bottom;

  // Cores padrão ou customizadas
  const primaryColor = getPrimaryColorRgb();

  // Processar dados para o gráfico
  const { maxValue, minValue, allSeries, maxIndex } = useMemo(() => {
    if (!data || data.length === 0) {
      return { maxValue: 0, minValue: 0, allSeries: [], maxIndex: -1 };
    }

    const yAxisConfigs = chart.y_axis as PageChartYAxisConfig[];

    // Calcular máximo e mínimo considerando todas as séries
    let max = 0;
    let min = 0;

    yAxisConfigs.forEach((yConfig) => {
      const values = data.map((d) => Number(d[yConfig.field]) || 0);
      const seriesMax = Math.max(...values);
      const seriesMin = Math.min(...values);
      if (seriesMax > max) max = seriesMax;
      if (seriesMin < min) min = seriesMin;
    });

    max = max * 1.08; // 8% padding top
    if (min > 0) min = 0; // Sempre começar do zero para clareza

    // Criar pontos para cada série
    const series = yAxisConfigs.map((yConfig, seriesIndex) => {
      const points = data.map((d, i) => {
        const value = Number(d[yConfig.field]) || 0;
        const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
        const y = padding.top + chartHeight - ((value - min) / (max - min || 1)) * chartHeight;
        return { x, y, value, label: d[chart.x_axis] };
      });

      return {
        field: yConfig.field,
        label: yConfig.label,
        color: yConfig.color || resolveSeriesColor(seriesIndex, primaryColor, chart.colors),
        points,
      };
    });

    // Encontrar índice do máximo (para destaque)
    let maxIdx = 0;
    if (series.length > 0) {
      series[0].points.forEach((p, i) => {
        if (p.value > series[0].points[maxIdx].value) maxIdx = i;
      });
    }

    return { maxValue: max, minValue: min, allSeries: series, maxIndex: maxIdx };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, chart.y_axis, chart.x_axis, chartWidth, chartHeight, chart.colors, primaryColor]);

  // Formatador de valores
  const formatValue = (value: number): string => {
    const format = chart.y_axis_format || 'number';
    const prefix = chart.y_axis_prefix || '';
    const suffix = chart.y_axis_suffix || '';

    let formatted = '';
    switch (format) {
      case 'currency':
        formatted = value.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        break;
      case 'percent':
        formatted = `${(value * 100).toFixed(1)}%`;
        break;
      default:
        formatted = value.toLocaleString('pt-BR');
    }

    return `${prefix}${formatted}${suffix}`;
  };

  // Formatador de eixo X
  const formatXAxis = (value: any): string => {
    const format = chart.x_axis_format || 'auto';

    if (format === 'date' || format === 'datetime') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      }
    }

    return String(value);
  };

  // Curva suave usando bezier curves
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';

    let path = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const current = pts[i];
      const next = pts[i + 1];
      const cpx = (current.x + next.x) / 2;

      if (chart.curve_type === 'linear') {
        path += ` L ${next.x} ${next.y}`;
      } else if (chart.curve_type === 'step') {
        path += ` L ${next.x} ${current.y} L ${next.x} ${next.y}`;
      } else {
        // smooth (default)
        path += ` C ${cpx} ${current.y}, ${cpx} ${next.y}, ${next.x} ${next.y}`;
      }
    }

    return path;
  };

  // Renderizar estado de carregamento
  if (isLoading) {
    return (
      <div
        className={clsx(
          'relative overflow-hidden rounded-xl bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700',
          className
        )}
        style={{ height }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  // Renderizar estado de erro
  if (error) {
    return (
      <div
        className={clsx(
          'relative overflow-hidden rounded-xl bg-white dark:bg-gray-800',
          'border border-red-200 dark:border-red-700',
          className
        )}
        style={{ height }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  // Renderizar estado vazio
  if (!data || data.length === 0) {
    return (
      <div
        className={clsx(
          'relative overflow-hidden rounded-xl bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700',
          className
        )}
        style={{ height }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Sem dados disponíveis</p>
        </div>
      </div>
    );
  }

  // Gridlines sutis (apenas 3)
  const gridLines = [0, 0.5, 1].map((pct) => ({
    y: padding.top + chartHeight * (1 - pct),
    value: minValue + (maxValue - minValue) * pct,
  }));

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl bg-white dark:bg-gray-800',
        'border border-gray-200 dark:border-gray-700',
        'shadow-sm',
        className
      )}
    >
      {/* Header */}
      {(chart.title || chart.description) && (
        <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          {chart.title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{chart.title}</h3>
          )}
          {chart.description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{chart.description}</p>
          )}
        </div>
      )}

      {/* Chart Container */}
      <div className="relative p-4">
        {/* Legenda */}
        {chart.show_legend && allSeries.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-4">
            {allSeries.map((series) => (
              <div key={series.field} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: series.color }} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{series.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* SVG Chart */}
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full"
          style={{ height }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradientes para cada série */}
            {allSeries.map((series, idx) => (
              <linearGradient
                key={`gradient-${idx}`}
                id={`areaGradient-${idx}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={series.color} stopOpacity="0.25" />
                <stop offset="50%" stopColor={series.color} stopOpacity="0.08" />
                <stop offset="100%" stopColor={series.color} stopOpacity="0" />
              </linearGradient>
            ))}

            {/* Glow filter */}
            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {chart.show_grid &&
            gridLines.map((line, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={line.y}
                  x2={viewBoxWidth - padding.right}
                  y2={line.y}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="text-gray-200 dark:text-gray-700"
                  opacity="0.5"
                />
                <text
                  x={padding.left - 12}
                  y={line.y + 5}
                  textAnchor="end"
                  className="fill-gray-500 dark:fill-gray-400"
                  style={{ fontSize: '26px', fontFamily: 'system-ui' }}
                >
                  {formatValue(line.value)}
                </text>
              </g>
            ))}

          {/* Áreas e linhas para cada série */}
          {allSeries.map((series, idx) => {
            const linePath = createSmoothPath(series.points);
            const areaPath =
              series.points.length > 0
                ? `${linePath} L ${series.points[series.points.length - 1].x} ${padding.top + chartHeight} L ${series.points[0].x} ${padding.top + chartHeight} Z`
                : '';

            return (
              <g key={series.field}>
                {/* Área preenchida (apenas para area/stacked_area) */}
                {(chart.type === 'area' || chart.type === 'stacked_area') && (
                  <path
                    d={areaPath}
                    fill={`url(#areaGradient-${idx})`}
                    className={clsx(
                      'transition-all duration-700',
                      isAnimated ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                )}

                {/* Linha principal */}
                <path
                  d={linePath}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#lineGlow)"
                  className={clsx(
                    'transition-all duration-700',
                    isAnimated ? 'opacity-100' : 'opacity-0'
                  )}
                />

                {/* Pontos interativos */}
                {series.points.map((point, pointIdx) => (
                  <g key={pointIdx}>
                    {/* Área invisível para hover */}
                    <rect
                      x={point.x - 30}
                      y={padding.top}
                      width={60}
                      height={chartHeight}
                      fill="transparent"
                      onMouseEnter={() => setHoveredIndex(pointIdx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      style={{ cursor: 'pointer' }}
                    />

                    {/* Ponto visível no hover ou no máximo */}
                    {(hoveredIndex === pointIdx || pointIdx === maxIndex) && (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={hoveredIndex === pointIdx ? 8 : 6}
                        fill="white"
                        stroke={series.color}
                        strokeWidth="3"
                        className="transition-all duration-200"
                      />
                    )}

                    {/* Tooltip no hover */}
                    {hoveredIndex === pointIdx && idx === 0 && (
                      <g>
                        {/* Linha vertical */}
                        <line
                          x1={point.x}
                          y1={padding.top}
                          x2={point.x}
                          y2={padding.top + chartHeight}
                          stroke={series.color}
                          strokeWidth="1"
                          strokeDasharray="4 4"
                          opacity="0.5"
                        />

                        {/* Background do tooltip */}
                        <rect
                          x={point.x - 100}
                          y={point.y - 70}
                          width={200}
                          height={50}
                          rx="8"
                          fill={toRgba(NEUTRAL_COLORS.black, 0.85)}
                        />

                        {/* Texto do tooltip */}
                        <text
                          x={point.x}
                          y={point.y - 48}
                          textAnchor="middle"
                          fill={NEUTRAL_COLORS.white}
                          style={{ fontSize: '24px', fontWeight: 'bold' }}
                        >
                          {formatValue(point.value)}
                        </text>
                        <text
                          x={point.x}
                          y={point.y - 28}
                          textAnchor="middle"
                          fill={toRgba(NEUTRAL_COLORS.white, 0.7)}
                          style={{ fontSize: '20px' }}
                        >
                          {formatXAxis(point.label)}
                        </text>
                      </g>
                    )}
                  </g>
                ))}
              </g>
            );
          })}

          {/* Labels do eixo X */}
          {allSeries.length > 0 &&
            allSeries[0].points.map((point, idx) => {
              // Mostrar apenas alguns labels para não poluir
              const showLabel =
                idx === 0 ||
                idx === allSeries[0].points.length - 1 ||
                idx % Math.ceil(allSeries[0].points.length / 6) === 0;
              if (!showLabel) return null;

              return (
                <text
                  key={idx}
                  x={point.x}
                  y={viewBoxHeight - 8}
                  textAnchor="middle"
                  className="fill-gray-500 dark:fill-gray-400"
                  style={{ fontSize: '24px', fontFamily: 'system-ui' }}
                >
                  {formatXAxis(point.label)}
                </text>
              );
            })}
        </svg>
      </div>
    </div>
  );
}
