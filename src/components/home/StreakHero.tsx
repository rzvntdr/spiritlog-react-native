import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/scale';
import { streakTierFor, streakVisuals, StreakTier } from '../../utils/streakTier';
import { ThemeColors } from '../../theme/tokens';
import { renderStreakText, StreakStats } from '../../utils/streakText';
import { getStreakArt, StreakArtStyle } from './streak-art';

type Props = {
  currentStreak: number;
  freezesAvailable: number;
  subtitleTemplate?: string | null;
  bestStreak?: number;
  totalMinutes?: number;
  totalSessions?: number;
  artStyle?: StreakArtStyle;
  /** Reports the streak number's rect (relative to the card) so the parent
   *  can anchor a celebration overlay precisely on/around the number. */
  onNumberRect?: (cx: number, cy: number, w: number, h: number) => void;
};

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
  // Pick a base hex matching the tier's mood (mirror ClassicArt's glow palette)
  let base: string;
  switch (tier) {
    case 'ember':
    case 'seed':
      base = c.warmup;
      break;
    case 'spark':
    case 'sprout':
      base = c.accent;
      break;
    case 'bud':
    case 'bloom':
      base = c.warmBright;
      break;
    default:
      base = c.gold;
  }
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

export default function StreakHero({
  currentStreak,
  freezesAvailable,
  subtitleTemplate = null,
  bestStreak = 0,
  totalMinutes = 0,
  totalSessions = 0,
  artStyle = 'classic',
  onNumberRect,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const cardRef = useRef<View>(null);
  const numberRef = useRef<any>(null);
  const reportNumberRect = () => {
    if (!onNumberRect || !numberRef.current || !cardRef.current) return;
    numberRef.current.measureLayout?.(
      cardRef.current,
      (x: number, y: number, w: number, h: number) => onNumberRect(x + w / 2, y + h / 2, w, h),
      () => {},
    );
  };

  const tier = streakTierFor(currentStreak);
  const visuals = streakVisuals(currentStreak);
  const numberColor = tierNumberColor(tier, c);
  const borderColor = tierBorderColor(tier, c, visuals.borderOpacity);

  const stats: StreakStats = {
    streak: currentStreak,
    best: bestStreak,
    totalMinutes,
    totalSessions,
    freezesAvailable,
  };
  const subtitleText = renderStreakText(subtitleTemplate, stats);

  const ArtComponent = getStreakArt(artStyle);
  const isPlant = artStyle === 'plant';

  // "Pop" the number whenever the displayed streak changes (skip first mount),
  // so each increment reads as a tactile beat even when the delta is just +1.
  const numberScale = useRef(new Animated.Value(1)).current;
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    numberScale.setValue(0.7);
    Animated.spring(numberScale, {
      toValue: 1,
      friction: 4,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [currentStreak, numberScale]);

  return (
    <View
      ref={cardRef}
      style={[
        styles.card,
        {
          backgroundColor: c.surface2,
          borderColor,
        },
      ]}
    >
      <ArtComponent tier={tier} days={currentStreak} c={c} />

      {/* Content — for plant style, keep the column centered but nudged slightly
          right of center (mirror of the old left-of-center position), leaving the
          widened plant its room on the left. */}
      <View
        style={[
          styles.content,
          isPlant && { transform: [{ translateX: 24 }] },
        ]}
        pointerEvents="none"
      >
        {!isPlant && <Text style={styles.flame}>🔥</Text>}
        <Animated.Text
          ref={numberRef}
          onLayout={reportNumberRect}
          style={[styles.number, { color: numberColor, transform: [{ scale: numberScale }] }]}
        >
          {currentStreak}
        </Animated.Text>
        <Text
          style={[
            typography.micro,
            { color: c.textMute, letterSpacing: 1.2 },
          ]}
        >
          {subtitleText}
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
