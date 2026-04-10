import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';
import { useSessionStore } from '../stores/sessionStore';
import { formatDuration } from '../utils/time';
import { MeditationSession } from '../types/session';

type Props = NativeStackScreenProps<RootStackParamList, 'Journey'>;
type TimeRange = 'week' | 'month' | '3months' | 'year';

function getRangeStartMs(range: TimeRange): number {
  const now = new Date();
  switch (range) {
    case 'week': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      monday.setHours(0, 0, 0, 0);
      return monday.getTime();
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return start.getTime();
    }
    case '3months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return start.getTime();
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return start.getTime();
    }
  }
}

function formatSessionDate(timestamp: number): string {
  const d = new Date(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const h12 = hours % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${h12}:${minutes} ${ampm}`;
}

// Simple bar chart component
function ProgressChart({
  sessions,
  range,
  colors,
}: {
  sessions: MeditationSession[];
  range: TimeRange;
  colors: ReturnType<typeof useTheme>['theme']['colors'];
}) {
  // Group sessions by day
  const dailyMinutes = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      map.set(key, (map.get(key) ?? 0) + s.duration);
    }

    // Generate labels
    const now = new Date();
    let days: Date[];
    if (range === 'week') {
      days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        const day = d.getDay();
        const diff = day === 0 ? 6 : day - 1;
        d.setDate(d.getDate() - diff + i);
        return d;
      });
    } else {
      // For month/3month/year, show last 7 periods
      const count = range === 'month' ? 4 : range === '3months' ? 12 : 12;
      days = Array.from({ length: Math.min(count, 7) }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (Math.min(count, 7) - 1 - i));
        return d;
      });
    }

    return days.map((d) => {
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      return { label: dayNames[d.getDay()], minutes: map.get(key) ?? 0 };
    });
  }, [sessions, range]);

  const maxMinutes = Math.max(...dailyMinutes.map((d) => d.minutes), 1);

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.onBackground, marginBottom: 12 }}>
        Progress
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 120 }}>
        {dailyMinutes.map((day, i) => {
          const barHeight = day.minutes > 0 ? Math.max((day.minutes / maxMinutes) * 100, 4) : 0;
          return (
            <View key={i} style={{ alignItems: 'center', flex: 1 }}>
              {day.minutes > 0 && (
                <Text style={{ fontSize: 9, color: colors.onSurface, marginBottom: 2 }}>
                  {day.minutes}m
                </Text>
              )}
              <View
                style={{
                  width: 20,
                  height: barHeight,
                  backgroundColor: day.minutes > 0 ? colors.accent : colors.surfaceVariant,
                  borderRadius: 4,
                }}
              />
              <Text style={{ fontSize: 11, color: colors.onSurface, marginTop: 6 }}>{day.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function JourneyScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [range, setRange] = useState<TimeRange>('week');

  const loadSessions = useSessionStore((s) => s.loadSessions);
  const loadStats = useSessionStore((s) => s.loadStats);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const sessions = useSessionStore((s) => s.sessions);
  const stats = useSessionStore((s) => s.stats);
  const isLoaded = useSessionStore((s) => s.isLoaded);

  useEffect(() => {
    loadSessions();
    loadStats();
  }, []);

  // Filter sessions by range
  const filteredSessions = useMemo(() => {
    const startMs = getRangeStartMs(range);
    return sessions.filter((s) => s.date >= startMs);
  }, [sessions, range]);

  const ranges: { key: TimeRange; label: string }[] = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: '3months', label: '3 Months' },
    { key: 'year', label: 'Year' },
  ];

  const statCards: { label: string; value: string; color: string }[] = [
    { label: 'Total Time', value: formatDuration(stats.totalMinutes), color: '#4DAAAA' },
    { label: 'Day Streak', value: String(stats.currentStreak), color: '#C8954C' },
    { label: 'Sessions', value: String(stats.totalSessions), color: '#6AAF6A' },
    { label: 'Average', value: stats.avgDuration > 0 ? formatDuration(stats.avgDuration) : '0m', color: '#9B8AFB' },
  ];

  type ListItem =
    | { type: 'stats' }
    | { type: 'range' }
    | { type: 'chart' }
    | { type: 'sessionsHeader' }
    | { type: 'session'; session: MeditationSession }
    | { type: 'empty' };

  const data: ListItem[] = [
    { type: 'stats' },
    { type: 'range' },
    { type: 'chart' },
    { type: 'sessionsHeader' },
  ];

  if (filteredSessions.length > 0) {
    // Show last 20 sessions
    filteredSessions.slice(0, 20).forEach((session) => data.push({ type: 'session', session }));
  } else {
    data.push({ type: 'empty' });
  }

  const handleDeleteSession = useCallback((session: MeditationSession) => {
    Alert.alert(
      'Delete Session',
      `Delete the ${session.duration} min session from ${formatSessionDate(session.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSession(session.id);
            loadStats();
          },
        },
      ],
    );
  }, [deleteSession, loadStats]);

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'stats':
        return (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {statCards.map((stat) => (
              <View
                key={stat.label}
                style={{
                  width: '48%',
                  backgroundColor: c.surface,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <Text style={{ fontSize: 22, fontWeight: '700', color: stat.color }}>{stat.value}</Text>
                <Text style={{ fontSize: 11, color: c.onSurface, marginTop: 2 }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        );

      case 'range':
        return (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {ranges.map((r) => (
              <Pressable
                key={r.key}
                onPress={() => setRange(r.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: range === r.key ? c.primaryContainer : c.surface,
                }}
              >
                <Text
                  style={{
                    color: range === r.key ? c.onPrimary : c.onSurface,
                    fontWeight: '600',
                    fontSize: 13,
                  }}
                >
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>
        );

      case 'chart':
        return <ProgressChart sessions={filteredSessions} range={range} colors={c} />;

      case 'sessionsHeader':
        return (
          <Text style={{ fontSize: 16, fontWeight: '600', color: c.onBackground, marginBottom: 10 }}>
            Recent Sessions
          </Text>
        );

      case 'session':
        return (
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: 12,
              padding: 14,
              marginBottom: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: c.surfaceVariant,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 16 }}>💧</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.onBackground, fontSize: 14 }}>
                {formatSessionDate(item.session.date)}
              </Text>
            </View>
            <Text style={{ color: c.accent, fontWeight: '700', fontSize: 15, marginRight: 12 }}>
              {item.session.duration} min
            </Text>
            <Pressable onPress={() => handleDeleteSession(item.session)} hitSlop={8}>
              <Text style={{ color: c.error, fontSize: 18 }}>✕</Text>
            </Pressable>
          </View>
        );

      case 'empty':
        return (
          <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 20, alignItems: 'center' }}>
            <Text style={{ color: c.onSurface }}>No sessions in this time range</Text>
          </View>
        );
    }
  };

  if (!isLoaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={c.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={{ fontSize: 24, color: c.onSurface }}>←</Text>
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: c.onBackground }}>
          Your Journey
        </Text>
        <Pressable hitSlop={8}>
          <Text style={{ fontSize: 20, color: c.onSurface }}>↗</Text>
        </Pressable>
      </View>

      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item, index) => {
          if (item.type === 'session') return item.session.id;
          return `${item.type}-${index}`;
        }}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}
