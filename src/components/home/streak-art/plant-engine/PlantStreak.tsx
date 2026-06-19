/**
 * <PlantStreak /> — a procedurally-grown, flat/stylized little tree (space
 * colonization + Murray's-law thickness) that reflects a streak. Authored in a
 * 170×170 box so it stays bold and readable at the small size it occupies in
 * the app. Depends only on react-native-svg + RN's built-in Animated.
 *
 *   <PlantStreak streakDays={42} seed={plantSeed} />
 *
 * `seed` fixes the SHAPE (stable per plant); `streakDays` drives HOW MUCH it
 * has grown. Animations: smooth growth when the streak changes + a subtle idle
 * sway (toggle with `animateIdle`).
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';

import { FinalizeOpts } from './generateTree';
import { getVisibleTree, leafPath, plantScale, VisibleDecor } from './reveal';
import { PlantAlgorithm, usePlant } from './usePlant';

const AnimatedG = Animated.createAnimatedComponent(G);
const LEAF_PATHS = [0, 1, 2].map(leafPath);

/** Flat flower (5 petals + center), fruit (berry + highlight), or sparkle. */
function Decoration({ d }: { d: VisibleDecor }) {
  const r = d.size * d.scale;
  if (d.type === 'flower') {
    const petals = [0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2;
      return { cx: d.x + Math.cos(a) * r * 0.62, cy: d.y + Math.sin(a) * r * 0.62 };
    });
    return (
      <G opacity={d.opacity}>
        {petals.map((p, i) => (
          <Circle key={i} cx={p.cx} cy={p.cy} r={r * 0.55} fill={d.fill} />
        ))}
        <Circle cx={d.x} cy={d.y} r={r * 0.5} fill="#ffd34d" />
      </G>
    );
  }
  if (d.type === 'fruit') {
    return (
      <G opacity={d.opacity}>
        <Circle cx={d.x} cy={d.y} r={r} fill={d.fill} />
        <Circle cx={d.x - r * 0.3} cy={d.y - r * 0.3} r={r * 0.28} fill="#fff" opacity={0.6} />
      </G>
    );
  }
  return <Circle cx={d.x} cy={d.y} r={r} fill={d.fill} opacity={d.opacity} />;
}

export interface PlantStreakProps {
  streakDays: number;
  seed: number;
  /** Rendered size in px (square). */
  size?: number;
  /** Animate growth when the streak changes (default true). */
  animate?: boolean;
  /** Subtle idle sway (default true). */
  animateIdle?: boolean;
  /** Skeleton algorithm: 'colony' (space colonization) or 'lsystem'. */
  algorithm?: PlantAlgorithm;
  /** Customize leaves / flowers / fruit / sparkles (counts, sizes, colors, timing). */
  config?: FinalizeOpts;
  style?: ViewStyle;
}

export function PlantStreak({
  streakDays,
  seed,
  size = 200,
  animate = true,
  animateIdle = true,
  algorithm = 'colony',
  config,
  style,
}: PlantStreakProps) {
  const { tree, maturity } = usePlant(streakDays, seed, animate, algorithm, config);
  const visible = useMemo(() => getVisibleTree(tree, maturity), [tree, maturity]);

  const { width, height, baseX, baseY } = tree.view;
  const renderH = (size / width) * height;
  const s = plantScale(maturity);
  const scaleTransform = `translate(${baseX} ${baseY}) scale(${s}) translate(${-baseX} ${-baseY})`;

  // ---- idle sway: a sapling is light and lively, an old tree barely stirs ----
  // (bucketed so the loop doesn't restart on every tween frame)
  const ageBucket = Math.round(Math.min(1, Math.max(0, maturity)) * 4) / 4;
  const swayAmp = 2.3 - 1.5 * ageBucket; // ± degrees
  const swayMs = 2200 + 1500 * ageBucket;
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animateIdle) {
      sway.stopAnimation();
      sway.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: swayMs, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(sway, { toValue: -1, duration: swayMs, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animateIdle, sway, swayMs]);

  const rotation = sway.interpolate({ inputRange: [-1, 1], outputRange: [-swayAmp, swayAmp] });

  return (
    <View style={style}>
      <Svg width={size} height={renderH} viewBox={`0 0 ${width} ${height}`}>
        {/* Base: soil mound */}
        <Ellipse cx={baseX} cy={baseY + 4} rx={42} ry={8} fill="#4f3d2b" />
        <Ellipse cx={baseX} cy={baseY + 1} rx={34} ry={5.5} fill="#6b5640" />
        {/* (the seed husk + sprout come from getVisibleTree as primitives) */}

        <AnimatedG rotation={rotation} originX={baseX} originY={baseY}>
          <G transform={scaleTransform}>
            {/* Branches: short parent→node segments, round caps → tapered tubes */}
            {visible.segments.map((seg) => (
              <Line
                key={seg.id}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={seg.color}
                strokeWidth={seg.width}
                strokeLinecap="round"
              />
            ))}

            {/* Leaves */}
            {visible.leaves.map((l) => (
              <G
                key={l.id}
                opacity={l.opacity}
                transform={`translate(${l.x} ${l.y}) rotate(${l.rotationDeg}) scale(${l.scale})`}
              >
                <Path d={LEAF_PATHS[l.variant % 3]} fill={l.fill} />
              </G>
            ))}

            {/* Milestone decorations: flowers → fruit → sparkles */}
            {visible.decor.map((d) => (
              <Decoration key={`${d.type}-${d.id}`} d={d} />
            ))}
          </G>
        </AnimatedG>
      </Svg>
    </View>
  );
}

export default PlantStreak;
