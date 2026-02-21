import { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import type { ChartDataPoint } from '@/types/sales';
import { toBRL, toAxisBRL } from '@/utils/metrics';
import { NEUTRAL_COLORS } from '@/lib/themeConstants';
import { getPrimaryColorRgb, toRgba } from '@/lib/themeColors';

interface PremiumAreaChartProps {
  data: ChartDataPoint[];
  height?: number;
  className?: string;
  valueFormatter?: (value: number) => string;
  accentColor?: string;
  isLoading?: boolean;
}

/**
 * Gráfico de área premium com visual executivo moderno
 * Inspirado em dashboards SaaS de alto padrão (Stripe, Linear, Vercel)
 */
export function PremiumAreaChart({
  data,
  height = 320,
  className,
  valueFormatter = toAxisBRL,
  accentColor,
  isLoading = false,
}: PremiumAreaChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);

  // Usar CSS variable da cor primária se não especificada
  const normalizeColor = (color: string) => {
    if (!color) return color;
    if (color.startsWith('#') || color.startsWith('rgb')) return color;
    return `rgb(${color})`;
  };

  const finalColor = normalizeColor(accentColor || getPrimaryColorRgb());

  // Trigger animation on mount
  useMemo(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const padding = { top: 50, right: 16, bottom: 40, left: 60 };
  const viewBoxWidth = 1600; // Increased for better chart area utilization
  const viewBoxHeight = height;

  const chartWidth = viewBoxWidth - padding.left - padding.right;
  const chartHeight = viewBoxHeight - padding.top - padding.bottom;

  const { maxValue, minValue, points, maxIndex } = useMemo(() => {
    if (!data || data.length === 0) {
      return { maxValue: 0, minValue: 0, points: [], maxIndex: -1 };
    }

    const values = data.map((d) => d.value);
    const max = Math.max(...values) * 1.08; // 8% padding top
    const min = 0; // Sempre começar do zero para clareza

    let maxIdx = 0;
    values.forEach((v, i) => {
      if (v > values[maxIdx]) maxIdx = i;
    });

    const pts = data.map((d, i) => {
      const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.value - min) / (max - min || 1)) * chartHeight;
      return { x, y, value: d.value, name: d.name };
    });

    return { maxValue: max, minValue: min, points: pts, maxIndex: maxIdx };
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

  // Loading overlay
  const loadingOverlay = isLoading && (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-[1px] dark:bg-gray-800/60">
      <div className="border-primary-500 dark:border-primary-400 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent dark:border-t-transparent" />
    </div>
  );

  // Curva suave usando bezier curves
  const createSmoothPath = (pts: typeof points) => {
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

  const linePath = createSmoothPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
      : '';

  // Gridlines sutis (apenas 3)
  const gridLines = [0, 0.5, 1].map((pct) => ({
    y: padding.top + chartHeight * (1 - pct),
    value: minValue + (maxValue - minValue) * pct,
  }));

  return (
    <div className={clsx('relative w-full', className)}>
      {/* Loading overlay */}
      {loadingOverlay}

      {/* Fundo com gradiente sutil */}
      <div
        className="absolute inset-0 rounded-xl opacity-50"
        style={{
          background: `linear-gradient(180deg, ${toRgba(getPrimaryColorRgb(), 0.04)} 0%, transparent 100%)`,
        }}
      />

      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="relative z-10 w-full"
        style={{ height }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Gradiente vertical para área */}
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={finalColor} stopOpacity="0.25" />
            <stop offset="50%" stopColor={finalColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={finalColor} stopOpacity="0" />
          </linearGradient>

          {/* Glow para linha */}
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
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

        {/* Gridlines extremamente sutis */}
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
            {/* Labels do eixo Y - tipografia leve */}
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

        {/* Área preenchida com gradiente - animada */}
        <path
          d={areaPath}
          fill="url(#areaGradient)"
          className={clsx(
            'transition-all duration-1000 ease-out',
            isAnimated ? 'opacity-100' : 'opacity-0'
          )}
        />

        {/* Linha principal com curva suave e glow */}
        <path
          d={linePath}
          fill="none"
          stroke={finalColor}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#lineGlow)"
          className={clsx(
            'transition-all duration-1000 ease-out',
            isAnimated ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            strokeDasharray: isAnimated ? 'none' : '2000',
            strokeDashoffset: isAnimated ? '0' : '2000',
          }}
        />

        {/* Labels do eixo X - meses com área de hover */}
        {points.map((p, i) => (
          <g key={`label-${i}`}>
            {/* Área de hover invisível sobre o texto */}
            <rect
              x={p.x - 30}
              y={viewBoxHeight - padding.bottom}
              width={60}
              height={padding.bottom}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
            <text
              x={p.x}
              y={viewBoxHeight - 16}
              textAnchor="middle"
              className={clsx(
                'transition-all duration-200',
                hoveredIndex === i ? 'fill-gray-200' : 'fill-gray-500 dark:fill-gray-400'
              )}
              style={{
                fontSize: '11px',
                fontWeight: hoveredIndex === i ? 500 : 400,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {p.name}
            </text>
          </g>
        ))}

        {/* Pontos minimalistas */}
        {points.map((p, i) => {
          const isMax = i === maxIndex;
          const isHovered = hoveredIndex === i;
          const isHighlighted = isMax || isHovered;

          return (
            <g key={`point-${i}`}>
              {/* Halo para ponto destacado */}
              {isHighlighted && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isMax ? 12 : 10}
                  fill={finalColor}
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
                stroke={finalColor}
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

        {/* Áreas de hover invisíveis (por cima de tudo para capturar eventos) */}
        {points.map((p, i) => (
          <g key={`hover-area-${i}`}>
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

            {/* Área de hover invisível maior no ponto */}
            <circle
              cx={p.x}
              cy={p.y}
              r={30}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          </g>
        ))}

        {/* Tooltip elegante */}
        {hoveredIndex !== null &&
          points[hoveredIndex] &&
          (() => {
            const p = points[hoveredIndex];
            const tooltipWidth = 130;
            const tooltipHeight = 44;
            // Ajustar posição X se estiver muito perto das bordas
            let tooltipX = p.x - tooltipWidth / 2;
            if (tooltipX < padding.left) tooltipX = padding.left;
            if (tooltipX + tooltipWidth > viewBoxWidth - padding.right) {
              tooltipX = viewBoxWidth - padding.right - tooltipWidth;
            }
            const tooltipY = p.y - tooltipHeight - 12;

            return (
              <g
                onMouseEnter={() => setHoveredIndex(hoveredIndex)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Linha vertical de referência */}
                <line
                  x1={p.x}
                  y1={p.y + 8}
                  x2={p.x}
                  y2={padding.top + chartHeight}
                  stroke={finalColor}
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
                <text
                  x={tooltipX + tooltipWidth / 2}
                  y={tooltipY + 18}
                  textAnchor="middle"
                  fill="white"
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >
                  {toBRL(p.value)}
                </text>
                <text
                  x={tooltipX + tooltipWidth / 2}
                  y={tooltipY + 34}
                  textAnchor="middle"
                  fill={NEUTRAL_COLORS.gray400}
                  style={{
                    fontSize: '10px',
                    fontWeight: 400,
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >
                  {p.name}
                </text>
              </g>
            );
          })()}

        {/* Indicador do maior valor */}
        {maxIndex >= 0 && hoveredIndex !== maxIndex && (
          <g>
            <text
              x={points[maxIndex].x}
              y={points[maxIndex].y - 20}
              textAnchor="middle"
              fill={finalColor}
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
              {valueFormatter(points[maxIndex].value)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
