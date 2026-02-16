import { useMemo, useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { toAxisBRL, toBRL } from '@/utils/metrics';
import { NEUTRAL_COLORS, STATUS_COLORS } from '@/lib/themeConstants';
import { getPrimaryColorRgb, toRgba } from '@/lib/themeColors';

interface DualLineDataPoint {
  name: string;
  date: string;
  meta: number;
  faturamento: number | null; // null para dias futuros
}

interface DualLineChartProps {
  data: DualLineDataPoint[];
  height?: number;
  className?: string;
  valueFormatter?: (value: number) => string;
  metaColor?: string;
  faturamentoColor?: string;
  isLoading?: boolean;
  /** Label para a linha de meta/referência */
  metaLabel?: string;
  /** Label para a linha de faturamento */
  faturamentoLabel?: string;
  /** Mostrar marcadores (círculos) na linha de faturamento */
  showFaturamentoMarkers?: boolean;
  /** Mostrar marcadores (círculos) na linha de meta */
  showMetaMarkers?: boolean;
  /** Mostrar área preenchida sob a linha de faturamento */
  showFaturamentoArea?: boolean;
  /** Mostrar linha de meta */
  showMetaLine?: boolean;
  /** Função para filtrar quais labels do eixo X mostrar */
  filterXLabels?: (index: number, date: string, name: string, dataLength: number) => boolean;
}

/**
 * Gráfico de duas linhas com configurações flexíveis
 *
 * Suporta dois modos principais:
 *
 * 1. MODO VISÃO GERAL (valores padrão):
 *    - Compara faturamento atual vs ano anterior
 *    - Mostra marcadores apenas no faturamento
 *    - Útil para análise de crescimento
 *
 * 2. MODO META (configuração específica):
 *    - Compara faturamento vs meta
 *    - Oculta marcadores da meta para clareza
 *    - Útil para acompanhamento de metas
 *
 * @example
 * // Modo Visão Geral (padrão)
 * <DualLineChart data={data} height={340} />
 *
 * @example
 * // Modo Meta
 * <DualLineChart
 *   data={data}
 *   height={400}
 *   metaLabel="Meta"
 *   faturamentoLabel="Faturamento"
 *   showFaturamentoMarkers={true}
 *   showMetaMarkers={false}
 * />
 */
export function DualLineChart({
  data,
  height = 320,
  className,
  valueFormatter = toAxisBRL,
  metaColor,
  faturamentoColor,
  isLoading = false,
  metaLabel = 'Ano Anterior',
  faturamentoLabel = 'Últimos 12 meses',
  showFaturamentoMarkers = true,
  showMetaMarkers = false,
  showFaturamentoArea = true,
  showMetaLine = true,
  filterXLabels,
}: DualLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);

  // Cores default - derivadas da paleta primária da empresa
  // Meta usa tom mais claro (200), Faturamento usa a cor base (500)
  const normalizeColor = (color: string) => {
    if (!color) return color;
    if (color.startsWith('#') || color.startsWith('rgb')) return color;
    return `rgb(${color})`;
  };

  const defaultMetaColor = getPrimaryColorRgb('200');
  const defaultFaturamentoColor = getPrimaryColorRgb('500');

  const finalMetaColor = normalizeColor(metaColor || defaultMetaColor);
  const finalFaturamentoColor = normalizeColor(faturamentoColor || defaultFaturamentoColor);

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const padding = { top: 50, right: 16, bottom: 60, left: 80 };
  const viewBoxWidth = 1600;
  const viewBoxHeight = height;

  const chartWidth = viewBoxWidth - padding.left - padding.right;
  const chartHeight = viewBoxHeight - padding.top - padding.bottom;

  const { maxValue, metaPoints, faturamentoPoints, lastFaturamentoIndex } = useMemo(() => {
    if (!data || data.length === 0) {
      return { maxValue: 0, metaPoints: [], faturamentoPoints: [], lastFaturamentoIndex: -1 };
    }

    // Encontrar o máximo entre meta e faturamento
    const allValues = data.flatMap((d) =>
      [d.meta, d.faturamento].filter((v): v is number => v !== null)
    );
    const max = Math.max(...allValues) * 1.08;

    // Encontrar último índice com faturamento
    let lastIdx = -1;
    data.forEach((d, i) => {
      if (d.faturamento !== null) lastIdx = i;
    });

    const metaPts = data.map((d, i) => {
      const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
      const y = padding.top + chartHeight - (d.meta / (max || 1)) * chartHeight;
      return { x, y, value: d.meta, name: d.name, date: d.date };
    });

    const faturamentoPts = data
      .filter((d) => d.faturamento !== null)
      .map((d, _i, _arr) => {
        const originalIndex = data.findIndex((od) => od.date === d.date);
        const x = padding.left + (originalIndex / Math.max(data.length - 1, 1)) * chartWidth;
        const y = padding.top + chartHeight - ((d.faturamento || 0) / (max || 1)) * chartHeight;
        return {
          x,
          y,
          value: d.faturamento || 0,
          name: d.name,
          date: d.date,
          index: originalIndex,
        };
      });

    return {
      maxValue: max,
      metaPoints: metaPts,
      faturamentoPoints: faturamentoPts,
      lastFaturamentoIndex: lastIdx,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, chartWidth, chartHeight]);

  // Labels do eixo X - mostrar todos os meses
  // IMPORTANTE: Este hook deve estar ANTES de qualquer return condicional
  const xLabels = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Usar o name já formatado do data
    return data
      .map((d, i) => {
        const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
        return { x, label: d.name, index: i, date: d.date };
      })
      .filter((item) => {
        // Se houver função de filtro, usá-la
        if (filterXLabels) {
          return filterXLabels(item.index, item.date, item.label, data.length);
        }
        // Caso contrário, mostrar todos
        return true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, chartWidth, filterXLabels]);

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

  // Loading overlay
  const loadingOverlay = isLoading && (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px] dark:bg-gray-800/60">
      <div className="border-primary-500 dark:border-primary-400 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent dark:border-t-transparent" />
    </div>
  );

  // Curva suave usando bezier curves
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';

    let path = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const current = pts[i];
      const next = pts[i + 1];
      const cpx = (current.x + next.x) / 2;

      path += ` C ${cpx} ${current.y}, ${cpx} ${next.y}, ${next.x} ${next.y}`;
    }

    return path;
  };

  const metaLinePath = createSmoothPath(metaPoints);
  const faturamentoLinePath = createSmoothPath(faturamentoPoints);

  // Área preenchida para faturamento
  const faturamentoAreaPath =
    faturamentoPoints.length > 0
      ? `${faturamentoLinePath} L ${faturamentoPoints[faturamentoPoints.length - 1].x} ${padding.top + chartHeight} L ${faturamentoPoints[0].x} ${padding.top + chartHeight} Z`
      : '';

  // Gridlines (4 linhas)
  const gridLines = [0, 0.33, 0.66, 1].map((pct) => ({
    y: padding.top + chartHeight * (1 - pct),
    value: maxValue * pct,
  }));

  return (
    <div className={clsx('relative w-full', className)}>
      {/* Loading overlay */}
      {loadingOverlay}

      {/* Legenda */}
      <div className="absolute right-4 top-2 z-10 flex items-center gap-4 text-xs">
        {showMetaLine && (
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: finalMetaColor }} />
            <span className="text-gray-600 dark:text-gray-400">{metaLabel}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: finalFaturamentoColor }}
          />
          <span className="text-gray-600 dark:text-gray-400">{faturamentoLabel}</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="relative z-10 w-full"
        style={{ height }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Gradiente para área de faturamento */}
          <linearGradient id="faturamentoAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={finalFaturamentoColor} stopOpacity="0.20" />
            <stop offset="50%" stopColor={finalFaturamentoColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={finalFaturamentoColor} stopOpacity="0" />
          </linearGradient>

          {/* Glow para linha */}
          <filter id="dualLineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Glow para ponto destacado */}
          <filter id="pointGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Gridlines */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={viewBoxWidth - padding.right}
              y2={line.y}
              stroke="currentColor"
              strokeOpacity={0.06}
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

        {/* Área preenchida para faturamento */}
        {showFaturamentoArea && (
          <path
            d={faturamentoAreaPath}
            fill="url(#faturamentoAreaGradient)"
            className={clsx(
              'transition-all duration-1000 ease-out',
              isAnimated ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}

        {/* Linha de Meta (tracejada com transparência) */}
        {showMetaLine && (
          <path
            d={metaLinePath}
            fill="none"
            stroke={finalMetaColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 6"
            strokeOpacity={0.5}
            className={clsx(
              'transition-all duration-1000 ease-out',
              isAnimated ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}

        {/* Pontos da linha de Meta (opcional) */}
        {showMetaMarkers &&
          metaPoints.map((p, i) => {
            const isMax = p.value === Math.max(...metaPoints.map((pt) => pt.value));
            const isHovered = hoveredIndex === i;
            const isHighlighted = isMax || isHovered;

            return (
              <g key={`meta-point-${i}`}>
                {/* Halo para ponto destacado */}
                {isHighlighted && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isMax ? 12 : 10}
                    fill={finalMetaColor}
                    fillOpacity={0.15}
                    filter="url(#pointGlow)"
                    className="animate-pulse"
                  />
                )}

                {/* Ponto principal */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHighlighted ? 5 : 3.5}
                  fill="white"
                  stroke={finalMetaColor}
                  strokeWidth={isHighlighted ? 2.5 : 2}
                  className={clsx(
                    'transition-all duration-200 ease-out dark:fill-black',
                    isAnimated ? 'opacity-100' : 'opacity-0'
                  )}
                  style={{ transitionDelay: `${i * 50}ms` }}
                />
              </g>
            );
          })}

        {/* Linha de Faturamento (sólida) */}
        <path
          d={faturamentoLinePath}
          fill="none"
          stroke={finalFaturamentoColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#dualLineGlow)"
          className={clsx(
            'transition-all duration-1000 ease-out',
            isAnimated ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Pontos da linha de Faturamento com estilo original */}
        {showFaturamentoMarkers &&
          faturamentoPoints.map((p, i) => {
            const isMax = p.value === Math.max(...faturamentoPoints.map((pt) => pt.value));
            const isHovered = hoveredIndex === p.index;
            const isHighlighted = isMax || isHovered;

            return (
              <g key={`fat-point-${i}`}>
                {/* Halo para ponto destacado */}
                {isHighlighted && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isMax ? 12 : 10}
                    fill={finalFaturamentoColor}
                    fillOpacity={0.15}
                    filter="url(#pointGlow)"
                    className="animate-pulse"
                  />
                )}

                {/* Ponto principal */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHighlighted ? 5 : 3.5}
                  fill="white"
                  stroke={finalFaturamentoColor}
                  strokeWidth={isHighlighted ? 2.5 : 2}
                  className={clsx(
                    'transition-all duration-200 ease-out dark:fill-black',
                    isAnimated ? 'opacity-100' : 'opacity-0'
                  )}
                  style={{ transitionDelay: `${i * 50}ms` }}
                />
              </g>
            );
          })}

        {/* Labels do eixo X - meses com área de hover */}
        {xLabels.map((item, i) => (
          <g key={`label-${i}`}>
            {/* Área de hover invisível sobre o texto */}
            <rect
              x={item.x - 30}
              y={viewBoxHeight - padding.bottom}
              width={60}
              height={padding.bottom}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(item.index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
            <text
              x={item.x}
              y={viewBoxHeight - 16}
              textAnchor="middle"
              className={clsx(
                'transition-all duration-200',
                hoveredIndex === item.index ? 'fill-gray-200' : 'fill-gray-500 dark:fill-gray-400'
              )}
              style={{
                fontSize: '11px',
                fontWeight: hoveredIndex === item.index ? 500 : 400,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {item.label}
            </text>
          </g>
        ))}

        {/* Tooltip elegante - estilo original */}
        {hoveredIndex !== null &&
          data[hoveredIndex] &&
          (() => {
            const d = data[hoveredIndex];
            const _x = padding.left + (hoveredIndex / Math.max(data.length - 1, 1)) * chartWidth;
            const _metaY = metaPoints[hoveredIndex]?.y || padding.top;
            const fatPt = faturamentoPoints.find((p) => p.index === hoveredIndex);

            // Tooltip para faturamento (principal)
            if (fatPt) {
              const tooltipWidth = 150;
              const tooltipHeight = 64;
              let tooltipX = fatPt.x - tooltipWidth / 2;
              if (tooltipX < padding.left) tooltipX = padding.left;
              if (tooltipX + tooltipWidth > viewBoxWidth - padding.right) {
                tooltipX = viewBoxWidth - padding.right - tooltipWidth;
              }
              const tooltipY = fatPt.y - tooltipHeight - 12;

              return (
                <g
                  onMouseEnter={() => setHoveredIndex(hoveredIndex)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Linha vertical de referência */}
                  <line
                    x1={fatPt.x}
                    y1={fatPt.y + 8}
                    x2={fatPt.x}
                    y2={padding.top + chartHeight}
                    stroke={finalFaturamentoColor}
                    strokeOpacity={0.25}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    className="pointer-events-none"
                  />

                  {/* Card do tooltip */}
                  <rect
                    x={tooltipX}
                    y={tooltipY}
                    width={tooltipWidth}
                    height={tooltipHeight}
                    rx={8}
                    fill={toRgba(NEUTRAL_COLORS.gray900, 0.95)}
                    stroke={toRgba(NEUTRAL_COLORS.white, 0.08)}
                    strokeWidth={1}
                    className="cursor-pointer"
                  />

                  {/* Mês */}
                  <text
                    x={tooltipX + tooltipWidth / 2}
                    y={tooltipY + 12}
                    textAnchor="middle"
                    fill={NEUTRAL_COLORS.gray400}
                    style={{
                      fontSize: '10px',
                      fontWeight: 400,
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    {d.name}
                  </text>

                  {/* Valor Atual (em cima) */}
                  <text
                    x={tooltipX + tooltipWidth / 2}
                    y={tooltipY + 28}
                    textAnchor="middle"
                    fill="white"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    {toBRL(fatPt.value)}
                  </text>

                  {/* Valor YoY (embaixo) */}
                  <text
                    x={tooltipX + tooltipWidth / 2}
                    y={tooltipY + 44}
                    textAnchor="middle"
                    fill={NEUTRAL_COLORS.gray400}
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    YoY: {toBRL(d.meta)}
                  </text>

                  {/* Diferença percentual */}
                  <text
                    x={tooltipX + tooltipWidth / 2}
                    y={tooltipY + 58}
                    textAnchor="middle"
                    fill={fatPt.value >= d.meta ? STATUS_COLORS.success : STATUS_COLORS.danger}
                    style={{
                      fontSize: '9px',
                      fontWeight: 500,
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    {d.meta > 0 ? `${(((fatPt.value - d.meta) / d.meta) * 100).toFixed(1)}%` : '—'}
                  </text>
                </g>
              );
            }

            return null;
          })()}

        {/* Indicador do último ponto de faturamento */}
        {lastFaturamentoIndex >= 0 &&
          faturamentoPoints.length > 0 &&
          hoveredIndex !== lastFaturamentoIndex && (
            <g>
              <text
                x={faturamentoPoints[faturamentoPoints.length - 1].x}
                y={faturamentoPoints[faturamentoPoints.length - 1].y - 20}
                textAnchor="middle"
                fill={finalFaturamentoColor}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
                className={clsx(
                  'transition-opacity duration-500',
                  isAnimated ? 'opacity-100' : 'opacity-0'
                )}
              >
                {valueFormatter(faturamentoPoints[faturamentoPoints.length - 1].value)}
              </text>
            </g>
          )}

        {/* Indicador do maior valor do faturamento */}
        {(() => {
          const maxFatPoint = faturamentoPoints.reduce(
            (max, p) =>
              p.value > max.value || (p.value === max.value && p.index > max.index) ? p : max,
            faturamentoPoints[0] || { value: 0, x: 0, y: 0, index: -1 }
          );

          return (
            maxFatPoint &&
            maxFatPoint.index >= 0 &&
            hoveredIndex !== maxFatPoint.index && (
              <g>
                <text
                  x={maxFatPoint.x}
                  y={maxFatPoint.y - 20}
                  textAnchor="middle"
                  fill={finalFaturamentoColor}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                  className={clsx(
                    'transition-opacity duration-500',
                    isAnimated ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  {valueFormatter(maxFatPoint.value)}
                </text>
              </g>
            )
          );
        })()}

        {/* Áreas de hover invisíveis (por cima de tudo para capturar eventos - renderizado por último) */}
        {data.map((d, i) => {
          const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
          const metaY = metaPoints[i]?.y || 0;
          const fatPt = faturamentoPoints.find((p) => p.index === i);

          return (
            <g key={`hover-area-${i}`}>
              {/* Linha vertical invisível para hover em toda altura */}
              <rect
                x={x - 15}
                y={padding.top}
                width={30}
                height={chartHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* Área de hover invisível maior nos pontos */}
              <circle
                cx={x}
                cy={metaY}
                r={30}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {fatPt && (
                <circle
                  cx={fatPt.x}
                  cy={fatPt.y}
                  r={30}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
