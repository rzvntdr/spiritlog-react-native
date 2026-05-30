import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import WelcomeCard from './WelcomeCard';
import StreakHero from './StreakHero';
import { StreakArtStyle } from './streak-art';

interface Props {
  toStreak: number;
  toFreezes: number;
  subtitleTemplate?: string | null;
  bestStreak?: number;
  totalMinutes?: number;
  totalSessions?: number;
  artStyle?: StreakArtStyle;
  onNumberRect?: (cx: number, cy: number, w: number, h: number) => void;
  onSettled?: () => void;
}

const HOLD_MS = 600;     // hold WelcomeCard a beat so the user registers it
const FADE_MS = 1900;    // crossfade duration — slow & deliberate

/**
 * Played the first time a real streak appears (transitioning lastShown.streak = 0 → N).
 * Shows WelcomeCard briefly, then crossfades to StreakHero with the new value.
 */
export default function WelcomeToStreakTransition({
  toStreak,
  toFreezes,
  subtitleTemplate,
  bestStreak,
  totalMinutes,
  totalSessions,
  artStyle,
  onNumberRect,
  onSettled,
}: Props) {
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const welcomeOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(HOLD_MS),
      Animated.parallel([
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: FADE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(welcomeOpacity, {
          toValue: 0,
          duration: FADE_MS,
          useNativeDriver: true,
        }),
      ]),
    ]);
    anim.start(({ finished }) => {
      if (finished) onSettled?.();
    });
    return () => {
      anim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View>
      <Animated.View style={{ opacity: welcomeOpacity }}>
        <WelcomeCard />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          opacity: heroOpacity,
        }}
      >
        <StreakHero
          currentStreak={toStreak}
          freezesAvailable={toFreezes}
          subtitleTemplate={subtitleTemplate}
          bestStreak={bestStreak}
          totalMinutes={totalMinutes}
          totalSessions={totalSessions}
          artStyle={artStyle}
          onNumberRect={onNumberRect}
        />
      </Animated.View>
    </View>
  );
}
