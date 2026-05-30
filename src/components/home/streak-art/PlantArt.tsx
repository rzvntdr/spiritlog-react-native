import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle, Ellipse, Path, Line, G, Rect,
  Defs, LinearGradient, RadialGradient, Stop, ClipPath,
} from 'react-native-svg';
import { StreakArtProps } from './types';
import { StreakTier } from '../../../utils/streakTier';
import { ThemeColors } from '../../../theme/tokens';

const TIER_INDEX: Record<StreakTier, number> = {
  ember: 0, seed: 1, spark: 2, sprout: 3, bud: 4,
  bloom: 5, flourish: 6, radiance: 7, year: 8, aurora: 9,
};

const W = 170;
const H = 170;
const GROUND_Y = 154;

/* ---------- helper primitives ---------- */

interface LeafProps {
  cx: number;
  cy: number;
  rx?: number;
  ry?: number;
  rotation: number;
  c: ThemeColors;
}

/** Leaf = ellipse with vein line + highlight stroke. */
function Leaf({ cx, cy, rx = 11, ry = 5, rotation, c }: LeafProps) {
  // vein endpoints in the leaf's local frame
  const cos = Math.cos((rotation * Math.PI) / 180);
  const sin = Math.sin((rotation * Math.PI) / 180);
  const tip = { x: cx + cos * rx, y: cy + sin * rx };
  const base = { x: cx - cos * rx, y: cy - sin * rx };
  // highlight: arc slightly above the centerline
  const ph = { x: cx - sin * (ry * 0.5), y: cy + cos * (ry * 0.5) };

  return (
    <G>
      <Ellipse
        cx={cx} cy={cy} rx={rx} ry={ry}
        fill="url(#leaf)" opacity={0.92}
        originX={cx} originY={cy} rotation={rotation}
      />
      <Line
        x1={base.x} y1={base.y} x2={tip.x} y2={tip.y}
        stroke={c.tealDeep} strokeWidth={0.5} opacity={0.6}
      />
      <Line
        x1={cx - cos * (rx * 0.4)} y1={ph.y}
        x2={cx + cos * (rx * 0.3)} y2={ph.y}
        stroke={c.goldPale} strokeWidth={0.35} opacity={0.5}
      />
    </G>
  );
}

interface FlowerProps {
  cx: number;
  cy: number;
  scale?: number;
  petalFill: string;
  centerFill: string;
  c: ThemeColors;
}

/** 5-petal flower with bezier petals (more organic than circles). */
function Flower({ cx, cy, scale = 1, petalFill, centerFill, c }: FlowerProps) {
  const r = 7 * scale;
  const w = 4 * scale;
  // 5 petals arranged radially
  const petals = Array.from({ length: 5 }).map((_, i) => {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(angle) * (r * 0.55);
    const py = cy + Math.sin(angle) * (r * 0.55);
    const deg = (angle * 180) / Math.PI + 90;
    return { px, py, deg };
  });
  return (
    <G>
      {petals.map((p, i) => (
        <Ellipse
          key={i}
          cx={p.px} cy={p.py} rx={w} ry={r * 0.8}
          fill={petalFill}
          originX={p.px} originY={p.py} rotation={p.deg}
        />
      ))}
      {/* highlight on top petals */}
      {petals.slice(0, 2).map((p, i) => (
        <Ellipse
          key={`h${i}`}
          cx={p.px} cy={p.py - 1} rx={w * 0.5} ry={r * 0.35}
          fill={c.goldPale} opacity={0.5}
          originX={p.px} originY={p.py} rotation={p.deg}
        />
      ))}
      <Circle cx={cx} cy={cy} r={r * 0.42} fill={centerFill} />
      <Circle cx={cx - 0.8} cy={cy - 0.8} r={r * 0.18} fill={c.goldPale} opacity={0.7} />
    </G>
  );
}

interface DewProps { cx: number; cy: number; size?: number; }
function Dew({ cx, cy, size = 1.5 }: DewProps) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={size} fill="#e8edf7" opacity={0.85} />
      <Circle cx={cx - size * 0.35} cy={cy - size * 0.35} r={size * 0.35} fill="#fff" />
    </G>
  );
}

/* ---------- main component ---------- */

