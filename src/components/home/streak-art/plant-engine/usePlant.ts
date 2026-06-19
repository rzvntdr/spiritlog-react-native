/**
 * Binds the streak → maturity → tree pipeline together and smoothly animates
 * maturity whenever the streak (or seed) changes.
 *
 * The tween is a plain requestAnimationFrame loop on a single scalar — no
 * reanimated/worklets dependency. Since the SVG tree is re-rendered from JS
 * anyway, this is visually identical to an animated shared value but keeps
 * the component's only native dependency `react-native-svg`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { FinalizeOpts, generateTree, TreeModel } from './generateTree';
import { generateTreeLSystem } from './generateTreeLSystem';
import { maturity as maturityOf } from './growth';

/** Which skeleton algorithm to use. */
export type PlantAlgorithm = 'colony' | 'lsystem';

export interface PlantState {
  tree: TreeModel;
  maturity: number;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function usePlant(
  streakDays: number,
  seed: number,
  animate = true,
  algorithm: PlantAlgorithm = 'colony',
  config?: FinalizeOpts,
): PlantState {
  // stringify config so an inline object literal doesn't regenerate every render
  const configKey = config ? JSON.stringify(config) : '';
  const tree = useMemo(() => {
    if (algorithm === 'lsystem') return generateTreeLSystem(seed, config);
    return generateTree(seed, config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, algorithm, configKey]);
  const target = maturityOf(streakDays);

  const [m, setM] = useState(animate ? 0 : target);
  const fromRef = useRef(animate ? 0 : target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animate) {
      fromRef.current = target;
      setM(target);
      return;
    }

    const from = fromRef.current;
    const delta = Math.abs(target - from);
    if (delta < 0.0001) {
      setM(target);
      return;
    }

    const duration = 600 + delta * 1500; // bigger jumps take a bit longer (ms)
    const start = Date.now();

    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setM(from + (target - from) * easeOutCubic(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        rafRef.current = null;
      }
    };

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, animate]);

  return { tree, maturity: m };
}
