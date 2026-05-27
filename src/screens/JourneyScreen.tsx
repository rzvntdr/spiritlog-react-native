import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/navigation';
import { useTheme } from '../theme/ThemeContext';
import { usePresetStore } from '../stores/presetStore';
import { useSessionStore } from '../stores/sessionStore';
import { MeditationSession } from '../types/session';
import { PresetTimer } from '../types/preset';
import { radius, spacing, typography } from '../theme/scale';
import CalendarHeatmap from '../components/journey/CalendarHeatmap';
import DurationLineChart from '../components/journey/DurationLineChart';
import RecordsPanel from '../components/journey/RecordsPanel';
import PatternsCard from '../components/journey/PatternsCard';

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

function firstPhaseEmoji(preset: PresetTimer | undefined): string {
  if (!preset) return '🧘';
  const first = preset.elements.find((el) => el.kind === 'duration');
  if (!first || first.kind !== 'duration') return '🧘';
  if (first.type === 'WARMUP') return '🌅';
  if (first.type === 'INFINITE') return '∞';
  return '🧘';
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
    for (const p of presets) map.set(p.id, p.name);
    return map;
  }, [presets]);

  const presetMap = useMemo(() => {
    const map = new Map<string, PresetTimer>();
    for (const p of presets) map.set(p.id, p);
    return map;
  }, [presets]);

  useEffect(() => {
    loadSessions();
    loadStats();
  }, []);

  type ListItem =
    | { type: 'records' }
    | { type: 'heatmap' }
    | { type: 'lineChart' }
    | { type: 'patterns' }
    | { type: 'sessionsHeader' }
    | { type: 'session'; session: MeditationSession }
    | { type: 'empty' };

  const data: ListItem[] = [
    { type: 'records' },
    { type: 'heatmap' },
    { type: 'lineChart' },
    { type: 'patterns' },
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
      case 'records':
        return (
          <RecordsPanel
            bestStreak={stats.bestStreak ?? 0}
            longestSession={stats.longestSession ?? 0}
            totalMinutes={stats.totalMinutes}
            totalSessions={stats.totalSessions}
          />
        );

      case 'heatmap':
        return <CalendarHeatmap sessions={sessions} presetNameMap={presetNameMap} />;

      case 'lineChart':
        return <DurationLineChart sessions={sessions} presetNameMap={presetNameMap} />;

      case 'patterns':
        return <PatternsCard sessions={sessions} />;

      case 'sessionsHeader':
        return (
          <Text style={[typography.section, { color: c.onBackground, marginBottom: spacing.sm }]}>
            Recent Sessions
          </Text>
        );

      case 'session': {
        const preset = item.session.presetId ? presetMap.get(item.session.presetId) : undefined;
        const emoji = firstPhaseEmoji(preset);
        const presetName = item.session.presetId
          ? (presetNameMap.get(item.session.presetId) ?? 'Deleted preset')
          : 'Free session';
        return (
          <Pressable
            onLongPress={() => handleDeleteSession(item.session)}
            delayLongPress={500}
            style={{
              backgroundColor: c.surface,
              borderRadius: radius.card,
              padding: spacing.base,
              marginBottom: spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <View style={{
              width: 36,
              height: 36,
              borderRadius: radius.full,
              backgroundColor: c.surface2,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 16 }}>{emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyEm, { color: c.onBackground }]} numberOfLines={1}>
                {presetName}
              </Text>
              <Text style={[typography.meta, { color: c.textMute, marginTop: 2 }]}>
                {formatSessionDate(item.session.date)}
              </Text>
            </View>
            <Text style={[typography.bodyEm, { color: c.accent }]}>
              {item.session.duration} min
            </Text>
          </Pressable>
        );
      }

      case 'empty':
        return (
          <View style={{ backgroundColor: c.surface, borderRadius: radius.card, padding: spacing.xl, alignItems: 'center' }}>
            <Text style={[typography.body, { color: c.textMute, fontStyle: 'italic' }]}>
              No sessions yet — start your first meditation
            </Text>
          </View>
        );
    }
  };

  if (!isLoaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={c.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.sm }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={{ fontSize: 22, color: c.textDim }}>←</Text>
        </Pressable>
        <Text style={[typography.title, { flex: 1, textAlign: 'center', color: c.onBackground }]}>
          Your Journey
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item, index) => {
          if (item.type === 'session') return item.session.id;
          return `${item.type}-${index}`;
        }}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 80 }}
      />
    </SafeAreaView>
  );
}
