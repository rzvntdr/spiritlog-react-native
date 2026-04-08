import { Theme } from './tokens';

export const oceanTheme: Theme = {
  id: 'ocean',
  name: 'Ocean',
  isDark: true,
  colors: {
    background: '#1A2332',
    surface: '#243447',
    surfaceVariant: '#2D3F52',
    primary: '#5F8CA0',
    primaryContainer: '#3A6478',
    onPrimary: '#FFFFFF',
    onBackground: '#E8EDF2',
    onSurface: '#C4CDD6',
    accent: '#6BA3B8',
    warmup: '#C8954C',
    infinite: '#4DAAAA',
    favorite: '#E05555',
    error: '#CF6679',
  },
};

export const midnightTheme: Theme = {
  id: 'midnight',
  name: 'Midnight',
  isDark: true,
  colors: {
    background: '#0D0D1A',
    surface: '#1A1A2E',
    surfaceVariant: '#252540',
    primary: '#7B68EE',
    primaryContainer: '#5B4BC7',
    onPrimary: '#FFFFFF',
    onBackground: '#E0E0F0',
    onSurface: '#A0A0C0',
    accent: '#9B8AFB',
    warmup: '#E0A458',
    infinite: '#5EC4C4',
    favorite: '#FF6B8A',
    error: '#FF6B8A',
  },
};

export const forestTheme: Theme = {
  id: 'forest',
  name: 'Forest',
  isDark: true,
  colors: {
    background: '#1A2318',
    surface: '#253423',
    surfaceVariant: '#2F4030',
    primary: '#6AAF6A',
    primaryContainer: '#4A8A4A',
    onPrimary: '#FFFFFF',
    onBackground: '#E0EDE0',
    onSurface: '#A8C4A8',
    accent: '#7EC87E',
    warmup: '#D4A054',
    infinite: '#5AB8A0',
    favorite: '#E06060',
    error: '#CF6679',
  },
};

export const sunriseTheme: Theme = {
  id: 'sunrise',
  name: 'Sunrise',
  isDark: false,
  colors: {
    background: '#FFF8F0',
    surface: '#FFFFFF',
    surfaceVariant: '#F5EDE4',
    primary: '#D4845A',
    primaryContainer: '#E8A070',
    onPrimary: '#FFFFFF',
    onBackground: '#2C2420',
    onSurface: '#6B5E56',
    accent: '#D4945A',
    warmup: '#CC8844',
    infinite: '#5A9E9E',
    favorite: '#D05050',
    error: '#C04040',
  },
};

export const monochromeTheme: Theme = {
  id: 'monochrome',
  name: 'Monochrome',
  isDark: false,
  colors: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F0F0',
    primary: '#333333',
    primaryContainer: '#555555',
    onPrimary: '#FFFFFF',
    onBackground: '#1A1A1A',
    onSurface: '#666666',
    accent: '#444444',
    warmup: '#AA8844',
    infinite: '#558888',
    favorite: '#CC4444',
    error: '#CC4444',
  },
};

export const allThemes: Theme[] = [
  oceanTheme,
  midnightTheme,
  forestTheme,
  sunriseTheme,
  monochromeTheme,
];

export function getThemeById(id: string): Theme {
  return allThemes.find((t) => t.id === id) ?? oceanTheme;
}
