import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { vars } from 'nativewind';
import { Theme, ThemeColors } from './tokens';
import { oceanTheme, getThemeById } from './themes';
import { useSettingsStore } from '../stores/settingsStore';

interface ThemeContextValue {
  theme: Theme;
  setThemeId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: oceanTheme,
  setThemeId: () => {},
});

function colorsToVars(colors: ThemeColors) {
  return vars({
    '--color-background': colors.background,
    '--color-surface': colors.surface,
    '--color-surface-variant': colors.surfaceVariant,
    '--color-primary': colors.primary,
    '--color-primary-container': colors.primaryContainer,
    '--color-on-primary': colors.onPrimary,
    '--color-on-background': colors.onBackground,
    '--color-on-surface': colors.onSurface,
    '--color-accent': colors.accent,
    '--color-warmup': colors.warmup,
    '--color-infinite': colors.infinite,
    '--color-favorite': colors.favorite,
    '--color-error': colors.error,
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeId = useSettingsStore((s) => s.themeId);
  const setThemeIdInStore = useSettingsStore((s) => s.setThemeId);
  const theme = getThemeById(themeId);

  const setThemeId = useCallback(
    (id: string) => {
      setThemeIdInStore(id);
    },
    [setThemeIdInStore]
  );

  return (
    <ThemeContext.Provider value={{ theme, setThemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useThemeVars() {
  const { theme } = useTheme();
  return colorsToVars(theme.colors);
}
