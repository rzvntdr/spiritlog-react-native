import React from 'react';
import { View, Text } from 'react-native';
import { Tier } from '../../types/achievement';

export const TIER_COLORS: Record<Exclude<Tier, 'single'>, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
};

interface Props {
  tier: Exclude<Tier, 'single'>;
  unlocked: boolean;
  size?: number;
}

export default function TierBadge({ tier, unlocked, size = 16 }: Props) {
  const color = TIER_COLORS[tier];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: unlocked ? color : 'transparent',
        borderWidth: 2,
        borderColor: color,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: unlocked ? 1 : 0.4,
      }}
    >
      {unlocked && (
        <Text style={{ fontSize: size * 0.55, color: '#000' }}>✓</Text>
      )}
    </View>
  );
}
