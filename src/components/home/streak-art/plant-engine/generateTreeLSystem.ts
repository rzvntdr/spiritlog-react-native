/**
 * Alternative skeleton generator: a parametric, stochastic L-SYSTEM, shaped
 * like a TREE (not a potted shrub):
 *   - a clean TRUNK prefix (several F's before the first branch) lifts the
 *     crown off the ground;
 *   - internodes shorten with bracket depth (long limbs → short twigs);
 *   - a small per-step pull of the heading toward vertical makes limbs arc
 *     upward like branches reaching for light;
 *   - wide, jittered branch angles spread the crown instead of bundling it.
 *
 * A grammar is rewritten n times from an axiom, then interpreted with a turtle
 * (F = draw forward, +/- = turn, [ ] = branch push/pop). Stochastic rules +
 * angle jitter (seeded) make every plant unique but deterministic. The result
 * is normalized to fit the 170×170 box, then handed to the SHARED finalizeTree
 * so foliage, milestones and rendering are identical to the other algorithm —
 * only the branch structure differs (more botanical / self-similar).
 */

import { FinalizeOpts, finalizeTree, TreeModel } from './generateTree';
import { mulberry32, rangeFrom } from './prng';

const CANVAS = { width: 170, height: 170, baseY: 154 };

/** Stochastic productions for the apex symbol X (no F-doubling → bounded size). */
const X_RULES_SIMPLE = ['F[+X][-X]FX', 'FF[+X]F[-X]+X', 'FF[++X][--X]FX'];
const X_RULES_BRANCHY = ['F-[[X]+X]+F[+X]-X', 'F[++X][-X]F[-X]X'];

export function generateTreeLSystem(seed: number, opts: FinalizeOpts = {}): TreeModel {
  const rng = mulberry32(seed);
  const r = rangeFrom(rng);

  const iterations = r.int(4, 5);
  const turn = r.float(26, 36) * (Math.PI / 180); // base branch angle (wide → spread crown)
  const twigShorten = r.float(0.86, 0.94); // internode length factor per bracket depth
  const upPull = r.float(0.03, 0.06); // per-step heading decay toward vertical

  // Two silhouettes (seeded 50/50, overridable via opts.lsystemForm):
  //  - 'tall'  — longer clean trunk, moderate crown
  //  - 'broad' — short THICK trunk, big spreading crown
  const form = opts.lsystemForm ?? (r.chance(0.5) ? 'broad' : 'tall');
  const trunkLen = form === 'broad' ? r.int(2, 3) : r.int(4, 6);
  const cs = opts.crownSpread ?? 0.5;
  const crownBoost =
    (form === 'broad' ? r.float(1.55, 1.8) : r.float(1.25, 1.4)) * (0.8 + 0.4 * cs);
  const trunkMaxWidth = form === 'broad' ? 13 : 10;
  // branchiness weights the grammar toward multi-fork productions
  // (0.5 ≈ the old uniform pick over all rules)
  const branchyChance = 0.1 + 0.6 * (opts.branchiness ?? 0.5);

  // ---- rewrite (trunk prefix + branching apex) ----
  let s = 'F'.repeat(trunkLen) + 'X';
  for (let it = 0; it < iterations; it++) {
    let out = '';
    for (const ch of s)
      out += ch === 'X' ? (r.chance(branchyChance) ? r.pick(X_RULES_BRANCHY) : r.pick(X_RULES_SIMPLE)) : ch;
    s = out;
    if (s.length > 9000) break; // safety
  }

  // ---- interpret with a turtle (root at origin, growing up = -y) ----
  const px: number[] = [0];
  const py: number[] = [0];
  const parent: number[] = [-1];
  let x = 0;
  let y = 0;
  let a = 0; // heading, 0 = straight up
  let cur = 0;
  const stack: { x: number; y: number; a: number; cur: number }[] = [];
  const SEG = 1;
  const NODE_CAP = 160;

  // No branch ever grows downward: headings are clamped to ±MAX_A from
  // vertical, so even the most lateral limb still rises a little.
  const MAX_A = 75 * (Math.PI / 180);

  for (const ch of s) {
    if (ch === 'F') {
      if (px.length >= NODE_CAP) continue;
      // deeper branches have shorter internodes; limbs arc gently upward
      const len = SEG * Math.pow(twigShorten, stack.length);
      a *= 1 - upPull;
      if (a > MAX_A) a = MAX_A;
      if (a < -MAX_A) a = -MAX_A;
      const nx = x + Math.sin(a) * len;
      const ny = y - Math.cos(a) * len;
      px.push(nx);
      py.push(ny);
      parent.push(cur);
      cur = px.length - 1;
      x = nx;
      y = ny;
    } else if (ch === '+') {
      a += turn + r.float(-0.12, 0.12);
    } else if (ch === '-') {
      a -= turn + r.float(-0.12, 0.12);
    } else if (ch === '[') {
      stack.push({ x, y, a, cur });
    } else if (ch === ']') {
      const st = stack.pop();
      if (st) {
        x = st.x;
        y = st.y;
        a = st.a;
        cur = st.cur;
      }
    }
  }

  // ---- crown boost: expand everything above the trunk top about that point,
  // so the crown takes a bigger share of the final frame than the trunk ----
  const topX = px[Math.min(trunkLen, px.length - 1)];
  const topY = py[Math.min(trunkLen, py.length - 1)];
  for (let i = trunkLen + 1; i < px.length; i++) {
    px[i] = topX + (px[i] - topX) * crownBoost;
    py[i] = topY + (py[i] - topY) * crownBoost;
  }

  // ---- normalize to fit the 170 box, root anchored at the soil ----
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  for (let i = 0; i < px.length; i++) {
    if (px[i] < minX) minX = px[i];
    if (px[i] > maxX) maxX = px[i];
    if (py[i] < minY) minY = py[i]; // most negative = top of tree
  }
  const treeH = Math.max(1, -minY);
  const maxAbsX = Math.max(1, -minX, maxX);
  const targetH = 120;
  const halfW = 70;
  const scale = Math.min(targetH / treeH, halfW / maxAbsX);

  const baseX = CANVAS.width / 2 + r.float(-5, 5);
  const baseY = CANVAS.baseY;
  for (let i = 0; i < px.length; i++) {
    px[i] = baseX + px[i] * scale;
    py[i] = baseY + py[i] * scale;
  }

  return finalizeTree(
    seed,
    px,
    py,
    parent,
    { width: CANVAS.width, height: CANVAS.height, baseX, baseY },
    r,
    // revealGamma 3: this skeleton has few chunky depth levels, so the default
    // curve kept the young plant a bare stalk for months.
    // Leaf size 12-17 is the user-picked default for THIS skeleton (colony has
    // its own); callers can still override via opts.leaf.
    {
      revealGamma: 3.0,
      trunkMaxWidth,
      ...opts,
      leaf: { size: [12, 17], ...opts.leaf },
    },
  );
}
