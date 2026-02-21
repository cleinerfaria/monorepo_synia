import { useMemo, useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { NEUTRAL_COLORS } from '@/lib/themeConstants';
import { getCssVarHex, toRgba } from '@/lib/themeColors';

interface StateData {
  uf: string;
  faturamento: number;
}

interface BrazilMapChartProps {
  data: StateData[];
  height?: number;
  className?: string;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
}

// Mapeamento UF -> Nome completo do estado (para compatibilidade com GeoJSON)
const UF_TO_STATE_NAME: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AM: 'Amazonas',
  AP: 'Amapá',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MG: 'Minas Gerais',
  MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso',
  PA: 'Pará',
  PB: 'Paraíba',
  PE: 'Pernambuco',
  PI: 'Piauí',
  PR: 'Paraná',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RO: 'Rondônia',
  RR: 'Roraima',
  RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina',
  SE: 'Sergipe',
  SP: 'São Paulo',
  TO: 'Tocantins',
};

// Mapeamento inverso: Nome do estado -> UF
const STATE_NAME_TO_UF: Record<string, string> = Object.fromEntries(
  Object.entries(UF_TO_STATE_NAME).map(([uf, name]) => [name, uf])
);

/**
 * Mapa do Brasil Choropleth com ECharts
 * Renderiza estados com cores baseadas no faturamento
 */
