import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import LottieView from 'lottie-react-native';

// The gold burst doubles as a "holy blessing" light — anchored on the 🛡
// shield line it reads like a paladin shield proc.
const holyBurst = require('../../assets/lottie/streak-burst.json');

const BURST_SIZE = { width: 120, height: 120 };

export interface NumberRect {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

interface Props {
  /** Measured streak-number rect (relative to the card); the 🛡 line sits just below it. */
  numberRect?: NumberRect | null;
}

/**
 * One-shot golden "holy" burst over the 🛡 freeze shield — plays when a freeze
 * is earned. Mount with a unique `key` to replay. This is the ONLY celebration
 * effect in the app (the streak-increment Lottie system was removed).
 */
export default function FreezeShieldBurst({ numberRect }: Props) {
  // Measured size of this overlay container (== the hero card bounds).
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!box || box.w !== width || box.h !== height) setBox({ w: width, h: height });
  };

  // Waiting on the number measurement → invisible container, no centered flash.
  if (!numberRect) {
    return <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout} />;
  }

  const rect = {
    width: BURST_SIZE.width,
    height: BURST_SIZE.height,
    left: numberRect.cx - BURST_SIZE.width / 2,
    top: Math.min(numberRect.cy + 56, 150) - BURST_SIZE.height / 2,
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <View style={{ position: 'absolute', ...rect }}>
        <LottieView
          source={holyBurst}
          autoPlay
          loop={false}
          speed={1}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
