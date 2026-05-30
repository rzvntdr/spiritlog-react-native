import React, { useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import LottieView from 'lottie-react-native';

export type CelebrationKind = 'streak' | 'freeze';

const streakBurst = require('../../assets/lottie/streak-burst.json');
const freezeBurst = require('../../assets/lottie/freeze-burst.json');
const arrowUp = require('../../assets/lottie/arrow-up.json');
const levelUp = require('../../assets/lottie/level-up.json');

/** Where the streak celebration sits.
 *  'card'        → centered on the whole hero card.
 *  'number'      → centered on the streak number.
 *  'right-space' → centered in the empty space to the RIGHT of the number,
 *                  without overlapping the number / plant / anything else. */
export type CelebrationPlacement = 'card' | 'number' | 'right-space';

export interface CelebrationAsset {
  id: string;
  label: string;
  sources: Record<CelebrationKind, any>;
  size: { width: number; height: number };
  placement: CelebrationPlacement;
}

export const CELEBRATION_ASSETS: CelebrationAsset[] = [
  {
    id: 'burst',
    label: 'Gold burst',
    sources: { streak: streakBurst, freeze: freezeBurst },
    size: { width: 320, height: 260 },
    placement: 'card',
  },
  {
    id: 'arrowup',
    label: 'Arrow Up',
    sources: { streak: arrowUp, freeze: freezeBurst },
    size: { width: 300, height: 380 },
    placement: 'right-space',
  },
  {
    id: 'levelup',
    label: 'Level Up',
    sources: { streak: levelUp, freeze: freezeBurst },
    size: { width: 320, height: 320 },
    placement: 'right-space',
  },
];

export const DEFAULT_CELEBRATION_ASSET_ID = 'burst';

function resolveAsset(id: string): CelebrationAsset {
  return CELEBRATION_ASSETS.find((a) => a.id === id) ?? CELEBRATION_ASSETS[0];
}

const FREEZE_SIZE = { width: 90, height: 90 };

export interface NumberRect {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

interface Props {
  kind: CelebrationKind;
  assetId?: string;
  /** Measured streak-number rect (relative to the card) used to anchor the burst. */
  numberRect?: NumberRect | null;
}

/**
 * One-shot celebratory Lottie overlay. Mount with a unique `key` to replay —
 * the parent bumps the key whenever a streak/freeze increment should be marked.
 * Non-interactive; sits on top of the StreakHero card.
 */
export default function StreakCelebration({
  kind,
  assetId = DEFAULT_CELEBRATION_ASSET_ID,
  numberRect,
}: Props) {
  const asset = resolveAsset(assetId);
  const source = kind === 'freeze' ? asset.sources.freeze : asset.sources.streak;
  // Measured size of this overlay container (== the hero card bounds).
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!box || box.w !== width || box.h !== height) setBox({ w: width, h: height });
  };

  // Decide the rendered rect (left/top/width/height) of the Lottie box.
  let rect: { left: number; top: number; width: number; height: number } | null = null;

  if (kind === 'freeze' && numberRect) {
    const size = FREEZE_SIZE;
    rect = {
      width: size.width,
      height: size.height,
      left: numberRect.cx - size.width / 2,
      top: Math.min(numberRect.cy + 56, 150) - size.height / 2,
    };
  } else if (kind === 'streak') {
    if (asset.placement === 'right-space' && numberRect && box) {
      // Band to the right of the number. The Lottie has internal transparent
      // padding, so to push the *visible* badge rightward we widen the box past
      // the card's right edge — its center shifts right, pulling the badge over.
      const gap = 10;
      const regionLeft = numberRect.cx + numberRect.w / 2 + gap;
      const regionRight = box.w; // to the card edge
      const regionW = Math.max(40, regionRight - regionLeft);
      const overflow = 28; // slight extend past edge → badge sits a touch further right
      rect = { left: regionLeft, top: 0, width: regionW + overflow, height: box.h };
    } else if (asset.placement === 'number' && numberRect) {
      const size = asset.size;
      rect = {
        width: size.width,
        height: size.height,
        left: numberRect.cx - size.width / 2,
        top: numberRect.cy - size.height / 2,
      };
    }
    // 'card' or not-yet-measured → fall through to centered render below.
  }

  const lottie = (animStyle: any) => (
    <LottieView
      source={source}
      autoPlay
      loop={false}
      speed={1}
      style={animStyle}
      resizeMode="contain"
    />
  );

  if (rect) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout}>
        <View style={{ position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height }}>
          {lottie({ width: '100%', height: '100%' })}
        </View>
      </View>
    );
  }

  // No rect yet. For anchored placements we may just be waiting on measurement —
  // render an invisible measuring container (no flash of a centered version).
  const needsMeasurement =
    kind === 'freeze' || (kind === 'streak' && asset.placement !== 'card');
  if (needsMeasurement) {
    return <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={onLayout} />;
  }

  // Centered-on-card (placement 'card').
  return (
    <View pointerEvents="none" style={styles.centerWrap} onLayout={onLayout}>
      {lottie(asset.size)}
    </View>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
