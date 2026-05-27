import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { PresetElement } from '../../types/preset';
import { ThemeColors } from '../../theme/tokens';
import {
  allocateWidths,
  normalTier,
  warmupTier,
  infiniteTier,
  soundTier,
} from '../../utils/elementLayout';
import { radius, spacing, typography } from '../../theme/scale';
import { getSoundById } from '../../types/sound';
import { soundConfigToLabel } from '../../utils/presetBuilder';

const GAP = 5;
const STRIP_HEIGHT = 54;

interface Props {
  elements: PresetElement[];
}

function formatShort(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem > 0 ? `${h}h${rem}m` : `${h}h`;
}

export default function PresetStrip({ elements }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [width, setWidth] = useState(0);

  if (elements.length === 0) return null;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== width) setWidth(w);
  };

  const widths = width > 0 ? allocateWidths(elements, width, GAP) : elements.map(() => 0);

  return (
    <View style={styles.strip} onLayout={onLayout}>
      {width > 0 &&
        elements.map((el, i) => {
          const w = widths[i];
          const key = i;
          if (el.kind === 'sound') {
            return <SoundCell key={key} width={w} soundId={el.soundId} c={c} />;
          }
          if (el.type === 'WARMUP') {
            return <WarmupCell key={key} width={w} durationMs={el.durationMillis} c={c} />;
          }
          if (el.type === 'INFINITE') {
            return <InfiniteCell key={key} width={w} c={c} />;
          }
          return <NormalCell key={key} width={w} element={el} c={c} />;
        })}
    </View>
  );
}

/* ---------------- Cells ---------------- */

function SoundCell({ width, soundId, c }: { width: number; soundId: number; c: ThemeColors }) {
  const tier = soundTier(width);
  if (tier === 'line') {
    return (
      <View
        style={{
          width,
          height: STRIP_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: Math.min(width, 3),
            height: STRIP_HEIGHT - 12,
            backgroundColor: c.warmup,
            borderRadius: 2,
            opacity: 0.7,
          }}
        />
      </View>
    );
  }
  const asset = getSoundById(soundId);
  const emoji = asset?.emoji ?? '🎵';
  return (
    <View
      style={{
        width,
        height: STRIP_HEIGHT,
        borderRadius: radius.sm,
        backgroundColor: c.surface2,
        borderWidth: 1,
        borderColor: c.line,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 14 }}>{emoji}</Text>
    </View>
  );
}

function WarmupCell({ width, durationMs, c }: { width: number; durationMs: number; c: ThemeColors }) {
  const tier = warmupTier(width);
  if (tier === 'block') {
    return (
      <View
        style={{
          width,
          height: STRIP_HEIGHT,
          borderRadius: radius.sm,
          backgroundColor: `${c.warmup}55`,
          borderWidth: 1,
          borderColor: `${c.warmup}55`,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width,
        height: STRIP_HEIGHT,
        borderRadius: radius.sm + 2,
        backgroundColor: `${c.warmup}22`,
        borderWidth: 1,
        borderColor: `${c.warmup}60`,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        paddingHorizontal: 4,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: c.warmup,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 11 }}>🌅</Text>
      </View>
      {tier === 'full' && (
        <Text style={[typography.micro, { color: c.warmup, fontVariant: ['tabular-nums'] }]}>
          {formatShort(durationMs)}
        </Text>
      )}
    </View>
  );
}

function InfiniteCell({ width, c }: { width: number; c: ThemeColors }) {
  const tier = infiniteTier(width);
  if (tier === 'block') {
    return (
      <View
        style={{
          width,
          height: STRIP_HEIGHT,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: `${c.accent}55`,
          borderStyle: 'dashed',
          backgroundColor: 'transparent',
        }}
      />
    );
  }
  return (
    <View
      style={{
        width,
        height: STRIP_HEIGHT,
        borderRadius: radius.sm + 2,
        borderWidth: 1,
        borderColor: `${c.accent}55`,
        borderStyle: 'dashed',
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        paddingHorizontal: 4,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1,
          borderColor: c.accent,
          borderStyle: 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 13, color: c.accent, lineHeight: 16 }}>∞</Text>
      </View>
      {tier === 'full' && (
        <Text style={[typography.micro, { color: c.accent }]}>∞</Text>
      )}
    </View>
  );
}

function NormalCell({
  width,
  element,
  c,
}: {
  width: number;
  element: Extract<PresetElement, { kind: 'duration' }>;
  c: ThemeColors;
}) {
  const tier = normalTier(width);
  const baseStyle = {
    width,
    height: STRIP_HEIGHT,
    borderRadius: radius.sm + 2,
    backgroundColor: `${c.accent}18`,
    borderWidth: 1,
    borderColor: `${c.accent}50`,
    overflow: 'hidden' as const,
  };

  if (tier === 'block') {
    return <View style={baseStyle} />;
  }

  if (tier === 'tiny') {
    return (
      <View style={[baseStyle, { alignItems: 'center', justifyContent: 'center' }]}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: c.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 11 }}>🧘</Text>
        </View>
      </View>
    );
  }

  if (tier === 'small') {
    return (
      <View
        style={[
          baseStyle,
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            paddingHorizontal: 6,
          },
        ]}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: c.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 10 }}>🧘</Text>
        </View>
        <Text
          style={[typography.micro, { color: c.textMute, fontVariant: ['tabular-nums'] }]}
          numberOfLines={1}
        >
          {formatShort(element.durationMillis)}
        </Text>
      </View>
    );
  }

  // medium and full
  const showSubLine = tier === 'full' && element.soundConfigs.length > 0;
  const subText = showSubLine
    ? element.soundConfigs
        .map((sc) => {
          const sound = getSoundById(sc.soundId);
          const emoji = sound?.emoji ?? '🎵';
          const label = soundConfigToLabel(sc).paramsLabel;
          return `${emoji} ${label}`;
        })
        .join('  ')
    : null;

  return (
    <View
      style={[
        baseStyle,
        {
          paddingHorizontal: 8,
          paddingVertical: 6,
          justifyContent: 'center',
          gap: 2,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: c.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 11 }}>🧘</Text>
        </View>
        <Text
          style={[
            typography.meta,
            { fontWeight: '600', color: c.onBackground, flex: 1, fontSize: 12.5 },
          ]}
          numberOfLines={1}
        >
          {element.name}
        </Text>
        <Text
          style={[typography.micro, { color: c.textMute, fontVariant: ['tabular-nums'] }]}
        >
          {formatShort(element.durationMillis)}
        </Text>
      </View>
      {showSubLine && (
        <Text
          style={[typography.micro, { color: c.textDim, marginLeft: 28 }]}
          numberOfLines={1}
        >
          {subText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    height: STRIP_HEIGHT,
    gap: GAP,
    alignItems: 'stretch',
  },
});
