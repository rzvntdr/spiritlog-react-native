import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';
import { usePresetStore } from '../stores/presetStore';
import { useSessionStore } from '../stores/sessionStore';
import { formatDuration } from '../utils/time';
import { MeditationSession } from '../types/session';
import CalendarHeatmap from '../components/journey/CalendarHeatmap';
import DurationLineChart from '../components/journey/DurationLineChart';

type Props = NativeStackScreenProps<RootStackParamList, 'Journey'>;

function formatSessionDate(timestamp: number): string {
  const d = new Date(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const h12 = hours % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${h12}:${minutes} ${ampm}`;
}

export default function JourneyScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const loadSessions = useSessionStore((s) => s.loadSessions);
  const loadStats = useSessionStore((s) => s.loadStats);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const sessions = useSessionStore((s) => s.sessions);
  const stats = useSessionStore((s) => s.stats);
  const isLoaded = useSessionStore((s) => s.isLoaded);
  const presets = usePresetStore((s) => s.presets);

  const presetNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of presets) {
      map.set(p.id, p.name);
    }
    return map;
  }, [presets]);

  useEffect(() => {
    loadSessions();
    loadStats();
  }, []);

  const statCards: { label: string; value: string; color: string }[] = [
    { label: 'Total Time', value: formatDuration(stats.totalMinutes), color: '#4DAAAA' },
    { label: 'Day Streak', value: String(stats.currentStreak), color: '#C8954C' },
    { label: 'Sessions', value: String(stats.totalSessions), color: '#6AAF6A' },
    { label: 'Average', value: stats.avgDuration > 0 ? formatDuration(stats.avgDuration) : '0m', color: '#9B8AFB' },
  ];

  type ListItem =
    | { type: 'stats' }
    | { type: 'heatmap' }
    | { type: 'lineChart' }
    | { type: 'sessionsHeader' }
    | { type: 'session'; session: MeditationSession }
    | { type: 'empty' };

  const data: ListItem[] = [
    { type: 'stats' },
    { type: 'heatmap' },
    { type: 'lineChart' },
    { type: 'sessionsHeader' },
  ];

  const recentSessions = sessions.slice(0, 20);
  if (recentSessions.length > 0) {
    recentSessions.forEach((session) => data.push({ type: 'session', session }));
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

      case 'heatmap':
        return <CalendarHeatmap sessions={sessions} presetNameMap={presetNameMap} />;

      case 'lineChart':
        return <DurationLineChart sessions={sessions} presetNameMap={presetNameMap} />;

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
              <Text style={{ fontSize: 16 }}>🧘</Text>
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
