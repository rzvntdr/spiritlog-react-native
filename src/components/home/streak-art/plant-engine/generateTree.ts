/**
 * Procedural tree via the SPACE COLONIZATION algorithm (Runions et al.).
 *
 * Why this algorithm: branches grow iteratively *toward* a cloud of attraction
 * points scattered in the crown area. This produces natural, irregular,
 * asymmetric branching that looks alive — unlike rigid recursive forks. It is
 * also inherently animatable (the tree literally grows outward, node by node).
 *
 * We run it to completion once, deterministically from `seed`, recording the
 * order in which nodes were created. The renderer then reveals nodes up to the
 * current maturity, so the tree keeps a stable identity as it grows (day 200 is
 * the same tree as day 100, further along), while different seeds differ.
 *
 * Thickness comes from Murray's law: a branch's width is derived from how many
 * tips it ultimately feeds → thick trunk, thin twigs, automatically.
 *
 * Tuned for a SIMPLE, modern, flat look: relatively few attractors and a small
 * set of large stylized leaves, not a busy fractal.
 */

import { mulberry32, Rng, rangeFrom } from './prng';

export interface SNode {
  id: number;
  x: number;
  y: number;
  parent: number; // -1 for root
  depth: number;
  /** Final/target stroke half-... actually full width at full maturity (Murray). */
  thickness: number;
  /** Maturity window during which this node's segment grows in. */
  appearStart: number;
  appearEnd: number;
}

export interface SLeaf {
  id: number;
  node: number; // node it hangs from
  x: number;
  y: number;
  angle: number; // radians, 0 = up
  size: number;
  variant: number;
  hue: number;
  shade: number; // 0..1 → darker→lighter green (for multi-tone canopy)
  appearStart: number;
  appearEnd: number;
  /** Frontier leaves (on nodes that later branch) shed once growth moves on. */
  disappearStart?: number;
  disappearEnd?: number;
}

export type DecorType = 'flower' | 'fruit' | 'spark';

/** Milestone decorations that unlock at maturity thresholds. */
export interface Decor {
  id: number;
  type: DecorType;
  x: number;
  y: number;
  size: number;
  hue: number;
  appearStart: number;
  appearEnd: number;
}

/**
 * Authored seedling shown during the first ~2 weeks (before the procedural
 * skeleton takes over): seed husk → green hook → cotyledons → first true
 * leaves. Parameters are seeded so every plant sprouts a little differently.
 */
export interface SproutModel {
  /** Sideways lean of the stem (radians). */
  lean: number;
  /** Horizontal bow of the young stem (px, signed). */
  curve: number;
  /** Base hue for the sprout's leaves. */
  hue: number;
  /** Cotyledon (first round leaves) size. */
  cotSize: number;
  /** Shape variant for the true leaves. */
  leafVariant: number;
  /** 0..1 — shifts stage timings a touch so sprouts don't feel scripted. */
  jitter: number;
}

export interface TreeModel {
  seed: number;
  nodes: SNode[];
  leaves: SLeaf[];
  decor: Decor[];
  sprout: SproutModel;
  view: { width: number; height: number; baseX: number; baseY: number };
}

/** Maturity thresholds at which decorations unlock. */
export const MILESTONES = {
  flower: 0.22, // ~7-9 months
  fruit: 0.5, // ~1.7 years
  spark: 0.88, // ~3.5+ years
};

// ───────────────────────── Foliage / decor config ─────────────────────────
// Tunable knobs for leaves & milestone decorations. Pass a partial of these
// to a generator (or finalizeTree) to customize; anything omitted uses defaults.
type Range = [number, number];

export interface LeafConfig {
  /** Leaves on each final tip (int range). */
  perTip: Range;
  /** Chance of a 2nd leaf on each internal "frontier" node. */
  frontierChance: number;
  /** Leaf length range. */
  size: Range;
  /** Hue range (green ≈ 92–140). */
  hue: Range;
  /** Which leaf shapes are allowed (indices into leafPath variants). */
  shapes: number[];
}

export interface FlowerConfig {
  /** Per-tip probability of a flower. */
  chance: number;
  /** Maturity at which flowers unlock. */
  unlockAt: number;
  size: Range;
  /** Petal hue range (rose ≈ 330–360, sakura ≈ 340–355, etc.). */
  hue: Range;
}

