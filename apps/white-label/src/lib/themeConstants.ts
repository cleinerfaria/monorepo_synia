/**
 * Configurações globais de tema e cores
 *
 * ⚠️ IMPORTANTE: Todas as cores devem derivar de company.primary_color
 * Este arquivo contém apenas PADRÕES/FALLBACK
 */

/** Cor padrão da empresa quando nenhuma for configurada */
export const DEFAULT_COMPANY_COLOR = '#3B82F6';

/** Cores utilizadas em gráficos - derivam da cor primária */
export const CHART_COLORS = {
  /** Tom mais claro (50) para backgrounds */
  light: 'var(--color-primary-50)',
  /** Tom intermediário (200) */
  lighter: 'var(--color-primary-200)',
  /** Cor base (500) */
  base: 'var(--color-primary-500)',
  /** Tom mais escuro (700) para destaque */
  dark: 'var(--color-primary-700)',
  /** Tom muito escuro (900) para contraste máximo */
  darkest: 'var(--color-primary-900)',
};

/** Níveis de saturação adicionados quando cor original é muito neutra */
export const MIN_SATURATION = 15;

/** Paleta fixa para séries secundárias em gráficos (a primária vem da empresa) */
export const CHART_SERIES_COLORS = [
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#94A3B8',
];

/** Cores neutras reutilizáveis (para tooltips, textos auxiliares, etc.) */
export const NEUTRAL_COLORS = {
  white: '#ffffff',
  black: '#000000',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
};

/** Cores de status reutilizáveis */
export const STATUS_COLORS = {
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

/** Opções de cores pré-definidas para seleção rápida */
export const PRESET_COLORS = [
  { label: 'Azul', value: '#3B82F6' },
  { label: 'Amarelo', value: '#F59E0B' },
  { label: 'Verde', value: '#10B981' },
  { label: 'Roxo', value: '#8B5CF6' },
];
