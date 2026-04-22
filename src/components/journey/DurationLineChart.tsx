import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Circle, Rect } from 'react-native-svg';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../../theme/ThemeContext';
import { MeditationSession } from '../../types/session';

interface Props {
  sessions: MeditationSession[];
  presetNameMap: Map<string, string>;
}

const CHART_HEIGHT = 160;
const TOP_PADDING = 20;
const BOTTOM_PADDING = 30;
const POINT_SPACING = 6;
const Y_AXIS_WIDTH = 36;
const RIGHT_PADDING = 8;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatShortDate(d: Date, includeYear: boolean): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (includeYear) {
    return `${months[d.getMonth()]} ${d.getDate()} '${String(d.getFullYear()).slice(2)}`;
  }
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatPickerLabel(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(from: Date, to: Date): number {
  const diffMs = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

interface DayPoint {
  date: Date;
  label: string;
  minutes: number;
  sessionCount: number;
  presetNames: string[];
}

export default function DurationLineChart({ sessions, presetNameMap }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const scrollRef = useRef<ScrollView>(null);

  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [toDate, setToDate] = useState(() => startOfDay(new Date()));

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const spansMultipleYears = fromDate.getFullYear() !== toDate.getFullYear();

  const points: DayPoint[] = useMemo(() => {
    const fromMs = startOfDay(fromDate).getTime();
    const toMs = startOfDay(toDate).getTime() + 24 * 60 * 60 * 1000;

    const minuteMap = new Map<string, number>();
    const countMap = new Map<string, number>();
    const presetMap = new Map<string, Set<string>>();
    for (const s of sessions) {
      if (s.date >= fromMs && s.date < toMs) {
        const key = dateKey(new Date(s.date));
        minuteMap.set(key, (minuteMap.get(key) ?? 0) + s.duration);
        countMap.set(key, (countMap.get(key) ?? 0) + 1);
        if (!presetMap.has(key)) presetMap.set(key, new Set());
        const name = s.presetId
          ? (presetNameMap.get(s.presetId) ?? 'Deleted preset')
          : 'Free session';
        presetMap.get(key)!.add(name);
      }
    }

    const totalDays = daysBetween(fromDate, toDate);
    const result: DayPoint[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startOfDay(fromDate));
      d.setDate(d.getDate() + i);
      const key = dateKey(d);
      result.push({
        date: d,
        label: formatShortDate(d, spansMultipleYears),
        minutes: minuteMap.get(key) ?? 0,
        sessionCount: countMap.get(key) ?? 0,
        presetNames: [...(presetMap.get(key) ?? [])],
      });
    }
    return result;
  }, [sessions, fromDate, toDate, spansMultipleYears]);

  const maxMinutes = Math.max(...points.map((p) => p.minutes), 1);

  const totalDays = points.length;
  const labelEvery = totalDays <= 14 ? 1 : totalDays <= 60 ? 7 : 30;

  const chartWidth = RIGHT_PADDING + Math.max(points.length - 1, 0) * POINT_SPACING + RIGHT_PADDING;
  const svgHeight = CHART_HEIGHT + TOP_PADDING + BOTTOM_PADDING;

  const gridSteps = 4;
  const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const value = Math.round((maxMinutes / gridSteps) * i);
    const y = TOP_PADDING + CHART_HEIGHT - (CHART_HEIGHT * i) / gridSteps;
    return { value, y };
  });

  const getX = (i: number) => RIGHT_PADDING + i * POINT_SPACING;
  const getY = (minutes: number) =>
    TOP_PADDING + CHART_HEIGHT - (minutes / maxMinutes) * CHART_HEIGHT;

  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.minutes)}`)
      .join(' ');
  }, [points, maxMinutes]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const baseline = TOP_PADDING + CHART_HEIGHT;
    return `${linePath} L ${getX(points.length - 1)} ${baseline} L ${getX(0)} ${baseline} Z`;
  }, [linePath, points.length]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 50);
  }, [fromDate, toDate]);

  const earliestSessionDate = useMemo(() => {
    if (sessions.length === 0) return null;
    const minDate = Math.min(...sessions.map((s) => s.date));
    return startOfDay(new Date(minDate));
  }, [sessions]);

  const onFromChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowFromPicker(Platform.OS === 'ios');
    if (date) {
      let d = startOfDay(date);
      if (earliestSessionDate && d < earliestSessionDate) {
        d = earliestSessionDate;
      }
      if (d <= toDate) setFromDate(d);
    }
  };

  const onToChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowToPicker(Platform.OS === 'ios');
    if (date) {
      const d = startOfDay(date);
      if (d >= fromDate && d <= startOfDay(new Date())) setToDate(d);
    }
  };

  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: c.onBackground, marginBottom: 12 }}>
        Session Duration
      </Text>

      {/* Selected day info (always visible) */}
      <View style={{ backgroundColor: c.surfaceVariant, borderRadius: 8, padding: 10, marginBottom: 12, height: 52, justifyContent: 'center' }}>
        {selectedIndex !== null && points[selectedIndex] ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: c.onBackground, fontSize: 13, fontWeight: '600' }}>
                {formatPickerLabel(points[selectedIndex].date)}
              </Text>
              <Text style={{ color: c.accent, fontSize: 13, fontWeight: '600' }}>
                {points[selectedIndex].minutes} min · {points[selectedIndex].sessionCount} {points[selectedIndex].sessionCount === 1 ? 'session' : 'sessions'}
              </Text>
            </View>
            {points[selectedIndex].presetNames.length > 0 && (
              <Text style={{ color: c.onSurface, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                {points[selectedIndex].presetNames.join(', ')}
              </Text>
            )}
          </>
        ) : (
          <Text style={{ color: c.onSurface, fontSize: 12 }}>Tap a point to see details</Text>
        )}
      </View>

      {/* Date range pickers */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
        <Pressable
          onPress={() => setShowFromPicker(true)}
          style={{
            flex: 1,
            backgroundColor: c.surfaceVariant,
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ fontSize: 10, color: c.onSurface, marginBottom: 2 }}>From</Text>
          <Text style={{ fontSize: 13, color: c.onBackground, fontWeight: '600' }}>
            {formatPickerLabel(fromDate)}
          </Text>
        </Pressable>

        <Text style={{ color: c.onSurface, fontSize: 14 }}>–</Text>

        <Pressable
          onPress={() => setShowToPicker(true)}
          style={{
            flex: 1,
            backgroundColor: c.surfaceVariant,
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ fontSize: 10, color: c.onSurface, marginBottom: 2 }}>To</Text>
          <Text style={{ fontSize: 13, color: c.onBackground, fontWeight: '600' }}>
            {formatPickerLabel(toDate)}
          </Text>
        </Pressable>
      </View>

      {showFromPicker && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          maximumDate={toDate}
          onChange={onFromChange}
        />
      )}
      {showToPicker && (
        <DateTimePicker
          value={toDate}
          mode="date"
          minimumDate={fromDate}
          maximumDate={new Date()}
          onChange={onToChange}
        />
      )}

      {/* Chart with fixed Y-axis */}
      {points.length > 0 ? (
        <View style={{ flexDirection: 'row' }}>
          {/* Fixed Y-axis */}
          <Svg width={Y_AXIS_WIDTH} height={svgHeight}>
            {gridLines.map((g, i) => (
              <SvgText
                key={i}
                x={Y_AXIS_WIDTH - 4}
                y={g.y + 4}
                fontSize={9}
                fill={c.onSurface}
                textAnchor="end"
              >
                {g.value}
              </SvgText>
            ))}
          </Svg>

          {/* Scrollable chart area */}
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
          >
            <Svg width={chartWidth} height={svgHeight}>
              {/* Grid lines */}
              {gridLines.map((g, i) => (
                <Line
                  key={i}
                  x1={0}
                  y1={g.y}
                  x2={chartWidth}
                  y2={g.y}
                  stroke={c.surfaceVariant}
                  strokeWidth={1}
                />
              ))}

              {/* Area fill */}
              <Path d={areaPath} fill={c.accent} opacity={0.15} />

              {/* Line */}
              <Path d={linePath} fill="none" stroke={c.accent} strokeWidth={1.5} />

              {/* Data points for non-zero days */}
              {points.map((p, i) =>
                p.minutes > 0 ? (
                  <Circle
                    key={i}
                    cx={getX(i)}
                    cy={getY(p.minutes)}
                    r={selectedIndex === i ? 4 : 2}
                    fill={selectedIndex === i ? c.onBackground : c.accent}
                  />
                ) : null
              )}

              {/* Touch targets */}
              {points.map((p, i) => (
                <Rect
                  key={`tap-${i}`}
                  x={getX(i) - POINT_SPACING / 2}
                  y={TOP_PADDING}
                  width={POINT_SPACING}
                  height={CHART_HEIGHT}
                  fill="transparent"
                  onPress={() => setSelectedIndex(selectedIndex === i ? null : i)}
                />
              ))}

              {/* X-axis labels */}
              {points.map((p, i) =>
                i % labelEvery === 0 ? (
                  <SvgText
                    key={`label-${i}`}
                    x={getX(i)}
                    y={TOP_PADDING + CHART_HEIGHT + 16}
                    fontSize={8}
                    fill={c.onSurface}
                    textAnchor="middle"
                  >
                    {p.label}
                  </SvgText>
                ) : null
              )}
            </Svg>
          </ScrollView>
        </View>
      ) : (
        <Text style={{ color: c.onSurface, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>
          No data for this period
        </Text>
      )}
    </View>
  );
}