export interface FruitConfig {
  chance: number;
  unlockAt: number;
  size: Range;
  hue: Range;
}

export interface SparkConfig {
  count: number;
  unlockAt: number;
}

/**
 * One-knob foliage density ("stufoșenie") → leaf config. 0 = airy, individual
 * leaf tufts with the structure fully readable; 1 = lush solid crown.
 * Drives BOTH density sources: leaves per tip and the interior-leaf chance
 * (interior nodes far outnumber tips, so frontierChance is the main lever).
 */
export function foliageDensity(density: number): Partial<LeafConfig> {
  const t = Math.max(0, Math.min(1, density));
  return {
    perTip: [Math.round(2 + 3 * t), Math.round(4 + 3 * t)],
    frontierChance: 0.15 + 0.75 * t,
  };
}

export const DEFAULT_LEAF: LeafConfig = {
  perTip: [5, 7],
  frontierChance: 0.75,
  size: [9, 14],
  hue: [92, 140],
  shapes: [0, 1, 2],
};
export const DEFAULT_FLOWERS: FlowerConfig = {
  // flowers are temporarily DISABLED (chance 0) while the foliage is tuned —
  // they dominated the crown; revisit (smaller + rarer) once leaves are final
  chance: 0,
  unlockAt: MILESTONES.flower,
  size: [4.5, 7],
  hue: [330, 360],
};
export const DEFAULT_FRUIT: FruitConfig = {
  // fruit also temporarily DISABLED while foliage is tuned (same as flowers)
  chance: 0,
  unlockAt: MILESTONES.fruit,
  size: [2.6, 3.8],
  hue: [8, 30],
};
export const DEFAULT_SPARK: SparkConfig = { count: 7, unlockAt: MILESTONES.spark };

// Authored at 170×170 to match the slot it occupies in the app (GROUND_Y 154),
// so stroke widths / leaf sizes are bold and readable at the real display size.
const CANVAS = { width: 170, height: 170, soilInset: 16 };

/** Algorithm parameters — tuned for a clean, stylized tree that FILLS a 170px frame. */
const PARAMS = {
  attractors: 50, // crown point cloud size (fewer = cleaner, simpler tree)
  influence: 40, // attraction distance (how far a node "sees" attractors)
  kill: 12, // an attractor is consumed within this distance
  step: 8, // segment length per growth step
  maxSteps: 320,
  jitter: 0.16, // small random wobble on growth direction
  upBias: 0.12, // gentle upward tendency (low → spreads wider/bushier)
  murrayExp: 2.3, // Murray's law exponent
  tipWidth: 1.8, // twig width at full maturity
  trunkMaxWidth: 10, // cap on trunk width
};

interface V {
  x: number;
  y: number;
}

const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: V, s: number): V => ({ x: a.x * s, y: a.y * s });
const len = (a: V) => Math.hypot(a.x, a.y);
const norm = (a: V): V => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};
const dist = (a: V, b: V) => Math.hypot(a.x - b.x, a.y - b.y);

/** Scatter attractors in a soft teardrop/ellipse crown above the base. */
function scatterAttractors(rng: Rng, cx: number, baseY: number, count: number, rx: number, ry: number): V[] {
  const r = rangeFrom(rng);
  const pts: V[] = [];
  const crownCx = cx;
  const crownCy = baseY - 66; // low crown → branches start near the base (short trunk)
  let guard = 0;
  while (pts.length < count && guard < count * 40) {
    guard++;
    // sample in unit disk, bias slightly outward for a fuller canopy edge
    const ang = r.float(0, Math.PI * 2);
    const rad = Math.sqrt(r.float(0, 1));
    let px = crownCx + Math.cos(ang) * rad * rx;
    let py = crownCy + Math.sin(ang) * rad * ry;
    // squash the bottom so the crown sits like a rounded canopy, not a full circle
    if (py > crownCy + ry * 0.5) py = crownCy + ry * 0.5 + (py - (crownCy + ry * 0.5)) * 0.5;
    pts.push({ x: px, y: py });
  }
  return pts;
}

