import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { toAxisBRL, toBRL } from '@/utils/metrics';
import { NEUTRAL_COLORS, STATUS_COLORS } from '@/lib/themeConstants';
import { getPrimaryColorRgb, toRgba } from '@/lib/themeColors';

interface GroupedBarDataPoint {
  name: string;
  meta: number;
  realizado: number;
  realizadoAnterior?: number;
}

interface GroupedBarChartProps {
  data: GroupedBarDataPoint[];
  height?: number;
  className?: string;
  valueFormatter?: (value: number) => string;
  metaColor?: string;
  realizadoColor?: string;
  isLoading?: boolean;
}

/**
 * Gráfico de barras agrupadas para Meta vs Realizado
 */
export function GroupedBarChart({
  data,
  height = 320,
  className,
  valueFormatter = toAxisBRL,
  metaColor,
  realizadoColor,
  isLoading = false,
}: GroupedBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Cores derivadas da paleta primária
  // Meta usa ton 300 (mais claro), Realizado usa tom 500 (base)
  const defaultMetaColor = getPrimaryColorRgb('300');
  const defaultRealizadoColor = getPrimaryColorRgb('500');

  const normalizeColor = (color: string) => {
    if (!color) return color;
    if (color.startsWith('#') || color.startsWith('rgb')) return color;
    return `rgb(${color})`;
  };

  const finalMetaColor = normalizeColor(metaColor || defaultMetaColor);
  const finalRealizadoColor = normalizeColor(realizadoColor || defaultRealizadoColor);

  const padding = { top: 40, right: 20, bottom: 50, left: 80 };
  const viewBoxWidth = 1600;
  const viewBoxHeight = height;

  const chartWidth = viewBoxWidth - padding.left - padding.right;
  const chartHeight = viewBoxHeight - padding.top - padding.bottom;

  const { maxValue, bars } = useMemo(() => {
    if (!data || data.length === 0) {
      return { maxValue: 0, bars: [] };
    }

    // Encontrar o máximo entre meta, realizado e realizado anterior
    const allValues = data.flatMap((d) => [d.meta, d.realizado, d.realizadoAnterior || 0]);
    const max = Math.max(...allValues) * 1.1; // 10% padding

    const groupWidth = chartWidth / data.length;
    const barWidth = groupWidth * 0.25; // Cada barra ocupa 25% do grupo
    const gap = groupWidth * 0.03; // 3% de gap entre as barras do grupo

    const barsData = data.map((d, i) => {
      const groupX = padding.left + i * groupWidth + groupWidth / 2;

      const metaHeight = (d.meta / max) * chartHeight;
      const realizadoHeight = (d.realizado / max) * chartHeight;
      const realizadoAnteriorHeight = ((d.realizadoAnterior || 0) / max) * chartHeight;

      return {
        name: d.name,
        meta: d.meta,
        realizado: d.realizado,
        realizadoAnterior: d.realizadoAnterior || 0,
        realizadoX: groupX - barWidth * 1.5 - gap,
        realizadoAnteriorX: groupX - barWidth / 2 - gap / 2,
        metaX: groupX + barWidth / 2 + gap / 2,
        metaY: padding.top + chartHeight - metaHeight,
        realizadoY: padding.top + chartHeight - realizadoHeight,
        realizadoAnteriorY: padding.top + chartHeight - realizadoAnteriorHeight,
        metaHeight,
        realizadoHeight,
        realizadoAnteriorHeight,
        barWidth,
        groupX,
      };
    });

    return { maxValue: max, bars: barsData };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, chartWidth, chartHeight]);

  if (!data || data.length === 0) {
    if (isLoading) {
      return (
        <div className={clsx('flex items-center justify-center', className)} style={{ height }}>
          <div className="border-primary-500 dark:border-primary-400 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent dark:border-t-transparent" />
        </div>
      );
    }

    return (
      <div className={clsx('flex items-center justify-center', className)} style={{ height }}>
        <p className="text-sm text-gray-500 dark:text-gray-400">Sem dados disponíveis</p>
      </div>
    );
  }

  // Gridlines (4 linhas)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: padding.top + chartHeight * (1 - pct),
    value: maxValue * pct,
  }));

  return (
    <div className={clsx('relative w-full', className)}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px] dark:bg-gray-800/60">
          <div className="border-primary-500 dark:border-primary-400 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent dark:border-t-transparent" />
        </div>
      )}

      {/* Legenda */}
      <div className="absolute right-4 top-2 z-10 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: finalRealizadoColor }} />
          <span className="text-gray-600 dark:text-gray-400">Ano Atual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded"
            style={{ backgroundColor: finalRealizadoColor, opacity: 0.35 }}
          />
          <span className="text-gray-600 dark:text-gray-400">Ano Anterior</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: finalMetaColor }} />
          <span className="text-gray-600 dark:text-gray-400">Meta</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Gridlines */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={viewBoxWidth - padding.right}
              y2={line.y}
              stroke="currentColor"
              strokeOpacity={0.08}
              className="text-gray-400"
            />
            {/* Labels do eixo Y */}
            <text
              x={padding.left - 12}
              y={line.y + 4}
              textAnchor="end"
              className="fill-gray-500 dark:fill-gray-400"
              style={{
                fontSize: '11px',
                fontWeight: 400,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {valueFormatter(line.value)}
            </text>
          </g>
        ))}

        {/* Barras */}
        {bars.map((bar, i) => {
          const isHovered = hoveredIndex === i;

          return (
            <g key={i}>
              {/* Área de hover */}
              <rect
                x={bar.groupX - bar.barWidth * 2 - 20}
                y={padding.top}
                width={bar.barWidth * 4 + 40}
                height={chartHeight + padding.bottom}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* Barra Realizado Anterior (primária com 50% transparência) */}
              <rect
                x={bar.realizadoAnteriorX}
                y={bar.realizadoAnteriorY}
                width={bar.barWidth}
                height={Math.max(0, bar.realizadoAnteriorHeight)}
                fill={finalRealizadoColor}
                fillOpacity={isHovered ? 0.35 : 0.2}
                rx={4}
                className="transition-all duration-200"
                pointerEvents="none"
              />

              {/* Barra Meta (tom primário 300) */}
              <rect
                x={bar.metaX}
                y={bar.metaY}
                width={bar.barWidth}
                height={Math.max(0, bar.metaHeight)}
                fill={finalMetaColor}
                fillOpacity={isHovered ? 1 : 0.7}
                rx={4}
                className="transition-all duration-200"
                pointerEvents="none"
              />

              {/* Barra Realizado (verde/primária) */}
              <rect
                x={bar.realizadoX}
                y={bar.realizadoY}
                width={bar.barWidth}
                height={Math.max(0, bar.realizadoHeight)}
                fill={finalRealizadoColor}
                fillOpacity={isHovered ? 1 : 0.85}
                rx={4}
                className="transition-all duration-200"
                pointerEvents="none"
              />

              {/* Label do mês */}
              <text
                x={bar.groupX}
                y={viewBoxHeight - 16}
                textAnchor="middle"
                className={clsx(
                  'transition-all duration-200',
                  isHovered ? 'fill-gray-200' : 'fill-gray-500 dark:fill-gray-400'
                )}
                style={{
                  fontSize: '12px',
                  fontWeight: isHovered ? 600 : 400,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {bar.name}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {hoveredIndex !== null &&
          bars[hoveredIndex] &&
          (() => {
            const bar = bars[hoveredIndex];
            const diferenca = bar.realizado - bar.meta;
            const diferencaPercentual = bar.meta > 0 ? (diferenca / bar.meta) * 100 : 0;
            const diferencaCor = diferenca >= 0 ? STATUS_COLORS.success : STATUS_COLORS.danger;
            const tooltipWidth = 160;
            const tooltipHeight = 108;
            let tooltipX = bar.groupX - tooltipWidth / 2;
            if (tooltipX < padding.left) tooltipX = padding.left;
            if (tooltipX + tooltipWidth > viewBoxWidth - padding.right) {
              tooltipX = viewBoxWidth - padding.right - tooltipWidth;
            }
            const _tooltipY = Math.min(bar.metaY, bar.realizadoY) - tooltipHeight - 10;

            return (
              <g className="pointer-events-none" style={{ zIndex: 1000 }}>
                {/* Tooltip card */}
                <rect
                  x={tooltipX}
                  y={50}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  rx={8}
                  fill={toRgba(NEUTRAL_COLORS.gray900, 0.95)}
                  stroke={toRgba(NEUTRAL_COLORS.white, 0.08)}
                  strokeWidth={1}
                />
                <text
                  x={tooltipX + tooltipWidth / 2}
                  y={50 + 18}
                  textAnchor="middle"
                  fill={NEUTRAL_COLORS.gray400}
                  style={{ fontSize: '11px', fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  {bar.name}
                </text>
                <text
                  x={tooltipX + 12}
                  y={50 + 36}
                  fill={finalRealizadoColor}
                  style={{
                    fontSize: '11px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    opacity: 0.6,
                  }}
                >
                  Real (Ant): {toBRL(bar.realizadoAnterior)}
                </text>
                <text
                  x={tooltipX + 12}
                  y={50 + 52}
                  fill={finalRealizadoColor}
                  style={{ fontSize: '11px', fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  Real: {toBRL(bar.realizado)}
                </text>
                <text
                  x={tooltipX + 12}
                  y={50 + 68}
                  fill={finalMetaColor}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >
                  Meta: {toBRL(bar.meta)}
                </text>
                <text
                  x={tooltipX + 12}
                  y={50 + 84}
                  fill={diferencaCor}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >
                  Dif: {toBRL(diferenca)}
                </text>
                <text
                  x={tooltipX + 12}
                  y={50 + 100}
                  fill={diferencaCor}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >
                  {diferencaPercentual.toFixed(1)}%
                </text>
              </g>
            );
          })()}
      </svg>
    </div>
  );
}
