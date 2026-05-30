import { StreakTier } from '../utils/streakTier';

const TIER_INDEX: Record<StreakTier, number> = {
  ember: 0, seed: 1, spark: 2, sprout: 3, bud: 4,
  bloom: 5, flourish: 6, radiance: 7, year: 8, aurora: 9,
};

// Palette (mirrors calmTheme).
const TEAL = '#5cc4d1';
const TEAL_DEEP = '#1f4d54';
const WARM = '#d2a06b';
const WARM_BRIGHT = '#e8b880';
const GOLD = '#d4a843';
const GOLD_PALE = '#f5d896';
const TRUNK = '#8b6f47';

const W = 90;
const H = 110;
const GY = 96; // ground y

function leaf(cx: number, cy: number, rot: number, rx = 9, ry = 4): string {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${TEAL}" opacity="0.9" transform="rotate(${rot} ${cx} ${cy})"/>`;
}

function flower(cx: number, cy: number, scale: number, petal: string, center: string): string {
  const r = 4 * scale;
  const off = 4 * scale;
  let s = '';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    s += `<circle cx="${(cx + Math.cos(a) * off).toFixed(1)}" cy="${(cy + Math.sin(a) * off).toFixed(1)}" r="${r.toFixed(1)}" fill="${petal}"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${(r * 0.7).toFixed(1)}" fill="${center}"/>`;
  return s;
}

/**
 * Compact plant SVG string for the home-screen widget, scaled by streak tier.
 * Intentionally simpler than the in-app PlantArt (RemoteViews render the SVG once,
 * statically) but recognizably the same growth metaphor.
 */
export function plantSvgString(tier: StreakTier): string {
  const t = TIER_INDEX[tier];
  const cx = W / 2;
  let body = '';

  // Ground
  body += `<path d="M8 ${GY} Q${cx} ${GY - 3} ${W - 8} ${GY}" stroke="${TRUNK}" stroke-width="2.5" fill="none" opacity="0.5"/>`;

  if (tier === 'ember') {
    body += `<path d="M${cx} ${GY - 4} Q${cx - 7} ${GY - 18} ${cx} ${GY - 30} Q${cx + 8} ${GY - 16} ${cx} ${GY - 4} Z" fill="${WARM}"/>`;
    body += `<path d="M${cx} ${GY - 10} Q${cx - 3} ${GY - 18} ${cx} ${GY - 24} Q${cx + 3} ${GY - 18} ${cx} ${GY - 10} Z" fill="${GOLD_PALE}" opacity="0.8"/>`;
    return svg(body);
  }
  if (tier === 'seed') {
    body += `<ellipse cx="${cx}" cy="${GY - 5}" rx="7" ry="5" fill="${WARM_BRIGHT}"/>`;
    body += `<path d="M${cx} ${GY - 9} L${cx} ${GY - 14}" stroke="${TEAL_DEEP}" stroke-width="1.5"/>`;
    return svg(body);
  }

  if (t >= 8) {
    // Tree
    body += `<rect x="${cx - 4}" y="${GY - 34}" width="8" height="34" rx="2" fill="${TRUNK}"/>`;
    body += `<circle cx="${cx}" cy="${GY - 50}" r="22" fill="${TEAL}" opacity="0.85"/>`;
    body += `<circle cx="${cx - 14}" cy="${GY - 40}" r="14" fill="${TEAL}" opacity="0.75"/>`;
    body += `<circle cx="${cx + 15}" cy="${GY - 42}" r="15" fill="${TEAL}" opacity="0.75"/>`;
    body += `<circle cx="${cx - 5}" cy="${GY - 60}" r="11" fill="${TEAL}" opacity="0.7"/>`;
    if (t >= 8) {
      body += `<circle cx="${cx - 9}" cy="${GY - 46}" r="2.4" fill="${GOLD}"/>`;
      body += `<circle cx="${cx + 11}" cy="${GY - 50}" r="2.4" fill="${GOLD}"/>`;
      body += `<circle cx="${cx + 2}" cy="${GY - 62}" r="2" fill="${tier === 'aurora' ? GOLD_PALE : WARM_BRIGHT}"/>`;
    }
    return svg(body);
  }

  // Plant (spark..radiance): stem + leaves (+flower)
  const stemTop = GY - (22 + t * 7);
  body += `<path d="M${cx} ${GY} Q${cx - 2} ${(GY + stemTop) / 2} ${cx} ${stemTop}" stroke="${TEAL}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;

  const leafCount = Math.min(5, t - 1); // spark=1 ... radiance=5
  for (let i = 0; i < leafCount; i++) {
    const slot = (i + 1) / (leafCount + 1);
    const y = GY - (GY - stemTop) * slot;
    const side = i % 2 === 0 ? -1 : 1;
    body += leaf(cx + side * 11, y, side > 0 ? 25 : -25);
  }

  if (tier === 'bud') {
    body += `<ellipse cx="${cx}" cy="${stemTop - 2}" rx="4.5" ry="7" fill="${WARM}"/>`;
  } else if (tier === 'bloom') {
    body += flower(cx, stemTop, 1.1, WARM, GOLD);
  } else if (tier === 'flourish') {
    body += flower(cx - 11, stemTop + 8, 0.8, WARM, WARM_BRIGHT);
    body += flower(cx + 9, stemTop + 2, 0.85, GOLD_PALE, GOLD);
    body += flower(cx, stemTop - 6, 1.0, WARM, GOLD);
  } else if (tier === 'radiance') {
    body += `<circle cx="${cx}" cy="${stemTop}" r="20" stroke="${GOLD}" stroke-width="1" fill="none" opacity="0.4"/>`;
    body += flower(cx, stemTop, 1.4, GOLD_PALE, GOLD);
  }

  return svg(body);
}

function svg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${body}</svg>`;
}
