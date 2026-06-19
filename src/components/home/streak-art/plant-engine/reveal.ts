/**
 * Turns a TreeModel (space-colonization node graph) + a maturity value into
 * ready-to-draw flat primitives:
 *   - segments: short parent→node strokes, drawn thick with round caps so the
 *     whole tree reads as smooth tapered tubes (thick trunk → thin twigs).
 *   - leaves: a few large stylized leaves that scale in.
 *
 * Branch width grows with the node's AGE (thin when young, thickening over
 * years), so a young plant is a slender sapling, never a fat stump.
 * Pure & deterministic → easy to unit-test.
 */

import { Decor, SLeaf, SproutModel, TreeModel } from './generateTree';

export interface VisibleSegment {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  color: string;
}

export interface VisibleLeaf {
  id: number;
  x: number;
  y: number;
  rotationDeg: number;
  scale: number;
  variant: number;
  fill: string;
  opacity: number;
}

export interface VisibleDecor {
  id: number;
  type: Decor['type'];
  x: number;
  y: number;
  size: number;
  scale: number;
  fill: string;
  opacity: number;
}

export interface VisibleTree {
  segments: VisibleSegment[];
  leaves: VisibleLeaf[];
  decor: VisibleDecor[];
}

/**
 * Seedling phase: for the first ~2 weeks the plant is an authored sprout
 * (seed husk → green hook → cotyledons → true leaves) with a clear visible
 * change every day. The procedural skeleton only starts at TREE_START and
 * crossfades with the sprout over [FADE_START, FADE_END].
 * (maturity ≈ 0.002/day early on: 0.022 ≈ day 11, 0.06 ≈ day 41)
 */
const SPROUT = { treeStart: 0.022, fadeStart: 0.04, fadeEnd: 0.06 };

/** Every segment starts at this width and thickens toward its Murray target. */
const MIN_WIDTH = 1.3;
/** >1 keeps branches thin while young (no early "stump"); ~1 thickens steadily. */
const THICKEN_EXP = 1.05;
/**
 * Structure (the skeleton / height) grows FASTER early than thickness & leaves:
 * the plant shoots up quickly in the first weeks (thin, few leaves), then
 * thickens and fills out over the years. <1 front-loads the skeleton.
 */
const STRUCTURE_BOOST = 0.6;

/** Eased maturity used for the skeleton/size (faster early growth). */
export function growthMaturity(maturity: number): number {
  return Math.pow(clamp01(maturity), STRUCTURE_BOOST);
}

/**
 * Overall plant scale by maturity: a young plant is a small COMPLETE tree that
 * grows bigger over time (rather than a fraction of a big tree). Applied around
 * the base by the renderer. Exported so previews match the on-device look.
 */
