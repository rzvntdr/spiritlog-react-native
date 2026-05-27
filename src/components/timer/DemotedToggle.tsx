import React, { useRef, useEffect } from 'react';
import { Animated, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/scale';

type Props = {
  label: string;
  emoji: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  onLongPress?: () => void;
};

export default function DemotedToggle({ label, emoji, value, onChange, disabled, onLongPress }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', 'rgba(92,196,209,0.12)'],
  });

  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [c.line, c.accent],
  });

  const contentOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1.0],
  });

  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      onLongPress={onLongPress}
      hitSlop={8}
    >
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: disabled ? 'transparent' : bgColor,
            borderColor: disabled ? c.line : borderColor,
            opacity: disabled ? 0.3 : 1,
          },
        ]}
      >
        <Animated.View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            opacity: disabled ? 1 : contentOpacity,
          }}
        >
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={[typography.bodyEm, { color: value && !disabled ? c.accent : c.onBackground, fontSize: 13 }]}>
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 16,
  },
});
