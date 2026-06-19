/**
 * Pure SVG-string renderer for the plant — no React/React Native dependency.
 *
 * This is the bridge to contexts that can't mount <PlantStreak/>: Android
 * home-screen widgets (react-native-android-widget's SvgWidget takes a static
 * SVG string), preview scripts, server-side rendering, sharing images, etc.
 * It draws exactly what getVisibleTree produces, so the output matches the
 * in-app component pixel-for-pixel (minus animation).
 */

import { FinalizeOpts, generateTree } from './generateTree';
import { generateTreeLSystem } from './generateTreeLSystem';
import { maturity } from './growth';
import { getVisibleTree, leafPath, plantScale } from './reveal';

const LEAF = [0, 1, 2].map(leafPath);

export interface PlantSvgOptions {
  seed: number;
  /** Streak length in days (drives maturity). */
  days: number;
  algorithm?: 'colony' | 'lsystem';
  config?: FinalizeOpts;
  /** Output size in px; defaults to the authored 170×170. */
  width?: number;
  height?: number;
  /**
   * Optional viewBox ("x y w h") to crop/zoom the authored 170×170 box —
   * e.g. a portrait crop for a widget slot. Defaults to the full box.
   */
  viewBox?: string;
  /** Background fill; omit for transparent. */
  background?: string;
  /** Draw the soil mound (default true). */
  soil?: boolean;
}

function decorSvg(d: ReturnType<typeof getVisibleTree>['decor'][number]): string {
  const r = d.size * d.scale;
  if (d.type === 'flower') {
    let s = `<g opacity="${d.opacity.toFixed(2)}">`;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      s += `<circle cx="${(d.x + Math.cos(a) * r * 0.62).toFixed(1)}" cy="${(d.y + Math.sin(a) * r * 0.62).toFixed(1)}" r="${(r * 0.55).toFixed(1)}" fill="${d.fill}"/>`;
    }
    return s + `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${(r * 0.5).toFixed(1)}" fill="#ffd34d"/></g>`;
  }
  if (d.type === 'fruit') {
    return `<g opacity="${d.opacity.toFixed(2)}"><circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${d.fill}"/><circle cx="${(d.x - r * 0.3).toFixed(1)}" cy="${(d.y - r * 0.3).toFixed(1)}" r="${(r * 0.28).toFixed(1)}" fill="#fff" opacity="0.6"/></g>`;
  }
  return `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${d.fill}" opacity="${d.opacity.toFixed(2)}"/>`;
}

export function plantSvgString(opts: PlantSvgOptions): string {
  const algorithm = opts.algorithm ?? 'lsystem';
  const tree =
    algorithm === 'colony'
      ? generateTree(opts.seed, opts.config)
      : generateTreeLSystem(opts.seed, opts.config);
  const m = maturity(opts.days);
  const v = getVisibleTree(tree, m);
  const { width: boxW, height: boxH, baseX, baseY } = tree.view;

  const outW = opts.width ?? boxW;
  const outH = opts.height ?? boxH;
  const viewBox = opts.viewBox ?? `0 0 ${boxW} ${boxH}`;
  const soil = opts.soil ?? true;
  const sc = plantScale(m);

  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="${viewBox}">`;
  if (opts.background) s += `<rect x="-200" y="-200" width="600" height="600" fill="${opts.background}"/>`;
  if (soil) {
    s += `<ellipse cx="${baseX}" cy="${baseY + 4}" rx="42" ry="8" fill="#4f3d2b"/>`;
    s += `<ellipse cx="${baseX}" cy="${baseY + 1}" rx="34" ry="5.5" fill="#6b5640"/>`;
  }
  s += `<g transform="translate(${baseX} ${baseY}) scale(${sc}) translate(${-baseX} ${-baseY})">`;
  for (const g of v.segments)
    s += `<line x1="${g.x1.toFixed(1)}" y1="${g.y1.toFixed(1)}" x2="${g.x2.toFixed(1)}" y2="${g.y2.toFixed(1)}" stroke="${g.color}" stroke-width="${g.width.toFixed(2)}" stroke-linecap="round"/>`;
  for (const l of v.leaves)
    s += `<g opacity="${l.opacity.toFixed(2)}" transform="translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.rotationDeg.toFixed(1)}) scale(${l.scale.toFixed(3)})"><path d="${LEAF[l.variant % LEAF.length]}" fill="${l.fill}"/></g>`;
  for (const d of v.decor) s += decorSvg(d);
  return s + `</g></svg>`;
}
