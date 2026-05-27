import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/scale';

interface Props {
  bestStreak: number;
  longestSession: number;
  totalMinutes: number;
  totalSessions: number;
}

function formatHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface RecordCardProps {
  label: string;
  value: string;
  emoji: string;
}

function RecordCard({ label, value, emoji }: RecordCardProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.card, { backgroundColor: c.surface2 }]}>
      <Text style={[typography.meta, { color: c.textMute, marginBottom: spacing.xs }]}>{label}</Text>
      <Text style={[styles.value, { color: c.onBackground }]}>{value}</Text>
      <Text style={styles.emoji}>{emoji}</Text>
    </View>
  );
}

export default function RecordsPanel({ bestStreak, longestSession, totalMinutes, totalSessions }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: c.surface }]}>
      <Text style={[typography.label, { color: c.textMute, marginBottom: spacing.md }]}>Best ever</Text>
      <View style={styles.grid}>
        <RecordCard label="Longest streak" value={bestStreak > 0 ? `${bestStreak}d` : '—'} emoji="🔥" />
        <RecordCard label="Longest session" value={longestSession > 0 ? formatMinutes(longestSession) : '—'} emoji="⏱" />
        <RecordCard label="Total practiced" value={totalMinutes > 0 ? formatHours(totalMinutes) : '—'} emoji="🧘" />
        <RecordCard label="Total sessions" value={totalSessions > 0 ? String(totalSessions) : '—'} emoji="✦" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: '47%',
    borderRadius: radius.md,
    padding: spacing.base,
    position: 'relative',
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  emoji: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    fontSize: 16,
    opacity: 0.4,
  },
});