export function plantScale(maturity: number): number {
  // Mild: most size growth now comes from branches extending outward (depth
  // reveal); this just adds a little extra "puffing up" over time.
  return 0.8 + 0.2 * Math.pow(clamp01(maturity), 0.6);
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

function progress(start: number, end: number, m: number): number {
  if (end <= start) return m >= end ? 1 : 0;
  return clamp01((m - start) / (end - start));
}

/**
 * Bark color with age effects:
 *  - `lign` 0→1: a freshly grown segment starts as a soft green shoot and
 *    lignifies into brown over ~the next month (spring-growth feel).
 *  - `moss` 0→1: old low trunk takes a subtle mossy green-grey tint.
 */
function branchColor(depth: number, maxDepth: number, lign: number, moss: number): string {
  const t = clamp01(depth / Math.max(1, maxDepth));
  let h = lerp(104, 26, lign);
  let s = lerp(32, 34, lign);
  let l = lerp(37, lerp(27, 38, t), lign);
  if (moss > 0) {
    h = lerp(h, 96, moss);
    s = lerp(s, 24, moss);
    l = lerp(l, 31, moss);
  }
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

/** Multi-tone canopy; FRESH leaves are brighter/yellower and deepen with age. */
function leafFill(leaf: SLeaf, maturity: number): string {
  const a = clamp01((maturity - leaf.appearStart) / 0.22); // freshness → settled
  const h = leaf.hue - 16 * (1 - a);
  const sat = lerp(48, 58, leaf.shade) + 6 * (1 - a);
  const l = lerp(33, 52, leaf.shade) + 9 * (1 - a);
  return `hsl(${Math.round(h)}, ${Math.round(sat)}%, ${Math.round(l)}%)`;
}

function decorFill(d: Decor): string {
  if (d.type === 'flower') return `hsl(${Math.round(d.hue)}, 70%, 72%)`;
  if (d.type === 'fruit') return `hsl(${Math.round(d.hue)}, 78%, 52%)`;
  return `hsl(${Math.round(d.hue)}, 90%, 78%)`; // spark
}

/**
 * Sprout primitives for the seedling phase, expressed as ordinary segments +
 * leaves so every renderer draws them with zero extra code. Day-by-day script
 * (maturity ≈ 0.002/day): husk on the soil → a green hook emerges (day 1-2) →
 * cotyledons unfold (day 2-4) → stem extends → first true pair (day 6-7) →
 * second pair (day 10-11) → apex leaf (day ~13), then fades into the tree.
 */
function sproutPrimitives(
  sp: SproutModel,
  view: TreeModel['view'],
  m: number,
): { segments: VisibleSegment[]; leaves: VisibleLeaf[] } {
  const segments: VisibleSegment[] = [];
  const leaves: VisibleLeaf[] = [];
  const fade = 1 - progress(SPROUT.fadeStart, SPROUT.fadeEnd, m);
  if (fade <= 0) return { segments, leaves };

  const { baseX, baseY } = view;
  const g = clamp01(m / SPROUT.fadeStart); // 0..1 across the sprout phase
  const jit = sp.jitter * 0.003; // shifts stage timings by up to ~1.5 days

  // seed husk: visible from day 0 (light, so it reads against the dark soil),
  // swallowed by the soil as the shoot rises
  const huskOp = (1 - progress(0.008 + jit, 0.014 + jit, m)) * fade;
  if (huskOp > 0) {
    leaves.push({
      id: 910000,
      x: baseX + 2,
      y: baseY - 2,
      rotationDeg: 105,
      scale: 0.42,
      variant: 1,
      fill: '#bfa06a',
      opacity: huskOp,
    });
  }

  // stem: a gently bowed quadratic curve; the bow relaxes as it straightens.
  // ^0.85 front-loads height, and day 1 is clamped to a clearly visible shoot
  // (the soil mound eats the first ~5px).
  let stemH = 42 * Math.pow(easeOut(g), 0.85);
  if (m > 0) stemH = Math.max(stemH, 9 * clamp01(m / 0.002));
  if (stemH > 0.5) {
    // bow scales with height so a tiny shoot is a compact hook, not a squiggle
    const bow = sp.curve * (1.3 - g) * Math.min(1, stemH / 30);
    const tipX = baseX + Math.sin(sp.lean) * stemH * 0.45 + bow * 0.35;
    const tipY = baseY - stemH;
    const c1x = baseX + bow;
    const c1y = baseY - stemH * 0.55;
    const SAMPLES = 6;
    const qx = (t: number) => (1 - t) * (1 - t) * baseX + 2 * (1 - t) * t * c1x + t * t * tipX;
    const qy = (t: number) => (1 - t) * (1 - t) * baseY + 2 * (1 - t) * t * c1y + t * t * tipY;
    for (let i = 0; i < SAMPLES; i++) {
      const t0 = i / SAMPLES;
      const t1 = (i + 1) / SAMPLES;
      segments.push({
        id: 900000 + i,
        x1: qx(t0),
        y1: qy(t0),
        x2: qx(t1),
        y2: qy(t1),
        width: lerp(2.8, 1.6, t1) * (0.75 + 0.25 * g),
        color: `hsl(108, 38%, ${Math.round(34 - 6 * g)}%)`,
      });
    }

    // leaves along the stem: [maturity it appears, height fraction, side angle°,
    // size, isCotyledon]. Cotyledons ride near the tip; true leaves lower.
    const stages: [number, number, number, number, boolean][] = [
      [0.004, 0.98, -62, sp.cotSize, true],
      [0.005, 0.97, 64, sp.cotSize * 0.95, true],
      [0.012, 0.78, -42, 10.5, false],
      [0.014, 0.72, 46, 10, false],
      [0.02, 0.9, -30, 11.5, false],
      [0.022, 0.86, 33, 11, false],
      [0.027, 1.0, 3, 10, false],
    ];
    let lid = 910001;
    for (const [at, hFrac, angDeg, size, cot] of stages) {
      const p = progress(at + jit, at + jit + 0.004, m); // unfolds over ~2 days
      if (p <= 0) {
        lid++;
        continue;
      }
      const e = easeOut(p);
      const t = hFrac * Math.min(1, stemH / 26 + 0.35); // young stem → leaves near tip
      leaves.push({
        id: lid++,
        x: qx(Math.min(1, t)),
        y: qy(Math.min(1, t)),
        // unfolds outward from pointing straight up
        rotationDeg: angDeg * e + (sp.lean * 180) / Math.PI / 2,
        scale: (size / 18) * e * (cot ? 1 : 0.85 + 0.15 * g),
        variant: cot ? 1 : sp.leafVariant,
        fill: cot
          ? `hsl(${Math.round(sp.hue - 18)}, 46%, 46%)`
          : `hsl(${Math.round(sp.hue)}, 52%, 42%)`,
        opacity: clamp01(p * 1.6) * fade,
      });
    }
  }

  return { segments, leaves };
}

export function getVisibleTree(tree: TreeModel, maturity: number): VisibleTree {
  const nodes = tree.nodes;
  let maxDepth = 1;
  for (const n of nodes) if (n.depth > maxDepth) maxDepth = n.depth;

  // skeleton grows on the boosted timeline; thickness/leaves stay on the real
  // one. The skeleton is also DELAYED so the authored sprout owns the first
  // ~2 weeks, then the tree fades in over the sprout.
  const gm = growthMaturity(clamp01((maturity - SPROUT.treeStart) / (1 - SPROUT.treeStart)));

  const segments: VisibleSegment[] = [];
  for (const n of nodes) {
    if (n.parent < 0) continue; // root has no incoming segment
    const par = nodes[n.parent];
    const p = progress(n.appearStart, n.appearEnd, gm);
    if (p <= 0) continue;

    // segment extends from its parent toward the node as it grows in
    const x2 = par.x + (n.x - par.x) * p;
    const y2 = par.y + (n.y - par.y) * p;

    // age-based thickening on the REAL timeline (thin when young → thick old)
    const denom = Math.max(1e-4, 1 - n.appearStart);
    const age = clamp01((maturity - n.appearStart) / denom);
    const thicken = Math.pow(age, THICKEN_EXP);
    let width = MIN_WIDTH + (n.thickness - MIN_WIDTH) * thicken;
    // root flare: the very base of an old tree widens and "grips" the ground
    if (n.depth <= 1) width *= 1 + 0.45 * progress(0.55, 1, maturity);

    // fresh shoots are green and lignify to brown; old low trunk gets mossy
    const lign = progress(n.appearStart, Math.min(1, n.appearStart + 0.1), maturity);
    const moss = n.depth <= 2 ? 0.4 * progress(0.55, 0.95, maturity) : 0;

    segments.push({
      id: n.id,
      x1: par.x,
      y1: par.y,
      x2,
      y2,
      width: Math.max(MIN_WIDTH, width),
      color: branchColor(n.depth, maxDepth, lign, moss),
    });
  }

  // exposed roots: short stubs fanning from the base at high maturity
  const rootP = progress(0.68, 0.88, maturity);
  if (rootP > 0) {
    const { baseX, baseY } = tree.view;
    const sp = tree.sprout;
    const stubs = [
      { dx: -1, len: 7 + Math.abs(sp.curve) * 0.6, w: 3.4 },
      { dx: 1, len: 6 + sp.jitter * 3, w: 3.0 },
      { dx: sp.lean >= 0 ? -1 : 1, len: 4.5, w: 2.4 },
    ];
    stubs.forEach((st, i) => {
      const e = easeOut(clamp01(rootP * (1 - i * 0.15)));
      if (e <= 0) return;
      segments.push({
        id: 920000 + i,
        x1: baseX + st.dx * 1.5,
        y1: baseY - 1,
        x2: baseX + st.dx * (1.5 + st.len * e),
        y2: baseY + 2.5 * e,
        width: st.w * e,
        color: branchColor(0, maxDepth, 1, 0.4 * progress(0.55, 0.95, maturity)),
      });
    });
  }

  const leaves: VisibleLeaf[] = [];
  for (const lf of tree.leaves) {
    // leaves track the skeleton too → they appear at the tips/frontier as it
    // grows (not lagging behind at the base), and are present from the start.
    const p = progress(lf.appearStart, lf.appearEnd, gm);
    if (p <= 0) continue;
    const e = easeOut(p);
    let scale = (lf.size / 18) * e;
    let opacity = clamp01(p * 1.6);

    // Frontier leaves fade + shrink as the branch grows past them.
    if (lf.disappearStart != null && lf.disappearEnd != null && gm >= lf.disappearStart) {
      const o = progress(lf.disappearStart, lf.disappearEnd, gm);
      if (o >= 1) continue;
      opacity *= 1 - o;
      scale *= lerp(1, 0.55, o);
    }

    leaves.push({
      id: lf.id,
      x: lf.x,
      y: lf.y,
      rotationDeg: (lf.angle * 180) / Math.PI,
      scale,
      variant: lf.variant,
      fill: leafFill(lf, maturity),
      opacity,
    });
  }

  const decor: VisibleDecor[] = [];
  for (const d of tree.decor) {
    const p = progress(d.appearStart, d.appearEnd, maturity);
    if (p <= 0) continue;
    decor.push({
      id: d.id,
      type: d.type,
      x: d.x,
      y: d.y,
      size: d.size,
      scale: easeOut(p),
      fill: decorFill(d),
      opacity: clamp01(p * 1.6),
    });
  }

  // seedling overlay during the first weeks (fades out as the tree fades in)
  if (maturity < SPROUT.fadeEnd) {
    const s = sproutPrimitives(tree.sprout, tree.view, maturity);
    segments.unshift(...s.segments);
    leaves.unshift(...s.leaves);
  }

  return { segments, leaves, decor };
}

/** Unit leaf shape (almond), centered at origin, pointing up (-y), length ~18. */
export function leafPath(variant: number): string {
  const w = [0.46, 0.54, 0.4][variant % 3];
  const L = 18;
  return `M0,0 Q${w * L},${-L * 0.5} 0,${-L} Q${-w * L},${-L * 0.5} 0,0 Z`;
}
