export interface ThemeColors {
  background: string;
  surface: string;
  surfaceVariant: string;
  primary: string;
  primaryContainer: string;
  onPrimary: string;
  onBackground: string;
  onSurface: string;
  accent: string;
  warmup: string;
  infinite: string;
  favorite: string;
  error: string;
}

export interface Theme {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
}
