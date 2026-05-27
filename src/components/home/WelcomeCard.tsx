import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/scale';

export default function WelcomeCard() {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.surface2,
          borderColor: c.tealDeep,
        },
      ]}
    >
      {/* Soft teal glow */}
      <View
        style={[
          styles.glow,
          { backgroundColor: c.accent, opacity: 0.06 },
        ]}
      />

      <View style={styles.content} pointerEvents="none">
        <Text style={styles.emoji}>🪷</Text>
        <Text style={[typography.section, { color: c.accent, marginBottom: spacing.xs }]}>
          Glad to see you
        </Text>
        <Text
          style={[
            typography.body,
            {
              color: c.textDim,
              textAlign: 'center',
              lineHeight: 20,
              paddingHorizontal: spacing.lg,
            },
          ]}
        >
          When you're ready, pick a preset.{'\n'}No pressure — your practice is yours.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 170,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -80,
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 28,
  },
});
