import { foliageDensity, plantSvgString } from '../components/home/streak-art/plant-engine';
import type { WidgetPayload } from './widgetData';

/**
 * The widget shows THE SAME plant as the hero card: identical engine, the
 * user's persisted seed + tuning, maturity driven by the streak. Rendered as
 * a static SVG string for react-native-android-widget's SvgWidget.
 *
 * Portrait crop of the authored 170×170 box matching the widget slot's 88:104
 * ratio (keeps the soil + roots in frame, trims dead side margins).
 */
const VIEWBOX = '0 -8 168 198';

export function plantWidgetSvg(payload: WidgetPayload, width = 88, height = 104): string {
  const t = payload.plantTuning;
  return plantSvgString({
    seed: payload.plantSeed,
    days: payload.streak,
    algorithm: payload.plantAlgorithm,
    config: {
      leaf: foliageDensity(t.density),
      leafSizeScale: t.leafScale,
      thicknessScale: t.thickness,
      branchiness: t.branchiness,
      crownSpread: t.crownSpread,
      ...(payload.plantForm !== 'auto' ? { lsystemForm: payload.plantForm } : {}),
    },
    width,
    height,
    viewBox: VIEWBOX,
  });
}
