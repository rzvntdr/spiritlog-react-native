import React, { useEffect, useRef, useState } from 'react';
import StreakHero from './StreakHero';
import { StreakArtStyle } from './streak-art';

interface Props {
  // Source values to animate from (e.g., the last state shown).
  fromStreak: number;
  fromFreezes: number;

  // Target values (the current real state).
  toStreak: number;
  toFreezes: number;

  // Passthroughs to StreakHero.
  subtitleTemplate?: string | null;
  bestStreak?: number;
  totalMinutes?: number;
  totalSessions?: number;
  artStyle?: StreakArtStyle;
  onNumberRect?: (cx: number, cy: number, w: number, h: number) => void;

  /** Fired once the animation finishes (or immediately if no animation runs). */
  onSettled?: () => void;
}

const STREAK_UP_DURATION_MS = 2500;       // long, celebratory
const FREEZE_DECREMENT_STEP_MS = 250;     // rapid per-freeze decay
const FREEZE_INCREMENT_DURATION_MS = 700; // medium fade-in for freeze earned

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function AnimatedStreakHero({
  fromStreak,
  fromFreezes,
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
  const [displayStreak, setDisplayStreak] = useState(fromStreak);
  const [displayFreezes, setDisplayFreezes] = useState(fromFreezes);
  const settledRef = useRef(false);

  useEffect(() => {
    settledRef.current = false;

    const streakDelta = toStreak - fromStreak;
    const freezeDelta = toFreezes - fromFreezes;

    // Streak going down (or to 0) → snap, no animation.
    if (streakDelta < 0) {
      setDisplayStreak(toStreak);
      setDisplayFreezes(toFreezes);
      if (!settledRef.current) {
        settledRef.current = true;
        onSettled?.();
      }
      return;
    }

    // No change at all → settle immediately.
    if (streakDelta === 0 && freezeDelta === 0) {
      setDisplayStreak(toStreak);
      setDisplayFreezes(toFreezes);
      if (!settledRef.current) {
        settledRef.current = true;
        onSettled?.();
      }
      return;
    }

    let cancelled = false;

    // Streak-up animation: tick streak number over STREAK_UP_DURATION_MS with eased pacing.
    // Freeze decrements happen first (rapidly) so the user sees freezes consumed
    // before the celebratory count-up. Freeze increment (if any) is folded into
    // the streak animation at the moment streak hits the threshold.
    let timeouts: ReturnType<typeof setTimeout>[] = [];

    const runStreakUp = () => {
      if (streakDelta <= 0) {
        setDisplayStreak(toStreak);
        afterStreakUp();
        return;
      }
      // Scale duration with the jump: a +1 should land almost immediately (the
      // number "pop" carries it), while big jumps get the slow celebratory count.
      const duration = Math.min(
        STREAK_UP_DURATION_MS,
        Math.max(450, streakDelta * 300),
      );
      const startedAt = Date.now();
      const tick = () => {
        if (cancelled) return;
        const elapsed = Date.now() - startedAt;
        const progress = Math.min(1, elapsed / duration);
        const eased = easeOutCubic(progress);
        const value = Math.round(fromStreak + streakDelta * eased);
        setDisplayStreak(value);
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          setDisplayStreak(toStreak);
          afterStreakUp();
        }
      };
      requestAnimationFrame(tick);
    };

    const afterStreakUp = () => {
      // Reconcile freezes at the end so the displayed value matches reality.
      if (displayFreezes !== toFreezes) {
        if (toFreezes > displayFreezes) {
          // earned during streak-up — short fade by snapping after delay
          const id = setTimeout(() => setDisplayFreezes(toFreezes), FREEZE_INCREMENT_DURATION_MS);
          timeouts.push(id);
          const settleId = setTimeout(() => {
            if (!cancelled && !settledRef.current) {
              settledRef.current = true;
              onSettled?.();
            }
          }, FREEZE_INCREMENT_DURATION_MS + 50);
          timeouts.push(settleId);
        } else {
          setDisplayFreezes(toFreezes);
          if (!settledRef.current) {
            settledRef.current = true;
            onSettled?.();
          }
        }
      } else {
        if (!settledRef.current) {
          settledRef.current = true;
          onSettled?.();
        }
      }
    };

    // Phase 1: freeze decrement (rapid) — only if freezes decreased without streak change
    if (freezeDelta < 0 && streakDelta === 0) {
      const lostCount = -freezeDelta;
      let current = fromFreezes;
      for (let i = 0; i < lostCount; i++) {
        const id = setTimeout(() => {
          if (cancelled) return;
          current -= 1;
          setDisplayFreezes(current);
          if (i === lostCount - 1 && !settledRef.current) {
            settledRef.current = true;
            onSettled?.();
          }
        }, (i + 1) * FREEZE_DECREMENT_STEP_MS);
        timeouts.push(id);
      }
      return () => {
        cancelled = true;
        timeouts.forEach(clearTimeout);
      };
    }

    // Phase 1: freeze increment alone (no streak change)
    if (freezeDelta > 0 && streakDelta === 0) {
      const id = setTimeout(() => {
        if (cancelled) return;
        setDisplayFreezes(toFreezes);
        if (!settledRef.current) {
          settledRef.current = true;
          onSettled?.();
        }
      }, FREEZE_INCREMENT_DURATION_MS);
      timeouts.push(id);
      return () => {
        cancelled = true;
        timeouts.forEach(clearTimeout);
      };
    }

    // Streak went up: start streak-up animation immediately. Freezes resolved at the end.
    runStreakUp();

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromStreak, fromFreezes, toStreak, toFreezes]);

  return (
    <StreakHero
      currentStreak={displayStreak}
      freezesAvailable={displayFreezes}
      subtitleTemplate={subtitleTemplate}
      bestStreak={bestStreak}
      totalMinutes={totalMinutes}
      totalSessions={totalSessions}
      artStyle={artStyle}
      onNumberRect={onNumberRect}
    />
  );
}
