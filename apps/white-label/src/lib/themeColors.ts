import { CHART_SERIES_COLORS, DEFAULT_COMPANY_COLOR } from '@/lib/themeConstants';

type RgbTuple = [number, number, number];

const clampChannel = (value: number) => Math.min(255, Math.max(0, Math.round(value)));

const hexToRgbTuple = (hex: string): RgbTuple | null => {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 6) return null;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return [r, g, b];
};

const parseRgbTuple = (value: string): RgbTuple | null => {
  if (!value) return null;

  const cleaned = value.replace(/rgb\(/i, '').replace(/\)/g, '').replace(/\//g, ' ').trim();

  const parts = cleaned.split(/[\s,]+/).filter(Boolean);
  if (parts.length < 3) return null;

  const [r, g, b] = parts.slice(0, 3).map((part) => Number(part));
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;

  return [clampChannel(r), clampChannel(g), clampChannel(b)];
};

export const getCssVarValue = (name: string, fallback = ''): string => {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

export const getCssVarRgb = (name: string, fallbackHex = DEFAULT_COMPANY_COLOR): string => {
  const value = getCssVarValue(name);
  const tuple = parseRgbTuple(value) || hexToRgbTuple(fallbackHex);
  if (!tuple) return `rgb(${fallbackHex})`;
  return `rgb(${tuple[0]} ${tuple[1]} ${tuple[2]})`;
};

export const getCssVarRgbTuple = (name: string, fallbackHex = DEFAULT_COMPANY_COLOR): RgbTuple => {
  const value = getCssVarValue(name);
  return parseRgbTuple(value) || hexToRgbTuple(fallbackHex) || [0, 0, 0];
};

export const getCssVarHex = (name: string, fallbackHex = DEFAULT_COMPANY_COLOR): string => {
  const value = getCssVarValue(name);
  const tuple = parseRgbTuple(value);
  if (!tuple) return fallbackHex;
  const [r, g, b] = tuple;
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const toRgba = (color: string, alpha: number): string => {
  const tuple = parseRgbTuple(color) || hexToRgbTuple(color);
  if (!tuple) return color;
  const [r, g, b] = tuple;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getPrimaryColorRgb = (shade: string = '500'): string =>
  getCssVarRgb(`--color-primary-${shade}`);

export const getPrimaryColorHex = (shade: string = '500'): string =>
  getCssVarHex(`--color-primary-${shade}`, DEFAULT_COMPANY_COLOR);

export const resolveSeriesColor = (
  index: number,
  primaryColor: string,
  customColors?: string[]
): string => {
  if (customColors && customColors[index]) return customColors[index];
  if (index === 0) return primaryColor;
  return CHART_SERIES_COLORS[(index - 1) % CHART_SERIES_COLORS.length];
};
