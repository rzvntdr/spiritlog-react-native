import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, Pressable, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { useAchievementStore } from '../../stores/achievementStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getAllAchievements } from '../../data/achievements';
import { Tier } from '../../types/achievement';
import { RootStackParamList } from '../../navigation/navigation';
import { TIER_COLORS } from './TierBadge';

const VISIBLE_MS = 3500;

export default function AchievementToast() {
  const { theme } = useTheme();
  const c = theme.colors;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const achievementsEnabled = useSettingsStore((s) => s.achievementsEnabled);
  const toastQueue = useAchievementStore((s) => s.toastQueue);
  const dismissToast = useAchievementStore((s) => s.dismissToast);

  const current = achievementsEnabled ? toastQueue[0] : undefined;

  const translateY = useRef(new Animated.Value(-120)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!current) return;

    translateY.setValue(-120);
    scale.setValue(0.8);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    timerRef.current = setTimeout(() => animateOut(), VISIBLE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      pulseLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, current?.tier]);

  const animateOut = (onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      dismissToast();
      onDone?.();
    });
  };

  if (!current) return null;

  const achievement = getAllAchievements().find((a) => a.id === current.id);
  if (!achievement) return null;

  const tierLabel = current.tier !== 'single' ? current.tier.toUpperCase() : null;
  const tierColor =
    current.tier !== 'single' ? TIER_COLORS[current.tier as Exclude<Tier, 'single'>] : c.primary;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 24,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <Animated.View
        style={{
          transform: [{ translateY }, { scale }],
          opacity,
        }}
      >
        <Pressable
          onPress={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            animateOut(() => navigation.navigate('Achievements'));
          }}
          style={{
            backgroundColor: c.surface,
            borderRadius: 16,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: tierColor,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
            minWidth: 280,
            maxWidth: 360,
          }}
        >
          <Animated.Text
            style={{
              fontSize: 40,
              marginRight: 12,
              transform: [{ scale: pulse }],
            }}
          >
            {achievement.icon}
          </Animated.Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: c.onSurface, letterSpacing: 1 }}>
              ACHIEVEMENT UNLOCKED
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.onBackground, marginTop: 2 }}>
              {achievement.name}
            </Text>
            {tierLabel && (
              <Text style={{ fontSize: 11, fontWeight: '700', color: tierColor, marginTop: 2 }}>
                {tierLabel} TIER
              </Text>
            )}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
