import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { MeditationSession } from '../../types/session';
import { buildMonthHeatmapData } from '../../utils/chartHelpers';

interface Props {
  sessions: MeditationSession[];
  presetNameMap: Map<string, string>;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const GAP = 4;
const PADDING = 4;

function getIntensityOpacity(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes <= 10) return 0.3;
  if (minutes <= 20) return 0.55;
  if (minutes <= 30) return 0.75;
  return 1;
}

export default function CalendarHeatmap({ sessions, presetNameMap }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

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

    // Monday = 0, Sunday = 6
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

  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      {/* Month header with navigation */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Pressable onPress={prevMonth} hitSlop={12} style={{ padding: 4 }}>
          <Text style={{ fontSize: 18, color: c.onSurface }}>{'<'}</Text>
        </Pressable>
        <Text style={{ fontSize: 15, fontWeight: '600', color: c.onBackground }}>{monthLabel}</Text>
        <Pressable onPress={nextMonth} hitSlop={12} style={{ padding: 4 }} disabled={isCurrentMonth}>
          <Text style={{ fontSize: 18, color: isCurrentMonth ? c.surfaceVariant : c.onSurface }}>{'>'}</Text>
        </Pressable>
      </View>

      {/* Selected day info (always visible) */}
      <View style={{ backgroundColor: c.surfaceVariant, borderRadius: 8, padding: 10, marginBottom: 8, height: 52, justifyContent: 'center' }}>
        {selectedDay !== null ? (() => {
          const key = dateKeyForDay(selectedDay);
          const mins = heatmapData.get(key) ?? 0;
          const count = sessionCountMap.get(key) ?? 0;
          const names = [...(presetNamesMap.get(key) ?? [])];
          return (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: c.onBackground, fontSize: 13, fontWeight: '600' }}>
                  {MONTHS[currentMonth.getMonth()]} {selectedDay}, {currentMonth.getFullYear()}
                </Text>
                <Text style={{ color: c.accent, fontSize: 13, fontWeight: '600' }}>
                  {mins} min · {count} {count === 1 ? 'session' : 'sessions'}
                </Text>
              </View>
              {names.length > 0 && (
                <Text style={{ color: c.onSurface, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                  {names.join(', ')}
                </Text>
              )}
            </>
          );
        })() : (
          <Text style={{ color: c.onSurface, fontSize: 12 }}>Tap a day to see details</Text>
        )}
      </View>

      <View onLayout={onLayout} style={{ padding: PADDING }}>
        {/* Weekday headers */}
        {cellSize > 0 && (
          <>
            <View style={{ flexDirection: 'row', gap: GAP, marginBottom: 6 }}>
              {WEEKDAYS.map((d) => (
                <View key={d} style={{ width: cellSize, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: c.onSurface }}>{d}</Text>
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

                  const minutes = heatmapData.get(dateKeyForDay(day)) ?? 0;
                  const opacity = getIntensityOpacity(minutes);

                  const isSelected = selectedDay === day;

                  return (
                    <Pressable
                      key={colIdx}
                      onPress={() => setSelectedDay(isSelected ? null : day)}
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: 6,
                        backgroundColor: opacity > 0 ? c.accent : c.surfaceVariant,
                        opacity: opacity > 0 ? opacity : 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderWidth: isSelected ? 2 : 0,
                        borderColor: isSelected ? c.onBackground : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: cellSize > 36 ? 11 : 9, color: opacity > 0.5 ? '#fff' : c.onSurface }}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}

            {/* Legend */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 4 }}>
              <Text style={{ fontSize: 9, color: c.onSurface, marginRight: 4 }}>Less</Text>
              {[0, 0.3, 0.55, 0.75, 1].map((op, i) => (
                <View
                  key={i}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: op > 0 ? c.accent : c.surfaceVariant,
                    opacity: op > 0 ? op : 1,
                  }}
                />
              ))}
              <Text style={{ fontSize: 9, color: c.onSurface, marginLeft: 4 }}>More</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
