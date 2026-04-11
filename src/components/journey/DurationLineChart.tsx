import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, LayoutChangeEvent, Platform } from 'react-native';
import Svg, { Path, Line, Text as SvgText, Circle } from 'react-native-svg';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '../../theme/ThemeContext';
import { MeditationSession } from '../../types/session';

interface Props {
  sessions: MeditationSession[];
}

const CHART_HEIGHT = 160;
const TOP_PADDING = 20;
const BOTTOM_PADDING = 30;
const LEFT_PADDING = 36;
const RIGHT_PADDING = 12;
const POINT_SPACING = 12;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatShortDate(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatPickerLabel(d: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Get start of day (midnight) */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Count days between two dates (inclusive) */
function daysBetween(from: Date, to: Date): number {
  const diffMs = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
}

interface DayPoint {
  date: Date;
  label: string;
  minutes: number;
}

export default function DurationLineChart({ sessions }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const scrollRef = useRef<ScrollView>(null);

  // Default range: start of current month to today
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [toDate, setToDate] = useState(() => startOfDay(new Date()));

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  // Build one data point per day
  const points: DayPoint[] = useMemo(() => {
    // Build minute map for the range
    const fromMs = startOfDay(fromDate).getTime();
    const toMs = startOfDay(toDate).getTime() + 24 * 60 * 60 * 1000;

    const minuteMap = new Map<string, number>();
    for (const s of sessions) {
      if (s.date >= fromMs && s.date < toMs) {
        const key = dateKey(new Date(s.date));
        minuteMap.set(key, (minuteMap.get(key) ?? 0) + s.duration);
      }
    }

    const totalDays = daysBetween(fromDate, toDate);
    const result: DayPoint[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startOfDay(fromDate));
      d.setDate(d.getDate() + i);
      result.push({
        date: d,
        label: formatShortDate(d),
        minutes: minuteMap.get(dateKey(d)) ?? 0,
      });
    }
    return result;
  }, [sessions, fromDate, toDate]);

  const maxMinutes = Math.max(...points.map((p) => p.minutes), 1);

  // Determine label frequency based on total days
  const totalDays = points.length;
  const labelEvery = totalDays <= 14 ? 1 : totalDays <= 60 ? 7 : 30;

  const chartWidth = LEFT_PADDING + RIGHT_PADDING + Math.max(points.length - 1, 0) * POINT_SPACING;
  const svgHeight = CHART_HEIGHT + TOP_PADDING + BOTTOM_PADDING;

  // Y-axis gridlines (0, 25%, 50%, 75%, 100% of max)
  const gridSteps = 4;
  const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => {
    const value = Math.round((maxMinutes / gridSteps) * i);
    const y = TOP_PADDING + CHART_HEIGHT - (CHART_HEIGHT * i) / gridSteps;
    return { value, y };
  });

  // Build SVG path
  const getX = (i: number) => LEFT_PADDING + i * POINT_SPACING;
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

  // Scroll to right on mount / range change
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
    }, 50);
  }, [fromDate, toDate]);

  const onFromChange = (_: DateTimePickerEvent, date?: Date) => {
    setShowFromPicker(Platform.OS === 'ios');
    if (date) {
      const d = startOfDay(date);
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

      {/* Chart */}
      {points.length > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <Svg width={chartWidth} height={svgHeight}>
            {/* Y-axis grid lines + labels */}
            {gridLines.map((g, i) => (
              <React.Fragment key={i}>
                <Line
                  x1={LEFT_PADDING}
                  y1={g.y}
                  x2={chartWidth - RIGHT_PADDING}
                  y2={g.y}
                  stroke={c.surfaceVariant}
                  strokeWidth={1}
                />
                <SvgText
                  x={LEFT_PADDING - 6}
                  y={g.y + 4}
                  fontSize={9}
                  fill={c.onSurface}
                  textAnchor="end"
                >
                  {g.value}
                </SvgText>
              </React.Fragment>
            ))}

            {/* Area fill */}
            <Path d={areaPath} fill={c.accent} opacity={0.15} />

            {/* Line */}
            <Path d={linePath} fill="none" stroke={c.accent} strokeWidth={2} />

            {/* Data points for non-zero days */}
            {points.map((p, i) =>
              p.minutes > 0 ? (
                <Circle
                  key={i}
                  cx={getX(i)}
                  cy={getY(p.minutes)}
                  r={3}
                  fill={c.accent}
                />
              ) : null
            )}

            {/* X-axis labels */}
            {points.map((p, i) =>
              i % labelEvery === 0 ? (
                <SvgText
                  key={`label-${i}`}
                  x={getX(i)}
                  y={TOP_PADDING + CHART_HEIGHT + 16}
                  fontSize={9}
                  fill={c.onSurface}
                  textAnchor="middle"
                >
                  {p.label}
                </SvgText>
              ) : null
            )}
          </Svg>
        </ScrollView>
      ) : (
        <Text style={{ color: c.onSurface, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 8 }}>
          No data for this period
        </Text>
      )}
    </View>
  );
}
