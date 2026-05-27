import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/scale';
import { formatDuration } from '../../utils/time';

type Props = {
  totalMinutes: number;
  avgMinutes: number;
};

export default function HomeStats({ totalMinutes, avgMinutes }: Props) {
  if (totalMinutes === 0 && avgMinutes === 0) return null;

  return (
    <View style={styles.row}>
      <StatTile label="Total practice" value={formatDuration(totalMinutes)} />
      <StatTile label="Avg session" value={formatDuration(avgMinutes)} />
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.tile, { backgroundColor: c.surface }]}>
      <Text style={[typography.title, { color: c.onBackground, fontSize: 28 }]}>{value}</Text>
      <Text style={[typography.meta, { color: c.textMute, marginTop: spacing.xs - 2 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
  },
});
