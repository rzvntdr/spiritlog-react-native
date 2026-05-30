import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import { streakTierFor } from '../utils/streakTier';
import { plantSvgString } from './plantSvg';
import type { WidgetPayload } from './widgetData';

// calmTheme colors (widgets can't read the RN theme context).
const BG = '#162033';
const TEXT: `#${string}` = '#e8edf7';
const TEXT_MUTE = '#6c7a99';
const TEXT_DIM = '#9aa6c2';
const GOLD_PALE: `#${string}` = '#f5d896';
const WARM_BRIGHT: `#${string}` = '#e8b880';

function numberColor(streak: number): `#${string}` {
  const tier = streakTierFor(streak);
  if (tier === 'bud' || tier === 'bloom') return WARM_BRIGHT;
  if (tier === 'flourish' || tier === 'radiance') return '#d4a843';
  if (tier === 'year' || tier === 'aurora') return GOLD_PALE;
  return TEXT;
}

/** The widget UI. A plain function (not a component) so it can be called from
 *  the task handler and from requestWidgetUpdate. */
export function StreakWidget(payload: WidgetPayload) {
  const { streak, freezes, subtitle } = payload;
  const tier = streakTierFor(streak);

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: BG,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <SvgWidget
        svg={plantSvgString(tier)}
        style={{ width: 88, height: 104 }}
      />

      <FlexWidget
        style={{
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          marginLeft: 12,
        }}
      >
        <TextWidget
          text={String(streak)}
          style={{ fontSize: 44, fontWeight: '300', color: numberColor(streak) }}
        />
        <TextWidget
          text={subtitle}
          style={{ fontSize: 10, color: TEXT_MUTE, letterSpacing: 1 }}
        />
        {freezes > 0 ? (
          <TextWidget
            text={`🛡 ${freezes} ${freezes === 1 ? 'freeze' : 'freezes'}`}
            style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}
          />
        ) : (
          <TextWidget text="" style={{ fontSize: 1, color: TEXT_DIM }} />
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
