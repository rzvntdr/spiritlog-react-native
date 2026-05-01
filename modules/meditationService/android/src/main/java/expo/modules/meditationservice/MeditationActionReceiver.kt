package expo.modules.meditationservice

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class MeditationActionReceiver : BroadcastReceiver() {

  companion object {
    const val ACTION_RESTART = "expo.modules.meditationservice.ACTION_RESTART"
    const val ACTION_PAUSE_PLAY = "expo.modules.meditationservice.ACTION_PAUSE_PLAY"
    const val ACTION_STOP = "expo.modules.meditationservice.ACTION_STOP"
    const val ACTION_SKIP = "expo.modules.meditationservice.ACTION_SKIP"
  }

  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ACTION_RESTART -> MeditationForegroundService.emitAction("restart")
      ACTION_PAUSE_PLAY -> MeditationForegroundService.emitAction("pausePlay")
      ACTION_STOP -> MeditationForegroundService.emitAction("stop")
      ACTION_SKIP -> MeditationForegroundService.emitAction("skip")
    }
  }
}
