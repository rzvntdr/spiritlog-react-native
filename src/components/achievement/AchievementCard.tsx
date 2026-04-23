import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Achievement, Tier } from '../../types/achievement';
import { useTheme } from '../../theme/ThemeContext';
import TierBadge, { TIER_COLORS } from './TierBadge';

interface Props {
  achievement: Achievement;
  unlockedTiers: Set<Tier>;
  currentValue?: number; // for tiered progress display
  onPress?: () => void;
}

const TIER_ORDER: Array<'bronze' | 'silver' | 'gold'> = ['bronze', 'silver', 'gold'];

function formatWindowDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AchievementCard({
  achievement,
  unlockedTiers,
  currentValue,
  onPress,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const seasonalEnd =
    achievement.kind === 'single' ? achievement.seasonalWindowEnd : undefined;
  const isUnlocked =
    achievement.kind === 'single'
      ? unlockedTiers.has('single')
      : unlockedTiers.size > 0;

  const now = Date.now();
  const isMissed = !!seasonalEnd && !isUnlocked && seasonalEnd.getTime() < now;
  const isUpcoming = !!seasonalEnd && !isUnlocked && seasonalEnd.getTime() >= now;

  let accentColor = c.primary;
  if (achievement.kind === 'tiered') {
    if (unlockedTiers.has('gold')) accentColor = TIER_COLORS.gold;
    else if (unlockedTiers.has('silver')) accentColor = TIER_COLORS.silver;
    else if (unlockedTiers.has('bronze')) accentColor = TIER_COLORS.bronze;
  }

  const opacity = isMissed ? 0.4 : isUnlocked ? 1 : 0.55;

  let progress: { label: string; pct: number } | null = null;
  if (achievement.kind === 'tiered' && typeof currentValue === 'number') {
    const nextTier = TIER_ORDER.find((t) => !unlockedTiers.has(t));
    if (nextTier) {
      const target = achievement.tiers[nextTier];
      const prevIdx = TIER_ORDER.indexOf(nextTier) - 1;
      const base = prevIdx >= 0 ? achievement.tiers[TIER_ORDER[prevIdx]] : 0;
      const clampedValue = Math.min(currentValue, target);
      const span = target - base || 1;
      progress = {
        label: `${currentValue} / ${target} ${achievement.metricLabel}`,
        pct: Math.max(0, Math.min(1, (clampedValue - base) / span)),
      };
    } else {
      progress = {
        label: `${currentValue}+ ${achievement.metricLabel}`,
        pct: 1,
      };
    }
  }

  return (
    <Pressable
      onPress={isMissed ? undefined : onPress}
      disabled={isMissed}
      style={{
        flex: 1,
        backgroundColor: c.surface,
        borderRadius: 12,
        padding: 12,
        margin: 4,
        opacity,
        borderWidth: isUnlocked ? 2 : isMissed ? 1 : 0,
        borderColor: isUnlocked ? accentColor : isMissed ? c.error : 'transparent',
      }}
    >
      <View style={{ alignItems: 'center', marginBottom: 6 }}>
        <Text
          style={{
            fontSize: 36,
            marginBottom: 4,
            opacity: isUnlocked ? 1 : isMissed ? 0.35 : 0.6,
          }}
        >
          {achievement.icon}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: c.onBackground,
            textAlign: 'center',
            textDecorationLine: isMissed ? 'line-through' : 'none',
          }}
        >
          {achievement.name}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            fontSize: 11,
            color: c.onSurface,
            textAlign: 'center',
            marginTop: 2,
            minHeight: 28,
          }}
        >
          {achievement.description}
        </Text>
      </View>

      {achievement.kind === 'tiered' && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4 }}>
          {TIER_ORDER.map((t) => (
            <TierBadge key={t} tier={t} unlocked={unlockedTiers.has(t)} size={14} />
          ))}
        </View>
      )}

      {progress && (
        <View style={{ marginTop: 8 }}>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: c.surfaceVariant,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 4,
                width: `${progress.pct * 100}%`,
                backgroundColor: accentColor,
              }}
            />
          </View>
          <Text style={{ fontSize: 10, color: c.onSurface, textAlign: 'center', marginTop: 3 }}>
            {progress.label}
          </Text>
        </View>
      )}

      {isMissed && (
        <Text style={{ fontSize: 10, color: c.error, textAlign: 'center', marginTop: 6, fontWeight: '600' }}>
          MISSED
        </Text>
      )}
      {isUpcoming && seasonalEnd && (
        <Text style={{ fontSize: 10, color: c.accent, textAlign: 'center', marginTop: 6, fontWeight: '600' }}>
          📅 Unlocks {formatWindowDate(seasonalEnd)}
        </Text>
      )}
    </Pressable>
  );
}
