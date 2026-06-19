import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/scale';

interface Props {
  value: number;
  onChange: (v: number) => void;
  freezeValue: number;
  onFreezeChange: (v: number) => void;
  /** Increment streak +1 AND freeze +1 together (the threshold-day case). */
  onBoth: () => void;
  onDismiss: () => void;
}

const PRESETS = [0, 1, 7, 30, 100, 365, 800];

export default function DemoStreakBar({
  value,
  onChange,
  freezeValue,
  onFreezeChange,
  onBoth,
  onDismiss,
}: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [text, setText] = useState(String(value));

  // Keep input synced when value changes externally (e.g. +/- buttons)
  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const n = parseInt(text.trim(), 10);
    if (!isNaN(n) && n >= 0) onChange(n);
    else setText(String(value));
  };

  return (
    <View style={[styles.bar, { backgroundColor: c.surface2, borderColor: c.line }]}>
      <View style={styles.headerRow}>
        <Text style={[typography.label, { color: c.warmBright, letterSpacing: 1.2 }]}>
          🔥 DEMO MODE
        </Text>
        <Pressable onPress={onDismiss} hitSlop={10} style={styles.dismiss}>
          <Text style={{ color: c.textDim, fontSize: 18 }}>✕</Text>
        </Pressable>
      </View>

      {/* Streak stepper */}
      <Text style={[typography.meta, { color: c.textMute }]}>Streak (days)</Text>
      <View style={styles.controlRow}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          hitSlop={6}
          style={[styles.stepBtn, { backgroundColor: c.surface, borderColor: c.line }]}
        >
          <Text style={[typography.bodyEm, { color: c.onBackground, fontSize: 18 }]}>−</Text>
        </Pressable>

        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="number-pad"
          selectTextOnFocus
          style={[styles.input, { backgroundColor: c.surface, color: c.onBackground, borderColor: c.line }]}
        />

        <Pressable
          onPress={() => onChange(value + 1)}
          hitSlop={6}
          style={[styles.stepBtn, { backgroundColor: c.surface, borderColor: c.line }]}
        >
          <Text style={[typography.bodyEm, { color: c.onBackground, fontSize: 18 }]}>+</Text>
        </Pressable>
      </View>

      <View style={styles.presetRow}>
        {PRESETS.map((n) => {
          const active = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={[styles.preset, { backgroundColor: active ? c.primaryContainer : c.surface, borderColor: active ? c.accent : c.line }]}
            >
              <Text style={[typography.meta, { color: active ? c.onPrimary : c.textDim, fontWeight: '600' }]}>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Freeze stepper */}
      <Text style={[typography.meta, { color: c.textMute, marginTop: spacing.xs }]}>🛡 Freezes</Text>
      <View style={styles.controlRow}>
        <Pressable
          onPress={() => onFreezeChange(Math.max(0, freezeValue - 1))}
          hitSlop={6}
          style={[styles.stepBtn, { backgroundColor: c.surface, borderColor: c.line }]}
        >
          <Text style={[typography.bodyEm, { color: c.onBackground, fontSize: 18 }]}>−</Text>
        </Pressable>
        <View style={[styles.input, { backgroundColor: c.surface, borderColor: c.line, justifyContent: 'center' }]}>
          <Text style={{ color: c.onBackground, fontSize: 16, fontWeight: '600', textAlign: 'center', fontVariant: ['tabular-nums'] }}>
            {freezeValue}
          </Text>
        </View>
        <Pressable
          onPress={() => onFreezeChange(freezeValue + 1)}
          hitSlop={6}
          style={[styles.stepBtn, { backgroundColor: c.surface, borderColor: c.line }]}
        >
          <Text style={[typography.bodyEm, { color: c.onBackground, fontSize: 18 }]}>+</Text>
        </Pressable>
      </View>

      {/* Combined: +1 day & +1 freeze (the threshold-day case) */}
      <Pressable
        onPress={onBoth}
        style={[styles.bothBtn, { backgroundColor: c.primaryContainer, borderColor: c.accent }]}
      >
        <Text style={[typography.bodyEm, { color: c.onPrimary }]}>+1 day &amp; +1 freeze</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dismiss: {
    paddingHorizontal: spacing.xs,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  preset: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    minWidth: 36,
    alignItems: 'center',
  },
  bothBtn: {
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
});
