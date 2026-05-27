import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/scale';
import { streakTierFor, streakVisuals, StreakTier } from '../../utils/streakTier';
import { ThemeColors } from '../../theme/tokens';

type Props = {
  currentStreak: number;
  freezesAvailable: number;
};

// Deterministic sparkle positions — never random per render
const SPARKLE_SLOTS: ViewStyle[] = [
  { top: 14,  left:  '12%' },
  { top: 14,  right: '12%' },
  { bottom: 18, left: '18%' },
  { bottom: 18, right: '18%' },
  { top: 55,  left:  10    },
  { top: 55,  right: 10    },
  { top: 24,  left:  '44%' },
  { bottom: 28, right: '38%' },
];

const SPARKLE_CHARS = ['✦', '✧', '✦', '✧', '✦', '✧', '✧', '✦'];

function tierGlowColor(tier: StreakTier, c: ThemeColors): string {
  switch (tier) {
    case 'ember':
    case 'seed':
      return c.warmup;
    case 'spark':
    case 'sprout':
      return c.accent;
    case 'bud':
    case 'bloom':
      return c.warmBright;
    case 'flourish':
    case 'radiance':
    case 'year':
    case 'aurora':
      return c.gold;
  }
}

function tierNumberColor(tier: StreakTier, c: ThemeColors): string {
  switch (tier) {
    case 'ember':
    case 'seed':
    case 'spark':
    case 'sprout':
      return c.onBackground;
    case 'bud':
    case 'bloom':
      return c.warmBright;
    case 'flourish':
    case 'radiance':
      return c.gold;
    case 'year':
    case 'aurora':
      return c.goldPale;
  }
}

function tierBorderColor(tier: StreakTier, c: ThemeColors, opacity: number): string {
  const base = tierGlowColor(tier, c);
  // Convert hex to rgba — base is always a 6-digit hex from our palette
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

export default function StreakHero({ currentStreak, freezesAvailable }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const tier = streakTierFor(currentStreak);
  const visuals = streakVisuals(currentStreak);
  const glowColor = tierGlowColor(tier, c);
  const numberColor = tierNumberColor(tier, c);
  const borderColor = tierBorderColor(tier, c, visuals.borderOpacity);

  const sparkleCount = visuals.sparkleCount;
  const sparkleColor = tierBorderColor(tier, c, 0.55);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.surface2,
          borderColor,
        },
      ]}
    >
      {/* Glow circle — large, centered */}
      <View
        style={[
          styles.glowLarge,
          {
            backgroundColor: glowColor,
            opacity: visuals.glowOpacity,
          },
        ]}
      />
      {/* Glow circle — small, offset bottom-right */}
      <View
        style={[
          styles.glowSmall,
          {
            backgroundColor: glowColor,
            opacity: visuals.glowOpacity * 0.6,
          },
        ]}
      />

      {/* Sparkles */}
      {SPARKLE_SLOTS.slice(0, sparkleCount).map((pos, i) => (
        <Text
          key={i}
          style={[
            styles.sparkle,
            pos,
            {
              color: sparkleColor,
              fontSize: i % 2 === 0 ? 11 : 8,
            },
          ]}
        >
          {SPARKLE_CHARS[i]}
        </Text>
      ))}

      {/* Content */}
      <View style={styles.content} pointerEvents="none">
        <Text style={styles.flame}>🔥</Text>
        <Text
          style={[
            styles.number,
            { color: numberColor },
          ]}
        >
          {currentStreak}
        </Text>
        <Text style={[typography.micro, { color: c.textMute, letterSpacing: 1.2 }]}>
          {currentStreak === 1 ? 'DAY IN A ROW' : 'DAYS IN A ROW'}
        </Text>
        {freezesAvailable > 0 && (
          <Text style={[typography.meta, { color: c.textDim, marginTop: spacing.xs }]}>
            🛡 {freezesAvailable} {freezesAvailable === 1 ? 'freeze' : 'freezes'} available
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 170,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  glowLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -80,
    alignSelf: 'center',
  },
  glowSmall: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    bottom: -50,
    right: -20,
  },
  sparkle: {
    position: 'absolute',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  flame: {
    fontSize: 34,
    marginBottom: 2,
  },
  number: {
    fontSize: 54,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    lineHeight: 58,
  },
});
