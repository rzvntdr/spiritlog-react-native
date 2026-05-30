import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { streakVisuals, StreakTier } from '../../../utils/streakTier';
import { StreakArtProps } from './types';
import { ThemeColors } from '../../../theme/tokens';

// Deterministic sparkle positions — never random per render
const SPARKLE_SLOTS: ViewStyle[] = [
  { top: 14, left: '12%' },
  { top: 14, right: '12%' },
  { bottom: 18, left: '18%' },
  { bottom: 18, right: '18%' },
  { top: 55, left: 10 },
  { top: 55, right: 10 },
  { top: 24, left: '44%' },
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

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

export default function ClassicArt({ tier, days, c }: StreakArtProps) {
  const visuals = streakVisuals(days);
  const glowColor = tierGlowColor(tier, c);
  const sparkleColor = hexToRgba(glowColor, 0.55);

  return (
    <>
      <View style={[styles.glowLarge, { backgroundColor: glowColor, opacity: visuals.glowOpacity }]} />
      <View style={[styles.glowSmall, { backgroundColor: glowColor, opacity: visuals.glowOpacity * 0.6 }]} />
      {SPARKLE_SLOTS.slice(0, visuals.sparkleCount).map((pos, i) => (
        <Text
          key={i}
          style={[
            styles.sparkle,
            pos,
            { color: sparkleColor, fontSize: i % 2 === 0 ? 11 : 8 },
          ]}
        >
          {SPARKLE_CHARS[i]}
        </Text>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
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
});