export function BrazilMapChart({
  data,
  height = 520,
  className,
  isLoading = false,
  title = 'Faturamento por Estado',
  subtitle = 'Últimos 12 meses',
}: BrazilMapChartProps) {
  const chartRef = useRef<ReactECharts>(null);
  const [brazilGeoJson, setBrazilGeoJson] = useState<any>(null);
  const [mapLoading, setMapLoading] = useState(true);

  // Carregar GeoJSON dinamicamente
  useEffect(() => {
    const loadGeoJson = async () => {
      try {
        const { default: geoJson } = await import('@/data/brazil-states.json');
        setBrazilGeoJson(geoJson);
        echarts.registerMap('BR', geoJson as any);
      } catch (error) {
        console.error('Erro ao carregar dados do mapa:', error);
      } finally {
        setMapLoading(false);
      }
    };

    loadGeoJson();
  }, []);

  // Converter dados de UF para nome do estado (formato do GeoJSON)
  const chartData = useMemo(() => {
    return data.map((item) => ({
      name: UF_TO_STATE_NAME[item.uf.toUpperCase()] || item.uf,
      value: item.faturamento,
      uf: item.uf.toUpperCase(),
    }));
  }, [data]);

  // Calcular valores min/max para a escala de cores
  const { maxValue, totalRevenue } = useMemo(() => {
    if (!data || data.length === 0) {
      return { minValue: 0, maxValue: 1000000, totalRevenue: 0 };
    }
    const values = data.map((d) => d.faturamento);
    return {
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
      totalRevenue: values.reduce((sum, v) => sum + v, 0),
    };
  }, [data]);

  // Top 10 estados
  const topStates = useMemo(
    () => [...data].sort((a, b) => b.faturamento - a.faturamento).slice(0, 10),
    [data]
  );

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
    if (value >= 1000) return `R$ ${Math.round(value / 1000)}K`;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Formato para a escala do mapa (ex: R$ 12.155k)
  const formatScaleValue = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}k`;
    }
    return `R$ ${value.toLocaleString('pt-BR')}`;
  };

  // Função helper para obter cor CSS convertida para formato hexadecimal
  const getPrimaryColor = (shade: string) =>
    getCssVarHex(`--color-primary-${shade}`, NEUTRAL_COLORS.gray500);

  // Configuração do ECharts
  const option = useMemo(() => {
    // Obter cores dinâmicas da paleta primary da empresa
    const primaryColors = {
      50: getPrimaryColor('50'),
      100: getPrimaryColor('100'),
      200: getPrimaryColor('200'),
      300: getPrimaryColor('300'),
      400: getPrimaryColor('400'),
      500: getPrimaryColor('500'),
      600: getPrimaryColor('600'),
      700: getPrimaryColor('700'),
      800: getPrimaryColor('800'),
      900: getPrimaryColor('900'),
    };

    // Detectar tema atual
    const isDarkMode = document.documentElement.classList.contains('dark');

    // Cores adaptáveis por tema
    const themeColors = {
      background: 'transparent',
      tooltipBg: isDarkMode
        ? toRgba(NEUTRAL_COLORS.gray900, 0.95)
        : toRgba(NEUTRAL_COLORS.white, 0.95),
      tooltipBorder: isDarkMode
        ? toRgba(NEUTRAL_COLORS.gray600, 0.5)
        : toRgba(NEUTRAL_COLORS.gray300, 0.8),
      tooltipText: isDarkMode ? NEUTRAL_COLORS.gray100 : NEUTRAL_COLORS.gray800,
      mapAreaColor: isDarkMode ? NEUTRAL_COLORS.gray800 : NEUTRAL_COLORS.gray50,
      mapBorderColor: isDarkMode ? NEUTRAL_COLORS.gray700 : NEUTRAL_COLORS.white, // gray-700 : white (melhor contraste)
      emphasisAreaColor: primaryColors[500],
      emphasisBorderColor: primaryColors[600],
      scaleTextColor: isDarkMode ? NEUTRAL_COLORS.gray400 : NEUTRAL_COLORS.gray700, // gray-400 : gray-700 (mais escuro no light)
    };

    // Gradiente de cores para a escala baseado no tema
    const colorScale = isDarkMode
      ? [primaryColors[700], primaryColors[500], primaryColors[400], primaryColors[200]] // Escuro: tons médios para evitar preto
      : [primaryColors[200], primaryColors[400], primaryColors[500], primaryColors[600]]; // Claro: tons médios para melhor contraste

    return {
      backgroundColor: themeColors.background,
      tooltip: {
        trigger: 'item',
        backgroundColor: themeColors.tooltipBg,
        borderColor: themeColors.tooltipBorder,
        borderWidth: 1,
        padding: [12, 16],
        textStyle: {
          color: themeColors.tooltipText,
          fontSize: 13,
        },
        formatter: (params: any) => {
          const uf = STATE_NAME_TO_UF[params.name] || '';
          const value = params.value || 0;
          const percentage = totalRevenue > 0 ? ((value / totalRevenue) * 100).toFixed(1) : '0';
          return `
            <div style="font-weight: 600; margin-bottom: 6px;">
              ${params.name} <span style="color: ${
                isDarkMode ? NEUTRAL_COLORS.gray400 : NEUTRAL_COLORS.gray500
              }; font-weight: 400;">(${uf})</span>
            </div>
            <div style="font-size: 18px; font-weight: 700; color: ${primaryColors[600]};">
              ${formatCurrency(value)}
            </div>
            <div style="font-size: 11px; color: ${
              isDarkMode ? NEUTRAL_COLORS.gray400 : NEUTRAL_COLORS.gray500
            }; margin-top: 4px;">
              ${percentage}% do total
            </div>
          `;
        },
      },
      visualMap: {
        show: true,
        min: 0,
        max: maxValue,
        left: 20,
        bottom: 40,
        orient: 'vertical',
        itemWidth: 16,
        itemHeight: 180,
        text: [formatScaleValue(maxValue), formatScaleValue(0)],
        textStyle: {
          color: themeColors.scaleTextColor,
          fontSize: 11,
          fontWeight: 500,
        },
        inRange: {
          color: colorScale,
        },
        outOfRange: {
          color: themeColors.mapAreaColor,
        },
        calculable: false,
      },
      series: [
        {
          type: 'map',
          map: 'BR',
          roam: false,
          zoom: 1.1,
          center: [-52, -15],
          aspectScale: 0.85,
          selectedMode: false,
          itemStyle: {
            areaColor: themeColors.mapAreaColor,
            borderColor: themeColors.mapBorderColor,
            borderWidth: isDarkMode ? 0.5 : 1, // Borda mais visível no tema light
          },
          emphasis: {
            itemStyle: {
              areaColor: themeColors.emphasisAreaColor,
              borderColor: themeColors.emphasisBorderColor,
              borderWidth: 2,
              shadowColor: primaryColors[500] + (isDarkMode ? '66' : '33'), // Adiciona transparência
              shadowBlur: 10,
            },
            label: {
              show: false,
            },
          },
          select: {
            disabled: true,
          },
          label: {
            show: false,
          },
          data: chartData,
        },
      ],
    };
  }, [chartData, maxValue, totalRevenue]);

  // Não renderizar até que o GeoJSON esteja carregado
  if (mapLoading || !brazilGeoJson) {
    return (
      <div
        className={clsx(
          'rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900',
          className
        )}
        style={{ height }}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Carregando dados do mapa...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && (!data || data.length === 0)) {
    return (
      <div
        className={clsx(
          'relative overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-800/50 p-6 shadow-sm',
          className
        )}
        style={{ minHeight: height }}
      >
        <div className="flex h-full min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="border-primary-500 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            <span className="text-sm text-gray-400">Carregando mapa...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700/50 dark:bg-gray-800/50',
        className
      )}
    >
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Total</p>
            <p className="text-primary-500 text-lg font-bold">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Mapa ECharts */}
        <div className="relative flex-1 p-4 lg:p-6" style={{ minHeight: height - 80 }}>
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-gray-800/70">
              <div className="border-primary-500 h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          )}

          <ReactECharts
            ref={chartRef}
            option={option}
            style={{ height: height - 80, width: '100%' }}
            opts={{ renderer: 'svg' }}
            notMerge={true}
          />
        </div>

        {/* Ranking */}
        <div className="w-full border-t border-gray-100 p-5 lg:w-[820px] lg:border-l lg:border-t-0 dark:border-gray-700/50">
          <h4 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Top 10 Estados
          </h4>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {topStates.map((state, _i) => {
              const maxFat = topStates[0]?.faturamento || 1;
              const pct = (state.faturamento / maxFat) * 100;
              const share = (state.faturamento / totalRevenue) * 100;

              // Obter cores dinâmicas para as barras
              const primary400 = getPrimaryColor('400');
              const primary500 = getPrimaryColor('500');

              return (
                <div
                  key={state.uf}
                  className="group rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {UF_TO_STATE_NAME[state.uf.toUpperCase()]}
                      <span className="ml-1 text-[10px] text-gray-400">({state.uf})</span>
                    </span>
                    <span className="text-[10px] text-gray-400">{share.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-primary-500 text-sm font-semibold">
                      {formatCurrency(state.faturamento)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(to right, ${primary400}, ${primary500})`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BrazilMapChart;