export function generateTree(seed: number, opts: FinalizeOpts = {}): TreeModel {
  const rng = mulberry32(seed);
  const r = rangeFrom(rng);

  const baseX = CANVAS.width / 2 + r.float(-6, 6);
  const baseY = CANVAS.height - CANVAS.soilInset;

  // branchiness/crownSpread: 0.5 maps to the historical defaults exactly
  const b = opts.branchiness ?? 0.5;
  const cs = opts.crownSpread ?? 0.5;
  const attractorCount = Math.round(30 + (70 - 30) * b);
  const crownRx = 40 + (64 - 40) * cs;
  const crownRy = 48 + (68 - 48) * cs;

  const attractors = scatterAttractors(rng, baseX, baseY, attractorCount, crownRx, crownRy);
  let alive = attractors.map(() => true);

  // Node graph. Root at the soil.
  const px: number[] = [baseX];
  const py: number[] = [baseY];
  const parent: number[] = [-1];
  const childCount: number[] = [0];
  const order: number[] = [0]; // creation step

  let step = 0;
  const { influence, kill, step: SEG, maxSteps, jitter, upBias } = PARAMS;

  while (step < maxSteps) {
    step++;
    const remaining = alive.some((a) => a);
    if (!remaining) break;
    if (px.length > 90) break; // safety cap → bounds node/leaf counts for perf

    // For each alive attractor, find the single closest node within influence.
    const influencedDir: Record<number, V> = {};
    const influencedCount: Record<number, number> = {};
    let anyInfluence = false;

    for (let ai = 0; ai < attractors.length; ai++) {
      if (!alive[ai]) continue;
      const a = attractors[ai];
      let best = -1;
      let bestD = influence;
      for (let ni = 0; ni < px.length; ni++) {
        const d = Math.hypot(px[ni] - a.x, py[ni] - a.y);
        if (d < bestD) {
          bestD = d;
          best = ni;
        }
      }
      if (best >= 0) {
        anyInfluence = true;
        const dir = norm(sub(a, { x: px[best], y: py[best] }));
        influencedDir[best] = add(influencedDir[best] || { x: 0, y: 0 }, dir);
        influencedCount[best] = (influencedCount[best] || 0) + 1;
      }
    }

    if (!anyInfluence) {
      // No node is close enough yet → grow the topmost node straight toward the
      // crown so an initial trunk forms (and keeps reaching new crowns).
      let topNode = 0;
      for (let ni = 1; ni < px.length; ni++) if (py[ni] < py[topNode]) topNode = ni;
      // direction = toward centroid of remaining attractors, with up-bias
      let cxA = 0;
      let cyA = 0;
      let n = 0;
      for (let ai = 0; ai < attractors.length; ai++) {
        if (!alive[ai]) continue;
        cxA += attractors[ai].x;
        cyA += attractors[ai].y;
        n++;
      }
      if (n === 0) break;
      const dir = norm({ x: cxA / n - px[topNode], y: cyA / n - py[topNode] });
      const biased = norm({ x: dir.x, y: dir.y - upBias });
      addNode(topNode, biased);
      continue;
    }

    // Create one new node per influenced node, in the averaged direction.
    const sources = Object.keys(influencedDir).map(Number);
    for (const ni of sources) {
      let dir = norm(influencedDir[ni]);
      dir = norm({ x: dir.x + r.float(-jitter, jitter), y: dir.y - upBias * 0.4 });
      addNode(ni, dir);
    }

    // Kill attractors reached by any node.
    for (let ai = 0; ai < attractors.length; ai++) {
      if (!alive[ai]) continue;
      const a = attractors[ai];
      for (let ni = 0; ni < px.length; ni++) {
        if (Math.hypot(px[ni] - a.x, py[ni] - a.y) < kill) {
          alive[ai] = false;
          break;
        }
      }
    }
  }

  function addNode(from: number, dir: V) {
    const nx = px[from] + dir.x * SEG;
    const ny = py[from] + dir.y * SEG;
    px.push(nx);
    py.push(ny);
    parent.push(from);
    childCount.push(0);
    order.push(step);
    childCount[from]++;
  }

  return finalizeTree(
    seed,
    px,
    py,
    parent,
    { width: CANVAS.width, height: CANVAS.height, baseX, baseY },
    r,
    opts,
  );
}

