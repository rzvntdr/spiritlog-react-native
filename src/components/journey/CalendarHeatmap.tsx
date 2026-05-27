import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, Pressable, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { MeditationSession } from '../../types/session';
import { buildMonthHeatmapData } from '../../utils/chartHelpers';
import { radius, spacing, typography } from '../../theme/scale';

interface Props {
  sessions: MeditationSession[];
  presetNameMap: Map<string, string>;
  // TODO: Q2 — pass protected days once freeze/grace logic is implemented
  // protectedDays?: Map<string, 'grace' | 'freeze'>;
}

type DayStatus =
  | { kind: 'session'; durationMs: number; minutes: number }
  | { kind: 'protected'; reason: 'grace' | 'freeze' }
  | { kind: 'empty' };

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const GAP = 4;
const PADDING = 4;

function sessionOpacity(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes <= 5) return 0.25;
  if (minutes <= 15) return 0.45;
  if (minutes <= 30) return 0.70;
  if (minutes <= 45) return 0.85;
  return 1;
}

export default function CalendarHeatmap({ sessions, presetNameMap }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dismissTimer, setDismissTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const cellSize = containerWidth > 0
    ? (containerWidth - 2 * PADDING - 6 * GAP) / 7
    : 0;

  const heatmapData = useMemo(
    () => buildMonthHeatmapData(sessions, currentMonth),
    [sessions, currentMonth]
  );

  const { sessionCountMap, presetNamesMap } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const startMs = new Date(year, month, 1).getTime();
    const endMs = new Date(year, month + 1, 1).getTime();
    const countMap = new Map<string, number>();
    const namesMap = new Map<string, Set<string>>();
    for (const s of sessions) {
      if (s.date >= startMs && s.date < endMs) {
        const d = new Date(s.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        countMap.set(key, (countMap.get(key) ?? 0) + 1);
        if (!namesMap.has(key)) namesMap.set(key, new Set());
        const name = s.presetId
          ? (presetNameMap.get(s.presetId) ?? 'Deleted preset')
          : 'Free session';
        namesMap.get(key)!.add(name);
      }
    }
    return { sessionCountMap: countMap, presetNamesMap: namesMap };
  }, [sessions, currentMonth, presetNameMap]);

  const grid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const rows: (number | null)[][] = [];
    let week: (number | null)[] = Array(startDow).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        rows.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      rows.push(week);
    }
    return rows;
  }, [currentMonth]);

  const prevMonth = () => {
    setSelectedDay(null);
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setSelectedDay(null);
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const now = new Date();
  const isCurrentMonth = currentMonth.getFullYear() === now.getFullYear() && currentMonth.getMonth() === now.getMonth();
  const monthLabel = `${MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  const dateKeyForDay = (day: number): string => {
    const m = currentMonth.getMonth() + 1;
    return `${currentMonth.getFullYear()}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getDayStatus = (day: number): DayStatus => {
    const key = dateKeyForDay(day);
    const minutes = heatmapData.get(key) ?? 0;
    if (minutes > 0) {
      return { kind: 'session', durationMs: minutes * 60000, minutes };
    }
    // TODO: Q2 — check protectedDays here when freeze/grace logic is implemented
    return { kind: 'empty' };
  };

  const handleDayPress = (day: number) => {
    if (dismissTimer) clearTimeout(dismissTimer);
    if (selectedDay === day) {
      setSelectedDay(null);
      return;
    }
    setSelectedDay(day);
    const timer = setTimeout(() => setSelectedDay(null), 3000);
    setDismissTimer(timer);
  };

  useEffect(() => {
    return () => {
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [dismissTimer]);

  const selectedKey = selectedDay !== null ? dateKeyForDay(selectedDay) : null;
  const selectedStatus = selectedDay !== null ? getDayStatus(selectedDay) : null;
  const selectedMins = selectedKey ? (heatmapData.get(selectedKey) ?? 0) : 0;
  const selectedCount = selectedKey ? (sessionCountMap.get(selectedKey) ?? 0) : 0;
  const selectedNames = selectedKey ? [...(presetNamesMap.get(selectedKey) ?? [])] : [];

  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.card, padding: spacing.base, marginBottom: spacing.md }}>
      {/* Month header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Pressable onPress={prevMonth} hitSlop={12} style={{ padding: 4 }}>
          <Text style={{ fontSize: 18, color: c.onSurface }}>{'<'}</Text>
        </Pressable>
        <Text style={[typography.bodyEm, { color: c.onBackground }]}>{monthLabel}</Text>
        <Pressable onPress={nextMonth} hitSlop={12} style={{ padding: 4 }} disabled={isCurrentMonth}>
          <Text style={{ fontSize: 18, color: isCurrentMonth ? c.line : c.onSurface }}>{'>'}</Text>
        </Pressable>
      </View>

      {/* Tooltip panel */}
      <View style={{ backgroundColor: c.surface2, borderRadius: radius.md, padding: spacing.sm + 2, marginBottom: spacing.sm, minHeight: 48, justifyContent: 'center' }}>
        {selectedDay !== null && selectedStatus !== null ? (() => {
          if (selectedStatus.kind === 'protected') {
            const reasonLabel = selectedStatus.reason === 'grace' ? 'Grace day' : `Freeze used · 1 remaining`;
            return (
              <Text style={[typography.body, { color: c.textDim }]}>
                🛡 {reasonLabel}
              </Text>
            );
          }
          if (selectedStatus.kind === 'session') {
            return (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[typography.bodyEm, { color: c.onBackground }]}>
                    {MONTHS[currentMonth.getMonth()]} {selectedDay}, {currentMonth.getFullYear()}
                  </Text>
                  <Text style={[typography.bodyEm, { color: c.accent }]}>
                    {selectedMins} min · {selectedCount} {selectedCount === 1 ? 'session' : 'sessions'}
                  </Text>
                </View>
                {selectedNames.length > 0 && (
                  <Text style={[typography.meta, { color: c.textMute, marginTop: 2 }]} numberOfLines={1}>
                    {selectedNames.join(', ')}
                  </Text>
                )}
              </>
            );
          }
          return (
            <Text style={[typography.meta, { color: c.textMute }]}>No session this day</Text>
          );
        })() : (
          <Text style={[typography.meta, { color: c.textMute }]}>Tap a day to see details</Text>
        )}
      </View>

      <View onLayout={onLayout} style={{ padding: PADDING }}>
        {cellSize > 0 && (
          <>
            {/* Weekday headers */}
            <View style={{ flexDirection: 'row', gap: GAP, marginBottom: 6 }}>
              {WEEKDAYS.map((d) => (
                <View key={d} style={{ width: cellSize, alignItems: 'center' }}>
                  <Text style={[typography.micro, { color: c.textMute }]}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Day grid */}
            {grid.map((week, rowIdx) => (
              <View key={rowIdx} style={{ flexDirection: 'row', gap: GAP, marginBottom: GAP }}>
                {week.map((day, colIdx) => {
                  if (day === null) {
                    return <View key={colIdx} style={{ width: cellSize, height: cellSize }} />;
                  }

                  const status = getDayStatus(day);
                  const isSelected = selectedDay === day;

                  let bgColor: string;
                  let opacity: number;

                  if (status.kind === 'session') {
                    bgColor = c.accent;
                    opacity = sessionOpacity(status.minutes);
                  } else if (status.kind === 'protected') {
                    bgColor = `rgba(92,196,209,0.32)`;
                    opacity = 1;
                  } else {
                    bgColor = c.surface2;
                    opacity = 1;
                  }

                  const textColor =
                    status.kind === 'session' && sessionOpacity(status.minutes) > 0.55 ? '#fff' :
                    status.kind === 'protected' ? c.textDim :
                    c.textMute;

                  return (
                    <Pressable
                      key={colIdx}
                      onPress={() => handleDayPress(day)}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: radius.sm,
                        backgroundColor: bgColor,
                        opacity,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: isSelected ? 1.5 : 0,
                        borderColor: isSelected ? c.accent : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: cellSize > 36 ? 11 : 9, color: textColor }}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}

            {/* Legend */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: spacing.xs, gap: 4 }}>
              <Text style={[typography.micro, { color: c.textMute, marginRight: 4 }]}>Less</Text>
              {[0.25, 0.45, 0.70, 0.85, 1].map((op, i) => (
                <View
                  key={i}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: c.accent,
                    opacity: op,
                  }}
                />
              ))}
              <Text style={[typography.micro, { color: c.textMute, marginLeft: 4 }]}>More</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
