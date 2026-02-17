/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { DEFAULT_PRIMARY_COLOR } from '@/design-system/theme/constants';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

type RgbTuple = [number, number, number];

const WHITE: RgbTuple = [255, 255, 255];
const BLACK: RgbTuple = [0, 0, 0];

const PALETTE_MIXES: Record<string, { target: RgbTuple; weight: number }> = {
  50: { target: WHITE, weight: 0.92 },
  100: { target: WHITE, weight: 0.84 },
  200: { target: WHITE, weight: 0.68 },
  300: { target: WHITE, weight: 0.5 },
  400: { target: WHITE, weight: 0.28 },
  500: { target: WHITE, weight: 0 },
  600: { target: BLACK, weight: 0.12 },
  700: { target: BLACK, weight: 0.24 },
  800: { target: BLACK, weight: 0.36 },
  900: { target: BLACK, weight: 0.5 },
  950: { target: BLACK, weight: 0.68 },
};

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function rgbToCssVar(rgb: RgbTuple): string {
  return `${rgb[0]} ${rgb[1]} ${rgb[2]}`;
}

function parseHexColor(hex: string): RgbTuple | null {
  const sanitized = hex.trim().replace(/^#/, '');
  if (!/^[\da-fA-F]+$/.test(sanitized)) return null;

  if (sanitized.length === 3) {
    return [
      parseInt(`${sanitized[0]}${sanitized[0]}`, 16),
      parseInt(`${sanitized[1]}${sanitized[1]}`, 16),
      parseInt(`${sanitized[2]}${sanitized[2]}`, 16),
    ];
  }

  if (sanitized.length === 6) {
    return [
      parseInt(sanitized.slice(0, 2), 16),
      parseInt(sanitized.slice(2, 4), 16),
      parseInt(sanitized.slice(4, 6), 16),
    ];
  }

  return null;
}

function mixRgb(base: RgbTuple, target: RgbTuple, weight: number): RgbTuple {
  return [
    clampChannel(base[0] * (1 - weight) + target[0] * weight),
    clampChannel(base[1] * (1 - weight) + target[1] * weight),
    clampChannel(base[2] * (1 - weight) + target[2] * weight),
  ];
}

// Generate color palette from base color
function generatePalette(baseHex: string): Record<string, string> {
  const fallbackRgb = parseHexColor(DEFAULT_PRIMARY_COLOR) ?? WHITE;
  const baseRgb = parseHexColor(baseHex) ?? fallbackRgb;

  return Object.fromEntries(
    Object.entries(PALETTE_MIXES).map(([shade, config]) => {
      if (shade === '500') return [shade, rgbToCssVar(baseRgb)];
      return [shade, rgbToCssVar(mixRgb(baseRgb, config.target, config.weight))];
    })
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

  Object.entries(palette).forEach(([shade, rgb]) => {
    root.style.setProperty(`--color-primary-${shade}`, rgb);
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { company, appUser, updateAppUserTheme } = useAuthStore();

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'system';
    }
    return 'system';
  });

  const [primaryColor, setPrimaryColorState] = useState<string>(() => {
    return DEFAULT_PRIMARY_COLOR;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Update theme settings when user or company settings change
  useEffect(() => {
    if (appUser?.theme) {
      setThemeState(appUser.theme as Theme);
    } else if (company?.theme_preference) {
      setThemeState(company.theme_preference as Theme);
    }

    setPrimaryColorState(company?.primary_color || DEFAULT_PRIMARY_COLOR);
  }, [appUser, company]);

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
  }, [primaryColor]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    updateAppUserTheme(newTheme);
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