/**
 * Shared post-processing for ANY skeleton (px/py/parent arrays): Murray-law
 * thickness, depth-based reveal windows, leaves (tips + shedding frontier),
 * canopy blobs, and milestone decorations. Both the space-colonization and the
 * L-system generators call this, so they share identical foliage & rendering —
 * only the branch skeleton differs.
 */
export interface FinalizeOpts {
  tipWidth?: number;
  murrayExp?: number;
  trunkMaxWidth?: number;
  /**
   * Exponent of the depth→appear curve (>1 front-loads: shallow depths appear
   * very early). Skeletons with FEW depth levels (L-system ~9 vs colony ~17)
   * need a higher value or the young plant stays a bare stalk for months.
   */
  revealGamma?: number;
  /** Customize the leaves (count, size, color, shapes). */
  leaf?: Partial<LeafConfig>;
  /** Customize the flowers (count, unlock time, color). */
  flowers?: Partial<FlowerConfig>;
  /** Customize the fruit. */
  fruit?: Partial<FruitConfig>;
  /** Customize the end-game sparkles. */
  spark?: Partial<SparkConfig>;
  /** L-system only: force a silhouette instead of the seeded 50/50 pick. */
  lsystemForm?: 'tall' | 'broad';
  /** Multiplier on branch widths (tipWidth + trunkMaxWidth). 1 = default. */
  thicknessScale?: number;
  /** Multiplier on the algorithm's base leaf size. 1 = default. */
  leafSizeScale?: number;
  /**
   * 0..1 — how MANY branches the skeleton grows (0.5 = current default).
   * Colony: attractor count; L-system: weight of branchier productions.
   * NOTE: rebuilds the skeleton — same seed yields a different tree.
   */
  branchiness?: number;
  /** 0..1 — crown width/volume (0.5 = current default). */
  crownSpread?: number;
}

