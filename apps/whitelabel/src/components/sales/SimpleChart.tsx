import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import type { ChartDataPoint } from '@/types/sales';
import { toBRL, toNumber, toAxisBRL } from '@/utils/metrics';
import { CHART_SERIES_COLORS, NEUTRAL_COLORS } from '@/lib/themeConstants';
import { getPrimaryColorRgb, toRgba } from '@/lib/themeColors';

interface SimpleChartProps {
  data: ChartDataPoint[];
  type: 'line' | 'bar' | 'area' | 'horizontal-bar' | 'donut' | 'combo';
  height?: number;
  className?: string;
  showValues?: boolean;
  valueFormatter?: (value: number) => string;
  secondaryValueFormatter?: (value: number) => string;
  colorPrimary?: string;
  colorSecondary?: string;
  isLoading?: boolean;
}

/**
 * Gráfico simples em SVG puro (sem dependências externas)
 */
export function SimpleChart({
  data,
  type,
  height = 200,
  className,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showValues = true,
  valueFormatter = toAxisBRL,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  secondaryValueFormatter,
  colorPrimary,
  colorSecondary = CHART_SERIES_COLORS[0],
  isLoading = false,
}: SimpleChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Usar CSS variable da cor primária se não especificada
  const normalizeColor = (color: string) => {
    if (!color) return color;
    if (color.startsWith('#') || color.startsWith('rgb')) return color;
    return `rgb(${color})`;
  };

  const finalColorPrimary = normalizeColor(colorPrimary || getPrimaryColorRgb());
  const finalColorSecondary = normalizeColor(colorSecondary);

  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const width = 500;

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const { maxValue, minValue, points, secondaryPoints } = useMemo(() => {
    if (!data || data.length === 0) {
      return { maxValue: 0, minValue: 0, points: [], secondaryPoints: [] };
    }

    const values = data.map((d) => d.value);
    const values2 = data.map((d) => d.value2 || 0);
    const allValues = [...values, ...values2.filter((v) => v > 0)];

    const max = Math.max(...allValues, 0) * 1.1; // 10% padding
    const min = Math.min(...allValues, 0);

    const pts = data.map((d, i) => ({
      x: padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth,
      y: padding.top + chartHeight - ((d.value - min) / (max - min || 1)) * chartHeight,
      value: d.value,
      name: d.name,
    }));

    const pts2 = data.map((d, i) => ({
      x: padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth,
      y: padding.top + chartHeight - (((d.value2 || 0) - min) / (max - min || 1)) * chartHeight,
      value: d.value2 || 0,
      name: d.name,
    }));

    return { maxValue: max, minValue: min, points: pts, secondaryPoints: pts2 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, chartWidth, chartHeight]);

  // Donut chart
  if (type === 'donut') {
    return <DonutChart data={data} height={height} className={className} isLoading={isLoading} />;
  }

  // Horizontal bar chart
  if (type === 'horizontal-bar') {
    return (
      <HorizontalBarChart
        data={data}
        height={height}
        className={className}
        valueFormatter={valueFormatter}
        color={finalColorPrimary}
        isLoading={isLoading}
      />
    );
  }

  // Verificar dados vazios (exceto para donut e horizontal-bar que têm sua própria verificação)
  if (!data || data.length === 0) {
    if (isLoading) {
      return (
        <div className={clsx('flex items-center justify-center', className)} style={{ height }}>
          <div className="border-primary-500 dark:border-primary-400 h-6 w-6 animate-spin rounded-full border-2 border-t-transparent dark:border-t-transparent" />
        </div>
      );
    }

    return (
      <div className={clsx('flex items-center justify-center', className)} style={{ height }}>
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado encontrado</p>
      </div>
    );
  }

  // Função para criar curva suave (Bezier)
  const createSmoothPath = (pts: typeof points): string => {
    if (pts.length < 2) return '';

    let path = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      // Tension factor para controle da suavidade
      const tension = 0.3;

      // Pontos de controle
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    return path;
  };

  const linePath = createSmoothPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1]?.x || 0} ${padding.top + chartHeight} L ${points[0]?.x || 0} ${padding.top + chartHeight} Z`
      : '';

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: padding.top + chartHeight * (1 - pct),
    value: minValue + (maxValue - minValue) * pct,
  }));

  const barWidth = (chartWidth / data.length) * 0.6;

  return (
    <div className={clsx('relative w-full', className)}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px] dark:bg-gray-800/60">
          <div className="border-primary-500 dark:border-primary-400 h-6 w-6 animate-spin rounded-full border-2 border-t-transparent dark:border-t-transparent" />
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={width - padding.right}
              y2={line.y}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 8}
              y={line.y + 4}
              textAnchor="end"
              className="fill-gray-400 text-[10px]"
            >
              {valueFormatter(line.value)}
            </text>
          </g>
        ))}

        {/* Bars (for bar and combo types) */}
        {(type === 'bar' || type === 'combo') && (
          <g>
            {points.map((p, i) => {
              const barHeight = chartHeight - (p.y - padding.top);
              return (
                <g key={i}>
                  {/* Área de hover invisível para toda altura da barra */}
                  <rect
                    x={p.x - barWidth / 2 - 5}
                    y={padding.top}
                    width={barWidth + 10}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {/* Barra visível */}
                  <rect
                    x={p.x - barWidth / 2}
                    y={p.y}
                    width={barWidth}
                    height={Math.max(0, barHeight)}
                    fill={finalColorPrimary}
                    fillOpacity={hoveredIndex === i ? 1 : 0.8}
                    rx={4}
                    className="transition-all duration-200"
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* Area fill */}
        {type === 'area' && <path d={areaPath} fill={finalColorPrimary} fillOpacity={0.1} />}

        {/* Line */}
        {(type === 'line' || type === 'area') && (
          <path
            d={linePath}
            fill="none"
            stroke={finalColorPrimary}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Secondary line for combo */}
        {type === 'combo' && data.some((d) => d.value2) && (
          <path
            d={secondaryPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
            fill="none"
            stroke={finalColorSecondary}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Points */}
        {(type === 'line' || type === 'area') &&
          points.map((p, i) => (
            <g key={i}>
              {/* Linha vertical invisível para hover em toda altura */}
              <rect
                x={p.x - 15}
                y={padding.top}
                width={30}
                height={chartHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* Área de hover invisível */}
              <circle
                cx={p.x}
                cy={p.y}
                r={20}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {/* Ponto visível */}
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIndex === i ? 6 : 4}
                fill="white"
                stroke={finalColorPrimary}
                strokeWidth={2}
                className="transition-all duration-200"
              />
            </g>
          ))}

        {/* Tooltip para todos os tipos */}
        {hoveredIndex !== null &&
          points[hoveredIndex] &&
          (() => {
            const p = points[hoveredIndex];
            const tooltipWidth = 120;
            const tooltipHeight = 40;
            let tooltipX = p.x - tooltipWidth / 2;
            if (tooltipX < padding.left) tooltipX = padding.left;
            if (tooltipX + tooltipWidth > width - padding.right) {
              tooltipX = width - padding.right - tooltipWidth;
            }
            const tooltipY = p.y - tooltipHeight - 8;

            return (
              <g className="pointer-events-none">
                <rect
                  x={tooltipX}
                  y={tooltipY}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  rx={6}
                  fill={toRgba(NEUTRAL_COLORS.gray900, 0.95)}
                  stroke={toRgba(NEUTRAL_COLORS.white, 0.1)}
                  strokeWidth={1}
                />
                <text
                  x={tooltipX + tooltipWidth / 2}
                  y={tooltipY + 16}
                  textAnchor="middle"
                  fill={NEUTRAL_COLORS.white}
                  style={{ fontSize: '12px', fontWeight: 600 }}
                >
                  {valueFormatter(p.value)}
                </text>
                <text
                  x={tooltipX + tooltipWidth / 2}
                  y={tooltipY + 30}
                  textAnchor="middle"
                  fill={toRgba(NEUTRAL_COLORS.white, 0.7)}
                  style={{ fontSize: '10px' }}
                >
                  {p.name}
                </text>
              </g>
            );
          })()}

        {/* X axis labels com área de hover */}
        {data.map((d, i) => (
          <g key={`x-label-${i}`}>
            {/* Área de hover invisível sobre o texto */}
            <rect
              x={(points[i]?.x || 0) - 25}
              y={height - padding.bottom}
              width={50}
              height={padding.bottom}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
            <text
              x={points[i]?.x || 0}
              y={height - 8}
              textAnchor="middle"
              className={clsx(
                'text-[9px] transition-all duration-200',
                hoveredIndex === i ? 'fill-gray-600' : 'fill-gray-400'
              )}
              style={{
                fontWeight: hoveredIndex === i ? 500 : 400,
              }}
            >
              {d.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * Gráfico de barras horizontais
 */
function HorizontalBarChart({
  data,
  height,
  className,
  valueFormatter: _valueFormatter,
  color,
  isLoading,
}: {
  data: ChartDataPoint[];
  height: number;
  className?: string;
  valueFormatter: (v: number) => string;
  color: string;
  isLoading?: boolean;
}) {
  // Verificar dados vazios ou loading
  if (!data || data.length === 0) {
    if (isLoading) {
      return (
        <div
          className={clsx('flex items-center justify-center', className)}
          style={{ minHeight: height }}
        >
          <div className="border-primary-500 dark:border-primary-400 h-6 w-6 animate-spin rounded-full border-2 border-t-transparent dark:border-t-transparent" />
        </div>
      );
    }

    return (
      <div
        className={clsx('flex items-center justify-center', className)}
        style={{ minHeight: height }}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado encontrado</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 0);
  const _barHeight = Math.min(32, (height - 20) / data.length);
  const _gap = 8;

  return (
    <div className={clsx('relative w-full space-y-2', className)} style={{ minHeight: height }}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px] dark:bg-gray-800/60">
          <div className="border-primary-500 dark:border-primary-400 h-6 w-6 animate-spin rounded-full border-2 border-t-transparent dark:border-t-transparent" />
        </div>
      )}
      {data.map((item, i) => {
        const widthPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={i} className="group">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span
                className="title flex-1 truncate font-medium text-gray-700 dark:text-gray-300"
                title={item.name}
              >
                {item.name}
              </span>
              <span className="text-primary-600 dark:text-primary-400 flex-shrink-0 font-semibold tabular-nums">
                {toBRL(item.value)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${widthPercent}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Gráfico de donut
 */
function DonutChart({
  data,
  height,
  className,
  isLoading,
}: {
  data: ChartDataPoint[];
  height: number;
  className?: string;
  isLoading?: boolean;
}) {
  // Calcular cor primária
  const normalizeColor = (color: string) => {
    if (!color) return color;
    if (color.startsWith('#') || color.startsWith('rgb')) return color;
    return `rgb(${color})`;
  };

  const finalColorPrimary = normalizeColor(getPrimaryColorRgb());

  // Verificar dados vazios ou loading
  if (!data || data.length === 0) {
    if (isLoading) {
      return (
        <div className={clsx('flex items-center justify-center', className)} style={{ height }}>
          <div className="border-primary-500 dark:border-primary-400 h-6 w-6 animate-spin rounded-full border-2 border-t-transparent dark:border-t-transparent" />
        </div>
      );
    }

    return (
      <div className={clsx('flex items-center justify-center', className)} style={{ height }}>
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado encontrado</p>
      </div>
    );
  }

  const total = data.reduce((acc, d) => acc + d.value, 0);
  const size = Math.min(height, 200);
  const center = size / 2;
  const radius = size * 0.35;
  const innerRadius = radius * 0.6;

  const colors = [finalColorPrimary, ...CHART_SERIES_COLORS];

  let currentAngle = -90;

  const segments = data.map((item, i) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const ix1 = center + innerRadius * Math.cos(startRad);
    const iy1 = center + innerRadius * Math.sin(startRad);
    const ix2 = center + innerRadius * Math.cos(endRad);
    const iy2 = center + innerRadius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const path = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${ix2} ${iy2}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}
      Z
    `;

    currentAngle = endAngle;

    return {
      path,
      color: colors[i % colors.length],
      percentage,
      name: item.name,
      value: item.value,
    };
  });

  return (
    <div className={clsx('relative flex items-center gap-4', className)}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px] dark:bg-gray-800/60">
          <div className="border-primary-500 dark:border-primary-400 h-6 w-6 animate-spin rounded-full border-2 border-t-transparent dark:border-t-transparent" />
        </div>
      )}
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.path}
            fill={seg.color}
            className="transition-opacity hover:opacity-80"
          />
        ))}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-gray-700 text-lg font-bold dark:fill-gray-200"
        >
          {toNumber(total)}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex-1 space-y-2">
        {segments.slice(0, 5).map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div
              className="h-3 w-3 flex-shrink-0 rounded-sm"
              style={{ backgroundColor: seg.color }}
            />
            <span className="truncate text-gray-600 dark:text-gray-400">{seg.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-gray-700 dark:text-gray-300">
              {seg.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Card wrapper para gráficos
 */
export function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'relative z-10 rounded-2xl border border-gray-100 bg-white p-5',
        'dark:border-gray-700/50 dark:bg-gray-800/50',
        'shadow-sm',
        className
      )}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
