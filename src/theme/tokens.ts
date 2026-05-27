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

  // Extended design-system tokens (step 01)
  surface2: string;     // nested card / elevated surface
  surface3: string;     // emphasized surface (icon containers, etc.)
  line: string;         // borders, dividers

  textDim: string;      // secondary text
  textMute: string;     // tertiary / hint text

  tealSoft: string;     // secondary teal (gradients, soft fills)
  tealDeep: string;     // dark teal (active phase backgrounds)

  warmBright: string;   // brighter amber (streak highlight, etc.)
  gold: string;         // gold accent (high-tier streaks)
  goldPale: string;     // pale gold (fill behind gold accents)
}

export interface Theme {
  id: string;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
}
