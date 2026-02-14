/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { DEFAULT_COMPANY_COLOR, MIN_SATURATION } from '@/lib/themeConstants';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Convert hex to RGB for CSS custom properties
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '107 114 128'; // Default slate-500 (gray)

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `${r} ${g} ${b}`;
}

// Generate color palette from base color with proper shade variations
function generatePalette(baseHex: string): Record<string, string> {
  const baseRgb = hexToRgb(baseHex);
  const [r, g, b] = baseRgb.split(' ').map(Number);

  // Helper to convert RGB to HSL for easier manipulation
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0,
      s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    return [h * 360, s * 100, l * 100];
  };

  // Helper to convert HSL back to RGB
  const hslToRgb = (h: number, s: number, l: number) => {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };

  const [h, s, l] = rgbToHsl(r, g, b);

  // ⚠️ MELHORIA: Se a cor tem saturação muito baixa (cinza), aumentar a saturação mínima
  const effectiveSaturation = s < MIN_SATURATION ? MIN_SATURATION : s;

  if (s < MIN_SATURATION) {
    console.warn(
      `⚠️ [ThemeContext] Cor com saturação baixa (${s.toFixed(1)}%). ` +
        `Aumentando para ${MIN_SATURATION}% para melhor visibilidade:`,
      baseHex
    );
  }

  // Generate palette with proper lightness variations
  // Usando effectiveSaturation para garantir tons diferenciados
  const shades = {
    50: hslToRgb(h, Math.max(0, effectiveSaturation - 40), Math.min(100, l + 45)),
    100: hslToRgb(h, Math.max(0, effectiveSaturation - 35), Math.min(100, l + 35)),
    200: hslToRgb(h, Math.max(0, effectiveSaturation - 30), Math.min(100, l + 25)),
    300: hslToRgb(h, Math.max(0, effectiveSaturation - 20), Math.min(100, l + 15)),
    400: hslToRgb(h, Math.max(0, effectiveSaturation - 10), Math.min(100, l + 8)),
    500: hslToRgb(h, effectiveSaturation, l), // Base color (com saturação ajustada se necessário)
    600: hslToRgb(h, Math.min(100, effectiveSaturation + 5), Math.max(0, l - 10)),
    700: hslToRgb(h, Math.min(100, effectiveSaturation + 10), Math.max(0, l - 20)),
    800: hslToRgb(h, Math.min(100, effectiveSaturation + 15), Math.max(0, l - 30)),
    900: hslToRgb(h, Math.min(100, effectiveSaturation + 20), Math.max(0, l - 40)),
    950: hslToRgb(h, Math.min(100, effectiveSaturation + 25), Math.max(0, l - 50)),
  };

  return Object.entries(shades).reduce(
    (acc, [key, [r, g, b]]) => {
      acc[key] = `${r} ${g} ${b}`;
      return acc;
    },
    {} as Record<string, string>
  );
}

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function applyPrimaryColor(color: string) {
  const root = document.documentElement;
  const palette = generatePalette(color);

  console.log('🎨 [ThemeContext] Aplicando cor primária:', {
    color,
    paletteSample: {
      50: palette['50'],
      500: palette['500'],
      900: palette['900'],
    },
  });

  Object.entries(palette).forEach(([shade, rgb]) => {
    root.style.setProperty(`--color-primary-${shade}`, rgb);
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { company, appUser } = useAuthStore();

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'system';
    }
    return 'system';
  });

  const [primaryColor, setPrimaryColorState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('primaryColor') || DEFAULT_COMPANY_COLOR;
    }
    return DEFAULT_COMPANY_COLOR;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Load theme preference from app_user when available
  useEffect(() => {
    if (appUser?.theme) {
      const userTheme = appUser.theme as Theme;
      setThemeState(userTheme);
    } else if (company?.theme_preference) {
      setThemeState(company.theme_preference as Theme);
    }
  }, [appUser, company]);

  // Load primary color from company when available
  useEffect(() => {
    if (company?.primary_color) {
      console.log('🎨 [ThemeContext] Cor da empresa encontrada:', company.primary_color);
      setPrimaryColorState(company.primary_color);
    } else {
      console.log('🎨 [ThemeContext] Nenhuma cor de empresa definida, usando padrão');
    }
  }, [company?.primary_color]);

  // Apply theme
  useEffect(() => {
    let resolved: 'light' | 'dark' = 'light';

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      resolved = mediaQuery.matches ? 'dark' : 'light';

      const handler = (e: MediaQueryListEvent) => {
        const newResolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      };

      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      resolved = theme;
    }

    setResolvedTheme(resolved);
    applyTheme(resolved);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply primary color
  useEffect(() => {
    applyPrimaryColor(primaryColor);
    localStorage.setItem('primaryColor', primaryColor);
  }, [primaryColor]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);

    // Save to localStorage for persistence
    localStorage.setItem('theme', newTheme);

    // Save to app_user if authenticated
    if (appUser?.id) {
      supabase
        .from('app_user')
        .update({ theme: newTheme })
        .eq('id', appUser.id)
        .then(({ error }) => {
          if (error) console.error('Error saving theme preference:', error);
        });
    }
  };

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        primaryColor,
        setPrimaryColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