export default function PlantArt({ tier, c }: StreakArtProps) {
  const t = TIER_INDEX[tier];

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: W }}>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          {/* Stems */}
          <LinearGradient id="stem" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={c.tealDeep} />
            <Stop offset="1" stopColor={c.accent} />
          </LinearGradient>
          {/* Leaves */}
          <LinearGradient id="leaf" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={c.tealDeep} />
            <Stop offset="0.5" stopColor={c.accent} />
            <Stop offset="1" stopColor={c.tealSoft} />
          </LinearGradient>
          {/* Warm petal (bud → bloom) */}
          <LinearGradient id="petalWarm" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={c.goldPale} />
            <Stop offset="1" stopColor={c.warmup} />
          </LinearGradient>
          {/* Gold petal (flourish+) */}
          <LinearGradient id="petalGold" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={c.goldPale} />
            <Stop offset="1" stopColor={c.gold} />
          </LinearGradient>
          {/* Flame (ember) */}
          <LinearGradient id="flame" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#8b3a1f" />
            <Stop offset="0.45" stopColor={c.warmup} />
            <Stop offset="0.85" stopColor={c.warmBright} />
            <Stop offset="1" stopColor={c.goldPale} />
          </LinearGradient>
          {/* Inner flame */}
          <LinearGradient id="flameInner" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={c.warmup} />
            <Stop offset="1" stopColor={c.goldPale} />
          </LinearGradient>
          {/* Tree canopy */}
          <LinearGradient id="canopy" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.accent} />
            <Stop offset="1" stopColor={c.tealDeep} />
          </LinearGradient>
          {/* Tree trunk */}
          <LinearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#3d2a18" />
            <Stop offset="0.5" stopColor="#8b6f47" />
            <Stop offset="1" stopColor="#4a2f15" />
          </LinearGradient>
          {/* Halo glows */}
          <RadialGradient id="emberGlow" cx="0.5" cy="0.5">
            <Stop offset="0" stopColor={c.warmup} stopOpacity="0.55" />
            <Stop offset="1" stopColor={c.warmup} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="goldGlow" cx="0.5" cy="0.5">
            <Stop offset="0" stopColor={c.gold} stopOpacity="0.32" />
            <Stop offset="1" stopColor={c.gold} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="sky" cx="0.5" cy="0">
            <Stop offset="0" stopColor={c.accent} stopOpacity="0.16" />
            <Stop offset="1" stopColor={c.accent} stopOpacity="0" />
          </RadialGradient>
          <ClipPath id="cardClip">
            <Rect width={W} height={H} />
          </ClipPath>
        </Defs>

        <G clipPath="url(#cardClip)">
          {/* ===== Atmospheric backdrop ===== */}

          {/* Sky wash for higher tiers */}
          {t >= 7 && <Rect x={0} y={0} width={W} height={H} fill="url(#sky)" />}

          {/* Distant mountains (year + aurora) — keep but softer */}
          {t >= 8 && (
            <Path
              d={`M0 ${GROUND_Y - 16} L22 ${GROUND_Y - 28} L40 ${GROUND_Y - 18} L58 ${GROUND_Y - 30} L80 ${GROUND_Y - 20} L100 ${GROUND_Y - 28} L${W} ${GROUND_Y - 20} L${W} ${GROUND_Y} L0 ${GROUND_Y} Z`}
              fill={c.surface3}
              opacity={0.4}
            />
          )}

          {/* Glow halos */}
          {tier === 'ember' && (
            <Circle cx={W / 2} cy={GROUND_Y - 22} r={36} fill="url(#emberGlow)" />
          )}
          {(tier === 'bloom' || tier === 'flourish' || tier === 'radiance') && (
            <Circle cx={W / 2} cy={GROUND_Y - 60} r={48} fill="url(#goldGlow)" />
          )}

          {/* ===== Ground (for all tiers except pure ember) ===== */}
          {t >= 1 && (
            <G>
              <Path
                d={`M5 ${GROUND_Y + 4} Q${W / 2} ${GROUND_Y - 1} ${W - 5} ${GROUND_Y + 4}`}
                stroke="#8b6f47" strokeWidth={3} fill="none" opacity={0.55}
              />
              {/* Soil mounds */}
              <Ellipse cx={42} cy={GROUND_Y + 2} rx={5} ry={1.4} fill="#5d4a32" opacity={0.7} />
              <Ellipse cx={88} cy={GROUND_Y + 2} rx={6} ry={1.6} fill="#5d4a32" opacity={0.7} />
              <Ellipse cx={W - 26} cy={GROUND_Y + 3} rx={3} ry={1} fill="#5d4a32" opacity={0.55} />
              <Ellipse cx={26} cy={GROUND_Y + 3} rx={3} ry={1} fill="#5d4a32" opacity={0.55} />
              {/* Side grass blades for higher tiers */}
              {t >= 5 && (
                <>
                  <Path d={`M18 ${GROUND_Y} Q16 ${GROUND_Y - 8} 20 ${GROUND_Y - 14}`} stroke={c.tealSoft} strokeWidth={1} fill="none" opacity={0.6} />
                  <Path d={`M122 ${GROUND_Y} Q126 ${GROUND_Y - 10} 122 ${GROUND_Y - 16}`} stroke={c.tealSoft} strokeWidth={1} fill="none" opacity={0.6} />
                </>
              )}
            </G>
          )}

          {/* ===== TIER-SPECIFIC bodies ===== */}

          {/* Ember (t=0): layered flame */}
          {tier === 'ember' && (
            <G>
              {/* outer flame body */}
              <Path
                d={`M${W / 2} ${GROUND_Y - 5} Q${W / 2 - 12} ${GROUND_Y - 22} ${W / 2 - 7} ${GROUND_Y - 38} Q${W / 2 - 2} ${GROUND_Y - 30} ${W / 2} ${GROUND_Y - 46} Q${W / 2 + 6} ${GROUND_Y - 30} ${W / 2 + 9} ${GROUND_Y - 38} Q${W / 2 + 14} ${GROUND_Y - 22} ${W / 2} ${GROUND_Y - 5} Z`}
                fill="url(#flame)"
              />
              {/* inner flame */}
              <Path
                d={`M${W / 2} ${GROUND_Y - 12} Q${W / 2 - 6} ${GROUND_Y - 22} ${W / 2 - 3} ${GROUND_Y - 32} Q${W / 2} ${GROUND_Y - 26} ${W / 2} ${GROUND_Y - 38} Q${W / 2 + 4} ${GROUND_Y - 26} ${W / 2 + 5} ${GROUND_Y - 32} Q${W / 2 + 8} ${GROUND_Y - 22} ${W / 2} ${GROUND_Y - 12} Z`}
                fill="url(#flameInner)"
                opacity={0.85}
              />
              {/* core */}
              <Path
                d={`M${W / 2} ${GROUND_Y - 16} Q${W / 2 - 3} ${GROUND_Y - 22} ${W / 2 - 1} ${GROUND_Y - 28} Q${W / 2} ${GROUND_Y - 24} ${W / 2 + 2} ${GROUND_Y - 28} Q${W / 2 + 4} ${GROUND_Y - 22} ${W / 2} ${GROUND_Y - 16} Z`}
                fill={c.goldPale}
                opacity={0.7}
              />
              {/* ember coals at base */}
              <Circle cx={W / 2 - 6} cy={GROUND_Y - 4} r={2.4} fill="#ff6b35" opacity={0.85} />
              <Circle cx={W / 2 + 6} cy={GROUND_Y - 3} r={1.8} fill="#ff6b35" opacity={0.85} />
              <Circle cx={W / 2 - 4} cy={GROUND_Y - 2.5} r={1} fill={c.goldPale} opacity={0.9} />
            </G>
          )}

          {/* Seed (t=1): seed on soil with crack */}
          {tier === 'seed' && (
            <G>
              <Ellipse cx={W / 2} cy={GROUND_Y - 5} rx={8} ry={5.5} fill={c.warmBright} />
              <Ellipse cx={W / 2 - 1.5} cy={GROUND_Y - 6.5} rx={3} ry={1.5} fill={c.goldPale} opacity={0.7} />
              {/* split/crack hint */}
              <Path
                d={`M${W / 2 - 1} ${GROUND_Y - 8} Q${W / 2} ${GROUND_Y - 5} ${W / 2 + 0.5} ${GROUND_Y - 2}`}
                stroke="#5d4a32" strokeWidth={0.6} fill="none" opacity={0.7}
              />
              {/* faint sprout tip emerging */}
              <Path d={`M${W / 2} ${GROUND_Y - 10} L${W / 2} ${GROUND_Y - 13}`} stroke={c.tealSoft} strokeWidth={1.2} opacity={0.5} />
            </G>
          )}

          {/* Spark (t=2): tiny sprout with 1 curled leaf */}
          {tier === 'spark' && (
            <G>
              <Path
                d={`M${W / 2} ${GROUND_Y} Q${W / 2 - 1} ${GROUND_Y - 12} ${W / 2} ${GROUND_Y - 22}`}
                stroke="url(#stem)" strokeWidth={2.5} fill="none" strokeLinecap="round"
              />
              <Path
                d={`M${W / 2} ${GROUND_Y - 18} Q${W / 2 - 8} ${GROUND_Y - 22} ${W / 2 - 12} ${GROUND_Y - 16}`}
                stroke="url(#leaf)" strokeWidth={3} fill="none" strokeLinecap="round"
              />
            </G>
          )}

          {/* Sprout (t=3): stem + 3 leaves */}
          {tier === 'sprout' && (
            <G>
              <Path
                d={`M${W / 2} ${GROUND_Y} Q${W / 2 - 2} ${GROUND_Y - 18} ${W / 2} ${GROUND_Y - 36} Q${W / 2 + 2} ${GROUND_Y - 44} ${W / 2} ${GROUND_Y - 50}`}
                stroke="url(#stem)" strokeWidth={3} fill="none" strokeLinecap="round"
              />
              <Leaf cx={W / 2 - 12} cy={GROUND_Y - 24} rotation={-25} c={c} />
              <Leaf cx={W / 2 + 13} cy={GROUND_Y - 36} rotation={25} c={c} />
              <Leaf cx={W / 2 - 11} cy={GROUND_Y - 46} rx={9} ry={4} rotation={-30} c={c} />
              <Dew cx={W / 2 + 18} cy={GROUND_Y - 34} size={1.2} />
            </G>
          )}

          {/* Bud (t=4): stem + 4 leaves + closed bud */}
          {tier === 'bud' && (
            <G>
              <Path
                d={`M${W / 2} ${GROUND_Y} Q${W / 2 - 2} ${GROUND_Y - 24} ${W / 2} ${GROUND_Y - 48} Q${W / 2 + 1} ${GROUND_Y - 58} ${W / 2} ${GROUND_Y - 66}`}
                stroke="url(#stem)" strokeWidth={3.2} fill="none" strokeLinecap="round"
              />
              <Leaf cx={W / 2 - 12} cy={GROUND_Y - 22} rotation={-25} c={c} />
              <Leaf cx={W / 2 + 13} cy={GROUND_Y - 34} rotation={25} c={c} />
              <Leaf cx={W / 2 - 12} cy={GROUND_Y - 46} rotation={-25} c={c} />
              <Leaf cx={W / 2 + 12} cy={GROUND_Y - 58} rx={9} ry={4} rotation={25} c={c} />
              {/* closed bud */}
              <G>
                <Ellipse cx={W / 2} cy={GROUND_Y - 70} rx={5.5} ry={8.5} fill="url(#petalWarm)" />
                <Ellipse cx={W / 2 - 1} cy={GROUND_Y - 72} rx={2} ry={3.5} fill={c.goldPale} opacity={0.6} />
                {/* sepals */}
                <Path d={`M${W / 2 - 4} ${GROUND_Y - 64} L${W / 2 - 5} ${GROUND_Y - 60} L${W / 2 - 2} ${GROUND_Y - 62} Z`} fill="url(#leaf)" />
                <Path d={`M${W / 2 + 4} ${GROUND_Y - 64} L${W / 2 + 5} ${GROUND_Y - 60} L${W / 2 + 2} ${GROUND_Y - 62} Z`} fill="url(#leaf)" />
              </G>
              <Dew cx={W / 2 + 18} cy={GROUND_Y - 30} size={1.2} />
            </G>
          )}

          {/* Bloom (t=5): open flower with more leaves + side bud */}
          {tier === 'bloom' && (
            <G>
              <Path
                d={`M${W / 2} ${GROUND_Y} Q${W / 2 - 2} ${GROUND_Y - 26} ${W / 2} ${GROUND_Y - 52} Q${W / 2 + 1} ${GROUND_Y - 62} ${W / 2} ${GROUND_Y - 68}`}
                stroke="url(#stem)" strokeWidth={3.2} fill="none" strokeLinecap="round"
              />
              {/* side stem with bud */}
              <Path
                d={`M${W / 2} ${GROUND_Y - 40} Q${W / 2 + 14} ${GROUND_Y - 48} ${W / 2 + 18} ${GROUND_Y - 58}`}
                stroke="url(#stem)" strokeWidth={2} fill="none" strokeLinecap="round"
              />
              <Leaf cx={W / 2 - 13} cy={GROUND_Y - 22} rotation={-25} c={c} />
              <Leaf cx={W / 2 + 13} cy={GROUND_Y - 32} rotation={25} c={c} />
              <Leaf cx={W / 2 - 13} cy={GROUND_Y - 44} rotation={-25} c={c} />
              <Leaf cx={W / 2 + 12} cy={GROUND_Y - 56} rx={9} ry={4} rotation={25} c={c} />
              <Leaf cx={W / 2 + 4} cy={GROUND_Y - 64} rx={6} ry={3} rotation={15} c={c} />
              <Leaf cx={W / 2 - 6} cy={GROUND_Y - 60} rx={6} ry={3} rotation={-15} c={c} />
              {/* small closed bud on side stem */}
              <Ellipse cx={W / 2 + 18} cy={GROUND_Y - 60} rx={3.5} ry={5} fill="url(#petalWarm)" />
              <Path d={`M${W / 2 + 15} ${GROUND_Y - 56} L${W / 2 + 14} ${GROUND_Y - 52} L${W / 2 + 17} ${GROUND_Y - 54} Z`} fill="url(#leaf)" />
              {/* main flower */}
              <Flower cx={W / 2} cy={GROUND_Y - 72} petalFill="url(#petalWarm)" centerFill={c.accent} c={c} />
              <Dew cx={W / 2 + 22} cy={GROUND_Y - 30} size={1.4} />
            </G>
          )}

          {/* Flourish (t=6): multi-flower bouquet — more leaves + a 4th smaller flower */}
          {tier === 'flourish' && (
            <G>
              {/* central stem */}
              <Path
                d={`M${W / 2} ${GROUND_Y} Q${W / 2 - 1} ${GROUND_Y - 30} ${W / 2} ${GROUND_Y - 60} Q${W / 2 + 1} ${GROUND_Y - 70} ${W / 2} ${GROUND_Y - 76}`}
                stroke="url(#stem)" strokeWidth={3.2} fill="none" strokeLinecap="round"
              />
              {/* side stems */}
              <Path
                d={`M${W / 2} ${GROUND_Y - 30} Q${W / 2 - 14} ${GROUND_Y - 40} ${W / 2 - 18} ${GROUND_Y - 56}`}
                stroke="url(#stem)" strokeWidth={2} fill="none" strokeLinecap="round"
              />
              <Path
                d={`M${W / 2} ${GROUND_Y - 40} Q${W / 2 + 14} ${GROUND_Y - 48} ${W / 2 + 16} ${GROUND_Y - 62}`}
                stroke="url(#stem)" strokeWidth={2} fill="none" strokeLinecap="round"
              />
              {/* third smaller side stem */}
              <Path
                d={`M${W / 2} ${GROUND_Y - 52} Q${W / 2 - 10} ${GROUND_Y - 58} ${W / 2 - 12} ${GROUND_Y - 68}`}
                stroke="url(#stem)" strokeWidth={1.6} fill="none" strokeLinecap="round"
              />
              {/* leaves */}
              <Leaf cx={W / 2 - 13} cy={GROUND_Y - 22} rotation={-25} c={c} />
              <Leaf cx={W / 2 + 13} cy={GROUND_Y - 24} rotation={25} c={c} />
              <Leaf cx={W / 2 - 7} cy={GROUND_Y - 42} rx={8} ry={3.5} rotation={-30} c={c} />
              <Leaf cx={W / 2 + 7} cy={GROUND_Y - 50} rx={7} ry={3.2} rotation={30} c={c} />
              <Leaf cx={W / 2 - 18} cy={GROUND_Y - 42} rx={6} ry={2.8} rotation={-45} c={c} />
              <Leaf cx={W / 2 + 18} cy={GROUND_Y - 52} rx={6} ry={2.8} rotation={45} c={c} />
              {/* flowers */}
              <Flower cx={W / 2 - 18} cy={GROUND_Y - 60} scale={0.75} petalFill="url(#petalWarm)" centerFill={c.warmup} c={c} />
              <Flower cx={W / 2 + 16} cy={GROUND_Y - 66} scale={0.8} petalFill="url(#petalGold)" centerFill={c.warmBright} c={c} />
              <Flower cx={W / 2} cy={GROUND_Y - 80} scale={1} petalFill="url(#petalWarm)" centerFill={c.gold} c={c} />
              <Flower cx={W / 2 - 12} cy={GROUND_Y - 72} scale={0.5} petalFill="url(#petalGold)" centerFill={c.gold} c={c} />
              {/* small bud on stem */}
              <Ellipse cx={W / 2 + 10} cy={GROUND_Y - 58} rx={2} ry={3} fill="url(#petalGold)" />
              <Dew cx={W / 2 + 24} cy={GROUND_Y - 40} size={1.4} />
            </G>
          )}

          {/* Radiance (t=7): flourish bouquet + glow halo + sparkles + extras */}
          {tier === 'radiance' && (
            <G>
              {/* central stem (taller than flourish) */}
              <Path
                d={`M${W / 2} ${GROUND_Y} Q${W / 2 - 1} ${GROUND_Y - 32} ${W / 2} ${GROUND_Y - 64} Q${W / 2 + 1} ${GROUND_Y - 74} ${W / 2} ${GROUND_Y - 82}`}
                stroke="url(#stem)" strokeWidth={3.5} fill="none" strokeLinecap="round"
              />
              {/* 3 side stems */}
              <Path d={`M${W / 2} ${GROUND_Y - 32} Q${W / 2 - 14} ${GROUND_Y - 42} ${W / 2 - 20} ${GROUND_Y - 60}`}
                    stroke="url(#stem)" strokeWidth={2.2} fill="none" strokeLinecap="round" />
              <Path d={`M${W / 2} ${GROUND_Y - 42} Q${W / 2 + 14} ${GROUND_Y - 50} ${W / 2 + 18} ${GROUND_Y - 66}`}
                    stroke="url(#stem)" strokeWidth={2.2} fill="none" strokeLinecap="round" />
              <Path d={`M${W / 2} ${GROUND_Y - 54} Q${W / 2 - 10} ${GROUND_Y - 60} ${W / 2 - 14} ${GROUND_Y - 72}`}
                    stroke="url(#stem)" strokeWidth={1.7} fill="none" strokeLinecap="round" />

              {/* 10 leaves */}
              <Leaf cx={W / 2 - 13} cy={GROUND_Y - 22} rotation={-25} c={c} />
              <Leaf cx={W / 2 + 13} cy={GROUND_Y - 24} rotation={25} c={c} />
              <Leaf cx={W / 2 - 7} cy={GROUND_Y - 42} rx={8} ry={3.5} rotation={-30} c={c} />
              <Leaf cx={W / 2 + 7} cy={GROUND_Y - 50} rx={7} ry={3.2} rotation={30} c={c} />
              <Leaf cx={W / 2 - 18} cy={GROUND_Y - 44} rx={6} ry={2.8} rotation={-45} c={c} />
              <Leaf cx={W / 2 + 18} cy={GROUND_Y - 54} rx={6} ry={2.8} rotation={45} c={c} />
              <Leaf cx={W / 2 - 14} cy={GROUND_Y - 62} rx={5.5} ry={2.6} rotation={-35} c={c} />
              <Leaf cx={W / 2 + 14} cy={GROUND_Y - 66} rx={5.5} ry={2.6} rotation={35} c={c} />
              <Leaf cx={W / 2 - 5} cy={GROUND_Y - 74} rx={5} ry={2.4} rotation={-15} c={c} />
              <Leaf cx={W / 2 + 5} cy={GROUND_Y - 74} rx={5} ry={2.4} rotation={15} c={c} />

              {/* glow halo behind central flower */}
              <Circle cx={W / 2} cy={GROUND_Y - 86} r={32} stroke={c.gold} strokeWidth={1} fill="none" opacity={0.4} />
              <Circle cx={W / 2} cy={GROUND_Y - 86} r={24} stroke={c.goldPale} strokeWidth={0.7} fill="none" opacity={0.55} />
              <Circle cx={W / 2} cy={GROUND_Y - 86} r={40} fill="url(#goldGlow)" opacity={0.5} />

              {/* 5 flowers — bouquet plus elevated central */}
              <Flower cx={W / 2 - 20} cy={GROUND_Y - 62} scale={0.7} petalFill="url(#petalWarm)" centerFill={c.warmup} c={c} />
              <Flower cx={W / 2 + 18} cy={GROUND_Y - 68} scale={0.75} petalFill="url(#petalGold)" centerFill={c.warmBright} c={c} />
              <Flower cx={W / 2 - 14} cy={GROUND_Y - 74} scale={0.55} petalFill="url(#petalGold)" centerFill={c.gold} c={c} />
              <Flower cx={W / 2 + 6} cy={GROUND_Y - 76} scale={0.6} petalFill="url(#petalWarm)" centerFill={c.warmBright} c={c} />
              <Flower cx={W / 2} cy={GROUND_Y - 86} scale={1.3} petalFill="url(#petalGold)" centerFill={c.gold} c={c} />

              {/* 2 small buds */}
              <Ellipse cx={W / 2 + 22} cy={GROUND_Y - 52} rx={2} ry={3} fill="url(#petalGold)" />
              <Ellipse cx={W / 2 - 22} cy={GROUND_Y - 50} rx={2} ry={3} fill="url(#petalWarm)" />

              {/* 6 sparkles around */}
              <Circle cx={W / 2 - 30} cy={GROUND_Y - 96} r={1} fill={c.goldPale} />
              <Circle cx={W / 2 + 28} cy={GROUND_Y - 90} r={1.2} fill={c.goldPale} />
              <Circle cx={W / 2 - 24} cy={GROUND_Y - 74} r={0.8} fill={c.goldPale} opacity={0.7} />
              <Circle cx={W / 2 + 22} cy={GROUND_Y - 102} r={0.9} fill={c.goldPale} opacity={0.8} />
              <Circle cx={W / 2 + 34} cy={GROUND_Y - 80} r={0.7} fill={c.goldPale} opacity={0.6} />
              <Circle cx={W / 2 - 34} cy={GROUND_Y - 84} r={0.7} fill={c.goldPale} opacity={0.6} />

              {/* 2 dew drops */}
              <Dew cx={W / 2 + 26} cy={GROUND_Y - 40} size={1.4} />
              <Dew cx={W / 2 - 24} cy={GROUND_Y - 32} size={1.3} />
            </G>
          )}

          {/* Year (t=8): tree with visible branches + many individual leaves + a few flowers */}
          {tier === 'year' && (
            <G>
              {/* trunk */}
              <Path
                d={`M${W / 2 - 6} ${GROUND_Y} L${W / 2 - 5} ${GROUND_Y - 52} L${W / 2 + 5} ${GROUND_Y - 52} L${W / 2 + 6} ${GROUND_Y} Z`}
                fill="url(#trunk)"
              />
              {/* bark detail */}
              <Line x1={W / 2 - 2} y1={GROUND_Y - 10} x2={W / 2 - 1} y2={GROUND_Y - 40} stroke="#3d2a18" strokeWidth={0.6} opacity={0.6} />
              <Line x1={W / 2 + 2} y1={GROUND_Y - 15} x2={W / 2 + 2.5} y2={GROUND_Y - 42} stroke="#3d2a18" strokeWidth={0.5} opacity={0.5} />
              <Line x1={W / 2} y1={GROUND_Y - 8} x2={W / 2 + 0.5} y2={GROUND_Y - 28} stroke="#5d4a32" strokeWidth={0.4} opacity={0.45} />
              {/* main branches — 3 visible */}
              <Path d={`M${W / 2 - 4} ${GROUND_Y - 52} Q${W / 2 - 18} ${GROUND_Y - 56} ${W / 2 - 26} ${GROUND_Y - 66}`}
                    stroke="url(#trunk)" strokeWidth={3} fill="none" strokeLinecap="round" />
              <Path d={`M${W / 2 + 4} ${GROUND_Y - 52} Q${W / 2 + 18} ${GROUND_Y - 56} ${W / 2 + 26} ${GROUND_Y - 66}`}
                    stroke="url(#trunk)" strokeWidth={3} fill="none" strokeLinecap="round" />
              <Path d={`M${W / 2} ${GROUND_Y - 52} Q${W / 2 + 2} ${GROUND_Y - 75} ${W / 2} ${GROUND_Y - 92}`}
                    stroke="url(#trunk)" strokeWidth={2.5} fill="none" strokeLinecap="round" />
              {/* background canopy blobs (softer than before) */}
              <Circle cx={W / 2} cy={GROUND_Y - 76} r={28} fill="url(#canopy)" opacity={0.55} />
              <Circle cx={W / 2 - 18} cy={GROUND_Y - 66} r={18} fill="url(#canopy)" opacity={0.5} />
              <Circle cx={W / 2 + 20} cy={GROUND_Y - 66} r={18} fill="url(#canopy)" opacity={0.5} />
              <Circle cx={W / 2 - 4} cy={GROUND_Y - 92} r={14} fill="url(#canopy)" opacity={0.45} />
              {/* individual leaves along branches */}
              <Leaf cx={W / 2 - 16} cy={GROUND_Y - 58} rx={5.5} ry={2.8} rotation={-25} c={c} />
              <Leaf cx={W / 2 - 24} cy={GROUND_Y - 64} rx={5} ry={2.5} rotation={-35} c={c} />
              <Leaf cx={W / 2 - 22} cy={GROUND_Y - 52} rx={4} ry={2} rotation={-50} c={c} />
              <Leaf cx={W / 2 + 16} cy={GROUND_Y - 58} rx={5.5} ry={2.8} rotation={25} c={c} />
              <Leaf cx={W / 2 + 24} cy={GROUND_Y - 64} rx={5} ry={2.5} rotation={35} c={c} />
              <Leaf cx={W / 2 + 22} cy={GROUND_Y - 52} rx={4} ry={2} rotation={50} c={c} />
              <Leaf cx={W / 2 - 10} cy={GROUND_Y - 78} rx={5} ry={2.5} rotation={-15} c={c} />
              <Leaf cx={W / 2 + 10} cy={GROUND_Y - 78} rx={5} ry={2.5} rotation={15} c={c} />
              <Leaf cx={W / 2 - 4} cy={GROUND_Y - 90} rx={4.5} ry={2.3} rotation={-10} c={c} />
              <Leaf cx={W / 2 + 4} cy={GROUND_Y - 90} rx={4.5} ry={2.3} rotation={10} c={c} />
              {/* fruits + a couple flowers scattered */}
              <Circle cx={W / 2 - 12} cy={GROUND_Y - 70} r={2.5} fill={c.gold} />
              <Circle cx={W / 2 + 16} cy={GROUND_Y - 78} r={2.5} fill={c.gold} />
              <Flower cx={W / 2 - 18} cy={GROUND_Y - 80} scale={0.5} petalFill="url(#petalWarm)" centerFill={c.warmBright} c={c} />
              <Flower cx={W / 2 + 22} cy={GROUND_Y - 86} scale={0.5} petalFill="url(#petalGold)" centerFill={c.gold} c={c} />
              <Flower cx={W / 2 + 2} cy={GROUND_Y - 94} scale={0.45} petalFill="url(#petalWarm)" centerFill={c.warmup} c={c} />
              {/* subtle canopy highlight */}
              <Ellipse cx={W / 2 + 8} cy={GROUND_Y - 78} rx={6} ry={4} fill={c.goldPale} opacity={0.18} />
            </G>
          )}

          {/* Aurora (t=9): tree of life — dense foliage, many branches, scattered flowers */}
          {tier === 'aurora' && (
            <G>
              {/* warm halo behind canopy */}
              <Circle cx={W / 2} cy={GROUND_Y - 82} r={62} fill="url(#goldGlow)" opacity={0.65} />

              {/* trunk + bark detail */}
              <Path
                d={`M${W / 2 - 7} ${GROUND_Y} L${W / 2 - 5} ${GROUND_Y - 50} L${W / 2 + 5} ${GROUND_Y - 50} L${W / 2 + 7} ${GROUND_Y} Z`}
                fill="url(#trunk)"
              />
              <Line x1={W / 2 - 2.5} y1={GROUND_Y - 8} x2={W / 2 - 1.5} y2={GROUND_Y - 42} stroke="#3d2a18" strokeWidth={0.7} opacity={0.7} />
              <Line x1={W / 2 + 2.5} y1={GROUND_Y - 12} x2={W / 2 + 3} y2={GROUND_Y - 44} stroke="#3d2a18" strokeWidth={0.6} opacity={0.6} />
              <Line x1={W / 2} y1={GROUND_Y - 6} x2={W / 2 + 0.5} y2={GROUND_Y - 30} stroke="#5d4a32" strokeWidth={0.5} opacity={0.5} />

              {/* 5 main branches — curved out + up */}
              <Path d={`M${W / 2 - 4} ${GROUND_Y - 50} Q${W / 2 - 22} ${GROUND_Y - 52} ${W / 2 - 36} ${GROUND_Y - 64}`}
                    stroke="url(#trunk)" strokeWidth={3.5} fill="none" strokeLinecap="round" />
              <Path d={`M${W / 2 + 4} ${GROUND_Y - 50} Q${W / 2 + 22} ${GROUND_Y - 52} ${W / 2 + 36} ${GROUND_Y - 64}`}
                    stroke="url(#trunk)" strokeWidth={3.5} fill="none" strokeLinecap="round" />
              <Path d={`M${W / 2 - 3} ${GROUND_Y - 56} Q${W / 2 - 16} ${GROUND_Y - 76} ${W / 2 - 22} ${GROUND_Y - 96}`}
                    stroke="url(#trunk)" strokeWidth={2.8} fill="none" strokeLinecap="round" />
              <Path d={`M${W / 2 + 3} ${GROUND_Y - 56} Q${W / 2 + 16} ${GROUND_Y - 76} ${W / 2 + 22} ${GROUND_Y - 96}`}
                    stroke="url(#trunk)" strokeWidth={2.8} fill="none" strokeLinecap="round" />
              <Path d={`M${W / 2} ${GROUND_Y - 58} Q${W / 2 + 3} ${GROUND_Y - 84} ${W / 2} ${GROUND_Y - 108}`}
                    stroke="url(#trunk)" strokeWidth={2.5} fill="none" strokeLinecap="round" />

              {/* twigs */}
              <Path d={`M${W / 2 - 30} ${GROUND_Y - 62} Q${W / 2 - 34} ${GROUND_Y - 72} ${W / 2 - 28} ${GROUND_Y - 82}`}
                    stroke="url(#trunk)" strokeWidth={1.7} fill="none" strokeLinecap="round" />
              <Path d={`M${W / 2 + 30} ${GROUND_Y - 62} Q${W / 2 + 34} ${GROUND_Y - 72} ${W / 2 + 28} ${GROUND_Y - 82}`}
                    stroke="url(#trunk)" strokeWidth={1.7} fill="none" strokeLinecap="round" />
              <Path d={`M${W / 2 - 18} ${GROUND_Y - 86} Q${W / 2 - 26} ${GROUND_Y - 92} ${W / 2 - 32} ${GROUND_Y - 88}`}
                    stroke="url(#trunk)" strokeWidth={1.6} fill="none" strokeLinecap="round" />
              <Path d={`M${W / 2 + 18} ${GROUND_Y - 88} Q${W / 2 + 26} ${GROUND_Y - 94} ${W / 2 + 32} ${GROUND_Y - 90}`}
                    stroke="url(#trunk)" strokeWidth={1.6} fill="none" strokeLinecap="round" />

              {/* background canopy fills — soft */}
              <Circle cx={W / 2} cy={GROUND_Y - 76} r={32} fill="url(#canopy)" opacity={0.5} />
              <Circle cx={W / 2 - 22} cy={GROUND_Y - 66} r={20} fill="url(#canopy)" opacity={0.45} />
              <Circle cx={W / 2 + 24} cy={GROUND_Y - 66} r={22} fill="url(#canopy)" opacity={0.45} />
              <Circle cx={W / 2 - 10} cy={GROUND_Y - 92} r={18} fill="url(#canopy)" opacity={0.4} />
              <Circle cx={W / 2 + 12} cy={GROUND_Y - 94} r={16} fill="url(#canopy)" opacity={0.4} />
              <Circle cx={W / 2 - 2} cy={GROUND_Y - 106} r={11} fill="url(#canopy)" opacity={0.38} />

              {/* MANY individual leaves */}
              {/* Left lower branch */}
              <Leaf cx={W / 2 - 16} cy={GROUND_Y - 54} rx={5.5} ry={2.8} rotation={-30} c={c} />
              <Leaf cx={W / 2 - 24} cy={GROUND_Y - 60} rx={5} ry={2.5} rotation={-35} c={c} />
              <Leaf cx={W / 2 - 32} cy={GROUND_Y - 66} rx={5.5} ry={2.8} rotation={-30} c={c} />
              <Leaf cx={W / 2 - 28} cy={GROUND_Y - 50} rx={4} ry={2} rotation={-55} c={c} />
              <Leaf cx={W / 2 - 36} cy={GROUND_Y - 62} rx={4.5} ry={2.2} rotation={-25} c={c} />
              {/* Right lower branch */}
              <Leaf cx={W / 2 + 16} cy={GROUND_Y - 54} rx={5.5} ry={2.8} rotation={30} c={c} />
              <Leaf cx={W / 2 + 24} cy={GROUND_Y - 60} rx={5} ry={2.5} rotation={35} c={c} />
              <Leaf cx={W / 2 + 32} cy={GROUND_Y - 66} rx={5.5} ry={2.8} rotation={30} c={c} />
              <Leaf cx={W / 2 + 28} cy={GROUND_Y - 50} rx={4} ry={2} rotation={55} c={c} />
              <Leaf cx={W / 2 + 36} cy={GROUND_Y - 62} rx={4.5} ry={2.2} rotation={25} c={c} />
              {/* Left upper branch */}
              <Leaf cx={W / 2 - 10} cy={GROUND_Y - 68} rx={5} ry={2.5} rotation={-20} c={c} />
              <Leaf cx={W / 2 - 16} cy={GROUND_Y - 80} rx={5.5} ry={2.8} rotation={-30} c={c} />
              <Leaf cx={W / 2 - 22} cy={GROUND_Y - 92} rx={5} ry={2.5} rotation={-35} c={c} />
              <Leaf cx={W / 2 - 28} cy={GROUND_Y - 84} rx={4} ry={2} rotation={-45} c={c} />
              {/* Right upper branch */}
              <Leaf cx={W / 2 + 10} cy={GROUND_Y - 68} rx={5} ry={2.5} rotation={20} c={c} />
              <Leaf cx={W / 2 + 16} cy={GROUND_Y - 80} rx={5.5} ry={2.8} rotation={30} c={c} />
              <Leaf cx={W / 2 + 22} cy={GROUND_Y - 92} rx={5} ry={2.5} rotation={35} c={c} />
              <Leaf cx={W / 2 + 28} cy={GROUND_Y - 84} rx={4} ry={2} rotation={45} c={c} />
              {/* Top center */}
              <Leaf cx={W / 2 - 4} cy={GROUND_Y - 96} rx={4.5} ry={2.3} rotation={-10} c={c} />
              <Leaf cx={W / 2 + 4} cy={GROUND_Y - 96} rx={4.5} ry={2.3} rotation={10} c={c} />
              <Leaf cx={W / 2 - 5} cy={GROUND_Y - 106} rx={3.5} ry={1.8} rotation={-15} c={c} />
              <Leaf cx={W / 2 + 5} cy={GROUND_Y - 106} rx={3.5} ry={1.8} rotation={15} c={c} />

              {/* 7 flowers scattered through canopy */}
              <Flower cx={W / 2 - 20} cy={GROUND_Y - 88} scale={0.65} petalFill="url(#petalGold)" centerFill={c.gold} c={c} />
              <Flower cx={W / 2 + 22} cy={GROUND_Y - 82} scale={0.7} petalFill="url(#petalWarm)" centerFill={c.warmBright} c={c} />
              <Flower cx={W / 2 + 8} cy={GROUND_Y - 102} scale={0.55} petalFill="url(#petalGold)" centerFill={c.gold} c={c} />
              <Flower cx={W / 2 - 28} cy={GROUND_Y - 58} scale={0.55} petalFill="url(#petalWarm)" centerFill={c.warmBright} c={c} />
              <Flower cx={W / 2 - 4} cy={GROUND_Y - 80} scale={0.75} petalFill="url(#petalGold)" centerFill={c.gold} c={c} />
              <Flower cx={W / 2 + 28} cy={GROUND_Y - 100} scale={0.5} petalFill="url(#petalWarm)" centerFill={c.warmBright} c={c} />
              <Flower cx={W / 2 + 32} cy={GROUND_Y - 56} scale={0.5} petalFill="url(#petalGold)" centerFill={c.gold} c={c} />

              {/* 4 gold fruits (carry over from year tier) */}
              <Circle cx={W / 2 - 14} cy={GROUND_Y - 72} r={2.5} fill={c.gold} />
              <Circle cx={W / 2 + 14} cy={GROUND_Y - 76} r={2.5} fill={c.gold} />
              <Circle cx={W / 2 - 26} cy={GROUND_Y - 78} r={2.2} fill={c.goldPale} />
              <Circle cx={W / 2 + 4} cy={GROUND_Y - 92} r={2.2} fill={c.goldPale} />

              {/* small buds at branch tips */}
              <Ellipse cx={W / 2 + 38} cy={GROUND_Y - 70} rx={2} ry={3} fill="url(#petalGold)" />
              <Ellipse cx={W / 2 - 24} cy={GROUND_Y - 100} rx={1.8} ry={2.5} fill="url(#petalWarm)" />
              <Ellipse cx={W / 2 - 34} cy={GROUND_Y - 86} rx={1.6} ry={2.2} fill="url(#petalGold)" />

              {/* fallen petals on ground */}
              <Ellipse cx={W / 2 - 38} cy={GROUND_Y + 2} rx={2.5} ry={1.5} fill="url(#petalWarm)" opacity={0.75}
                       originX={W / 2 - 38} originY={GROUND_Y + 2} rotation={-20} />
              <Ellipse cx={W / 2 + 36} cy={GROUND_Y + 3} rx={2.5} ry={1.5} fill="url(#petalGold)" opacity={0.75}
                       originX={W / 2 + 36} originY={GROUND_Y + 3} rotation={30} />
              <Ellipse cx={W / 2 - 14} cy={GROUND_Y + 2} rx={2} ry={1.2} fill="url(#petalGold)" opacity={0.7}
                       originX={W / 2 - 14} originY={GROUND_Y + 2} rotation={45} />
              <Ellipse cx={W / 2 + 18} cy={GROUND_Y + 2} rx={2} ry={1.2} fill="url(#petalWarm)" opacity={0.7}
                       originX={W / 2 + 18} originY={GROUND_Y + 2} rotation={-15} />
            </G>
          )}
        </G>
      </Svg>
    </View>
  );
}