export function finalizeTree(
  seed: number,
  px: number[],
  py: number[],
  parent: number[],
  view: TreeModel['view'],
  r: ReturnType<typeof rangeFrom>,
  opts: FinalizeOpts = {},
): TreeModel {
  const tScale = opts.thicknessScale ?? 1;
  const tipWidth = (opts.tipWidth ?? PARAMS.tipWidth) * tScale;
  const e = opts.murrayExp ?? PARAMS.murrayExp;
  const trunkMaxWidth = (opts.trunkMaxWidth ?? PARAMS.trunkMaxWidth) * tScale;
  const leafCfg: LeafConfig = { ...DEFAULT_LEAF, ...opts.leaf };
  if (opts.leafSizeScale != null && opts.leafSizeScale !== 1)
    leafCfg.size = [leafCfg.size[0] * opts.leafSizeScale, leafCfg.size[1] * opts.leafSizeScale];
  const flowerCfg: FlowerConfig = { ...DEFAULT_FLOWERS, ...opts.flowers };
  const fruitCfg: FruitConfig = { ...DEFAULT_FRUIT, ...opts.fruit };
  const sparkCfg: SparkConfig = { ...DEFAULT_SPARK, ...opts.spark };
  const N = px.length;

  // ---- depth (graph distance from root) ----
  const depth: number[] = new Array(N).fill(0);
  for (let i = 1; i < N; i++) depth[i] = depth[parent[i]] + 1;

  // ---- Murray's law thickness: tips thin, parents thicken by child sizes ----
  const thick: number[] = new Array(N).fill(tipWidth);
  const kids: number[][] = Array.from({ length: N }, () => []);
  for (let i = 1; i < N; i++) kids[parent[i]].push(i);
  function computeThickness(i: number): number {
    if (kids[i].length === 0) {
      thick[i] = tipWidth;
      return thick[i];
    }
    let s = 0;
    for (const k of kids[i]) s += Math.pow(computeThickness(k), e);
    thick[i] = Math.min(trunkMaxWidth, Math.pow(s, 1 / e));
    return thick[i];
  }
  computeThickness(0);

  // ---- appear windows: DEPTH for the main lines + staggered BRANCH unlocks ----
  // The maturation story: a YOUNG plant is tall but SLENDER — the trunk and a
  // couple of main limbs shoot up fast (depth-based reveal, front-loaded).
  // Every other side branch is a separate "branch line" with its own UNLOCK
  // maturity, assigned by structural size (big limbs first, twigs last) and
  // spread across years — so the crown keeps widening and filling out long
  // after the height is there.
  const maxDepthVal = Math.max(1, ...depth);
  const GAMMA_REVEAL = opts.revealGamma ?? 2.0;
  // divide by (maxDepth+1) so even the deepest node has appearStart < 1
  const depthAppear = (d: number) => Math.pow(Math.min(1, d / (maxDepthVal + 1)), GAMMA_REVEAL);

  // subtree sizes (children always have larger ids than parents)
  const subSize: number[] = new Array(N).fill(1);
  for (let i = N - 1; i >= 1; i--) subSize[parent[i]] += subSize[i];

  // at each fork, the largest child continues the parent's line for free;
  // the rest start new branch lines, ranked globally by subtree size
  const branchStart: (number | null)[] = new Array(N).fill(null);
  const sideBranches: { node: number; size: number }[] = [];
  for (let i = 0; i < N; i++) {
    if (kids[i].length <= 1) continue;
    const sorted = [...kids[i]].sort((a, b) => subSize[b] - subSize[a]);
    for (let k = 1; k < sorted.length; k++)
      sideBranches.push({ node: sorted[k], size: subSize[sorted[k]] });
  }
  sideBranches.sort((a, b) => b.size - a.size);
  const UNLOCK_FROM = 0.07; // first extra limb ~1.5 months in
  const UNLOCK_TO = 0.8; // last twigs keep appearing into year 4
  sideBranches.forEach((s, idx) => {
    const t = sideBranches.length <= 1 ? 0 : idx / (sideBranches.length - 1);
    branchStart[s.node] = UNLOCK_FROM + (UNLOCK_TO - UNLOCK_FROM) * Math.pow(t, 1.2) + r.float(-0.02, 0.02);
  });

  // propagate unlock times down each branch; remember the fork depth so the
  // branch EXTENDS outward from its fork instead of popping in whole
  const SEG_RAMP = 0.022; // maturity per segment as an unlocked branch extends
  const unlock: number[] = new Array(N).fill(0);
  const unlockDepth: number[] = new Array(N).fill(0);
  for (let i = 1; i < N; i++) {
    const own = branchStart[i];
    if (own != null && own > unlock[parent[i]]) {
      unlock[i] = own;
      unlockDepth[i] = depth[i];
    } else {
      unlock[i] = unlock[parent[i]];
      unlockDepth[i] = unlockDepth[parent[i]];
    }
  }

  const nodes: SNode[] = [];
  for (let i = 0; i < N; i++) {
    const ramp = unlock[i] > 0 ? unlock[i] + (depth[i] - unlockDepth[i]) * SEG_RAMP : 0;
    const aStart = Math.min(0.97, Math.max(depthAppear(depth[i]), ramp));
    const aEnd =
      unlock[i] > 0
        ? aStart + Math.max(0.025, SEG_RAMP)
        : Math.max(aStart + 0.02, depthAppear(depth[i] + 1));
    nodes.push({
      id: i,
      x: px[i],
      y: py[i],
      parent: parent[i],
      depth: depth[i],
      thickness: thick[i],
      appearStart: aStart,
      appearEnd: Math.min(1, aEnd),
    });
  }

  // first child's appear time per node (when growth moves past this node)
  const firstChildAppear: number[] = new Array(N).fill(1);
  for (let i = 0; i < N; i++) {
    if (kids[i].length === 0) continue;
    firstChildAppear[i] = Math.min(...kids[i].map((k) => nodes[k].appearStart));
  }

  // ---- leaves ----
  // Permanent leaves cluster at the FINAL tips → a leafy crown when mature.
  // Frontier leaves sit on internal nodes and SHED when their branch grows on,
  // so the plant is leafy at every stage while the trunk/interior stays clean.
  const leaves: SLeaf[] = [];
  let lid = 0;
  // Leaves are placed like real foliage: staggered ALONG the twig, alternating
  // sides, blades splayed outward from the branch direction. (All leaves at a
  // single point with random spins read as flower rosettes, not foliage.)
  const addLeaf = (
    host: SNode,
    appear: number,
    disappear?: number,
    place?: { ox: number; oy: number; angle: number },
  ) => {
    const par = host.parent >= 0 ? nodes[host.parent] : host;
    const branchAngle = Math.atan2(host.x - par.x, -(host.y - par.y)); // 0 = up
    const start = Math.min(0.99, appear);
    const shedAt = disappear == null ? undefined : Math.min(0.97, disappear);
    leaves.push({
      id: lid++,
      node: host.id,
      x: host.x + (place ? place.ox : r.float(-2, 2)),
      y: host.y + (place ? place.oy : r.float(-2, 2)),
      angle: place ? place.angle + r.float(-0.16, 0.16) : branchAngle + r.float(-0.7, 0.7),
      size: r.float(leafCfg.size[0], leafCfg.size[1]),
      variant: r.pick(leafCfg.shapes),
      hue: r.float(leafCfg.hue[0], leafCfg.hue[1]),
      shade: r.float(0, 1),
      appearStart: start,
      appearEnd: Math.min(1, start + 0.04),
      disappearStart: shedAt == null ? undefined : Math.max(start + 0.05, shedAt),
      disappearEnd: shedAt == null ? undefined : Math.min(1, Math.max(start + 0.05, shedAt) + 0.08),
    });
  };

  const tips = nodes.filter((n) => n.parent >= 0 && kids[n.id].length === 0);

  // A leaf pops once its node's segment is ~60% grown — NOT at appearEnd,
  // which equals the next depth level's start. For skeletons with few, chunky
  // depth levels (L-system) that lag left the frontier bare and the deepest
  // tips leafless until full maturity.
  const leafAt = (n: SNode) => n.appearStart + (n.appearEnd - n.appearStart) * 0.6;

  // ---- individual leaves ----
  // Tips: the first pair shows up as soon as the twig grows in; the REST of the
  // cluster arrives in waves over the years → the crown visibly densifies with
  // age instead of being complete at year one.
  // Frontier (interior) leaves: a young plant is leafy top-to-bottom (bush);
  // with age the LOW interior sheds while high interior lasts much longer —
  // the crown "lifts" and a clean trunk emerges (bush → tree).
  const treeTopY = Math.min(...nodes.map((n) => n.y));
  const heightFrac = (n: SNode) =>
    Math.max(0, Math.min(1, (view.baseY - n.y) / Math.max(20, view.baseY - treeTopY)));
  // the clean TRUNK below the first fork never carries frontier leaves —
  // otherwise a long-trunked skeleton (L-system) reads as a leafy corn stalk
  let firstForkDepth = Infinity;
  for (let i = 0; i < N; i++)
    if (kids[i].length >= 2) firstForkDepth = Math.min(firstForkDepth, depth[i]);
  for (const n of nodes) {
    if (n.parent < 0) continue;
    // unit vector along the incoming branch + its perpendicular
    const par = nodes[n.parent];
    let bx = n.x - par.x;
    let by = n.y - par.y;
    const bl = Math.hypot(bx, by) || 1;
    bx /= bl;
    by /= bl;
    const branchAngle = Math.atan2(bx, -by); // 0 = up
    if (kids[n.id].length === 0) {
      // tip cluster: an apex leaf continuing the twig + alternating side
      // leaves staggered back along it (feather/frond arrangement)
      const cnt = r.int(leafCfg.perTip[0], leafCfg.perTip[1]);
      for (let i = 0; i < cnt; i++) {
        const wave =
          i < 2
            ? leafAt(n)
            : Math.max(
                leafAt(n),
                0.3 + (0.55 * (i - 2)) / Math.max(1, cnt - 3) + r.float(-0.05, 0.05),
              );
        const back = i * r.float(2.2, 3.2);
        const side = i % 2 === 0 ? 1 : -1;
        const splay = i === 0 ? r.float(-0.15, 0.15) : side * r.float(0.5, 0.95);
        addLeaf(n, wave, undefined, {
          ox: -bx * back - by * side * 1.2,
          oy: -by * back + bx * side * 1.2,
          angle: branchAngle + splay,
        });
      }
    } else if (n.depth >= 2 && n.depth > firstForkDepth) {
      // crown lift applies only to the LOWER part of the tree; interior leaves
      // in the upper crown are permanent, so the mature canopy stays full
      // instead of turning into bare branches with tufts at the ends
      const h = heightFrac(n);
      const liftShed =
        h > 0.55 ? undefined : Math.max(firstChildAppear[n.id] + 0.14, 0.34 + 0.5 * h);
      const side = r.chance(0.5) ? 1 : -1;
      // BOTH interior leaves are chance-gated by frontierChance — interior
      // nodes far outnumber tips (esp. L-system), so this is the main
      // density knob; an unconditional first leaf made crowns read as a
      // solid paintbrush blob no matter what perTip was set to.
      if (r.chance(Math.min(1, leafCfg.frontierChance * 1.2)))
        addLeaf(n, leafAt(n), liftShed, {
          ox: -by * side * 1.5,
          oy: bx * side * 1.5,
          angle: branchAngle + side * r.float(0.5, 0.9),
        });
      if (r.chance(leafCfg.frontierChance * 0.6))
        addLeaf(n, leafAt(n), liftShed == null ? undefined : liftShed + r.float(0, 0.1), {
          ox: by * side * 1.5 - bx * r.float(2, 3.5),
          oy: -bx * side * 1.5 - by * r.float(2, 3.5),
          angle: branchAngle - side * r.float(0.5, 0.9),
        });
    }
  }
  // ---- milestone decorations (unlock at maturity thresholds) ----
  // Bloom comes in WAVES: the first flowering is a few blossoms; every season
  // after adds more, so the 4-year tree is covered while year one is shy.
  const decor: Decor[] = [];
  let did = 0;
  const FLOWER_WAVES = [1, 0.7, 0.45];
  const FRUIT_WAVES = [1, 0.6];
  for (const tip of tips) {
    FLOWER_WAVES.forEach((mult, k) => {
      if (!r.chance(flowerCfg.chance * mult)) return;
      const start = Math.max(tip.appearEnd, flowerCfg.unlockAt + k * 0.2 + r.float(-0.03, 0.03));
      decor.push({
        id: did++,
        type: 'flower',
        x: tip.x + r.float(-4, 4),
        y: tip.y + r.float(-4, 3),
        size: r.float(flowerCfg.size[0], flowerCfg.size[1]),
        hue: r.float(flowerCfg.hue[0], flowerCfg.hue[1]),
        appearStart: Math.min(0.98, start),
        appearEnd: Math.min(1, start + 0.04),
      });
    });
    FRUIT_WAVES.forEach((mult, k) => {
      if (!r.chance(fruitCfg.chance * mult)) return;
      const start = Math.max(tip.appearEnd, fruitCfg.unlockAt + k * 0.18 + r.float(-0.03, 0.03));
      decor.push({
        id: did++,
        type: 'fruit',
        x: tip.x + r.float(-3, 3),
        y: tip.y + r.float(0, 5),
        size: r.float(fruitCfg.size[0], fruitCfg.size[1]),
        hue: r.float(fruitCfg.hue[0], fruitCfg.hue[1]),
        appearStart: Math.min(0.98, start),
        appearEnd: Math.min(1, start + 0.04),
      });
    });
  }
  // a few sparkles around the crown at very high maturity
  for (let i = 0; i < sparkCfg.count && tips.length > 0; i++) {
    const tip = tips[Math.floor(r.float(0, tips.length))] || nodes[nodes.length - 1];
    decor.push({
      id: did++,
      type: 'spark',
      x: tip.x + r.float(-10, 10),
      y: tip.y + r.float(-10, 4),
      size: r.float(1, 2),
      hue: r.float(45, 55),
      appearStart: sparkCfg.unlockAt + r.float(0, 0.05),
      appearEnd: 1,
    });
  }

  // ---- seedling (first ~2 weeks, before the skeleton takes over) ----
  const sprout: SproutModel = {
    lean: r.float(-0.18, 0.18),
    curve: r.float(-7, 7),
    hue: r.float(leafCfg.hue[0], leafCfg.hue[1]),
    cotSize: r.float(7.5, 9.5),
    leafVariant: r.pick(leafCfg.shapes),
    jitter: r.float(0, 1),
  };

  return {
    seed,
    nodes,
    leaves,
    decor,
    sprout,
    view,
  };
}
