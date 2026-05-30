import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { StreakWidget } from './StreakWidgetView';
import { loadWidgetData } from './widgetData';

/**
 * Headless handler invoked by the OS when a widget needs to render (added,
 * updated, resized, clicked). Reads the last-saved payload from storage so the
 * widget shows current data even when the app isn't running.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const payload = await loadWidgetData();
      renderWidget(StreakWidget(payload));
      break;
    }
    case 'WIDGET_CLICK':
      // OPEN_APP is handled natively by the launch intent; nothing to do here.
      break;
    case 'WIDGET_DELETED':
    default:
      break;
  }
}
