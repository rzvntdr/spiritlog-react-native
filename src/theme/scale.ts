/**
 * Theme-agnostic design scales for SpiritLog.
 *
 * These values do NOT change between themes (Ocean / Midnight / Calm / etc.).
 * They define typography, spacing, corner radii, and elevation primitives.
 *
 * Theme-DEPENDENT values (colors) live on each Theme in themes.ts.
 *
 * Reference: plans/01-design-tokens.md
 */

export const typography = {
  // Headings
  title:   { fontSize: 30, fontWeight: '600' as const, letterSpacing: -0.5 },
  section: { fontSize: 16, fontWeight: '600' as const },

  // Body
  body:   { fontSize: 13, fontWeight: '400' as const },
  bodyEm: { fontSize: 13, fontWeight: '600' as const },

  // Smaller scales
  meta:  { fontSize: 11, fontWeight: '400' as const },
  micro: { fontSize: 10, fontWeight: '500' as const, letterSpacing: 0.4 },

  // Timer face — tabular numerals so digits don't shift horizontally
  timer: {
    fontSize: 62,
    fontWeight: '300' as const,
    fontVariant: ['tabular-nums'] as const,
  },

  // Section labels (uppercase tracking)
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  },
} as const;

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   24,
  xl:   32,
  xxl:  48,
} as const;

export const radius = {
  sm:   8,    // small inline elements
  md:   14,   // medium components, modals
  card: 18,   // preset cards, large containers
  pill: 30,   // pill buttons, FAB
  full: 999,  // circles
} as const;

/**
 * Elevation primitives. `shadowColor` is intentionally omitted from `fab`
 * because the colored glow should match the current theme's accent —
 * the consumer adds it: `{ ...elevation.fab, shadowColor: theme.colors.teal }`.
 */
export const elevation = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  fab: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
export type TypographyVariant = keyof typeof typography;
