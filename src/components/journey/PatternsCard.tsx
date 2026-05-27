import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/scale';
import { MeditationSession } from '../../types/session';

interface Props {
  sessions: MeditationSession[];
}

const MIN_SESSIONS = 12;

const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_BUCKETS: Array<{ label: string; start: number; end: number }> = [
  { label: 'before 8 AM', start: 0, end: 8 },
  { label: 'in the morning', start: 8, end: 12 },
  { label: 'in the afternoon', start: 12, end: 17 },
  { label: 'in the evening', start: 17, end: 21 },
  { label: 'at night', start: 21, end: 24 },
];

function computeObservations(sessions: MeditationSession[]): string[] {
  if (sessions.length < MIN_SESSIONS) return [];
  const observations: string[] = [];

  // Day-of-week distribution
  const dowCounts = new Array(7).fill(0);
  for (const s of sessions) {
    dowCounts[new Date(s.date).getDay()]++;
  }
  const maxDow = Math.max(...dowCounts);
  const dominantDow = dowCounts.indexOf(maxDow);
  if (maxDow / sessions.length >= 0.25) {
    const dowName = DOW_NAMES[dominantDow];
    // Check time-of-day for that day
    const dowSessions = sessions.filter((s) => new Date(s.date).getDay() === dominantDow);
    const bucketCounts = TIME_BUCKETS.map((b) =>
      dowSessions.filter((s) => {
        const h = new Date(s.date).getHours();
        return h >= b.start && h < b.end;
      }).length
    );
    const maxBucket = Math.max(...bucketCounts);
    const bucketIdx = bucketCounts.indexOf(maxBucket);
    if (maxBucket / dowSessions.length >= 0.5 && dowSessions.length >= 4) {
      observations.push(`Most sessions on ${dowName}s ${TIME_BUCKETS[bucketIdx].label}`);
    } else {
      observations.push(`Most sessions on ${dowName}s`);
    }
  }

  // Time-of-day preference
  if (observations.length < 3) {
    const bucketCounts = TIME_BUCKETS.map((b) =>
      sessions.filter((s) => {
        const h = new Date(s.date).getHours();
        return h >= b.start && h < b.end;
      }).length
    );
    const maxBucket = Math.max(...bucketCounts);
    const bucketIdx = bucketCounts.indexOf(maxBucket);
    if (maxBucket / sessions.length >= 0.6) {
      observations.push(`You tend to meditate ${TIME_BUCKETS[bucketIdx].label}`);
    }
  }

  // Length trend — compare avg of first half vs second half (chronological)
  if (observations.length < 3) {
    const sorted = [...sessions].sort((a, b) => a.date - b.date);
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);
    const avgFirst = firstHalf.reduce((sum, s) => sum + s.duration, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, s) => sum + s.duration, 0) / secondHalf.length;
    const diff = avgSecond - avgFirst;
    // Only positive observations: sessions getting longer
    if (diff > 3 && avgFirst > 0) {
      observations.push('Sessions getting slightly longer over time');
    }
  }

  return observations.slice(0, 3);
}

export default function PatternsCard({ sessions }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const observations = useMemo(() => computeObservations(sessions), [sessions]);

  return (
    <View style={[styles.container, { backgroundColor: c.surface }]}>
      <Text style={[typography.label, { color: c.textMute, marginBottom: spacing.md }]}>Patterns</Text>
      {observations.length === 0 ? (
        <Text style={[typography.meta, { color: c.textMute, fontStyle: 'italic' }]}>
          Keep practicing — patterns will appear once you have more sessions
        </Text>
      ) : (
        observations.map((obs, i) => (
          <View key={i} style={[styles.row, i < observations.length - 1 && { marginBottom: spacing.sm }]}>
            <Text style={styles.dot}>·</Text>
            <Text style={[typography.body, { color: c.onBackground, flex: 1 }]}>{obs}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dot: {
    fontSize: 18,
    lineHeight: 20,
    opacity: 0.4,
  },
});
