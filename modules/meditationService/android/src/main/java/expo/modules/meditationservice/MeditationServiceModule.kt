package expo.modules.meditationservice

import android.content.Intent
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class MeditationStateRecord : Record {
  @Field var presetName: String = ""
  @Field var phaseName: String = ""
  @Field var isPaused: Boolean = false
  @Field var remainingMs: Double = 0.0
  @Field var totalMs: Double = 0.0
  @Field var canSkip: Boolean = false
}

class SoundScheduleRecord : Record {
  @Field var type: String = ""
  @Field var soundId: Int = 0
  @Field var intervalMs: Double = 0.0
  @Field var minIntervalMs: Double = 0.0
  @Field var maxIntervalMs: Double = 0.0
}

class MeditationServiceModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("MeditationService")

    Events("restart", "pausePlay", "stop", "skip")

    OnCreate {
      MeditationForegroundService.moduleListener = { action ->
        sendEvent(action)
      }
    }

    OnDestroy {
      MeditationForegroundService.moduleListener = null
    }

    Function("start") { state: MeditationStateRecord ->
      val context = appContext.reactContext
      if (context != null) {
        val intent = Intent(context, MeditationForegroundService::class.java).apply {
          action = MeditationForegroundService.ACTION_START
          putState(state)
        }
        ContextCompat.startForegroundService(context, intent)
      }
    }

    Function("update") { state: MeditationStateRecord ->
      val context = appContext.reactContext
      if (context != null) {
        val intent = Intent(context, MeditationForegroundService::class.java).apply {
          action = MeditationForegroundService.ACTION_UPDATE
          putState(state)
        }
        ContextCompat.startForegroundService(context, intent)
      }
    }

    Function("stop") {
      val context = appContext.reactContext
      if (context != null) {
        val intent = Intent(context, MeditationForegroundService::class.java).apply {
          action = MeditationForegroundService.ACTION_STOP
        }
        ContextCompat.startForegroundService(context, intent)
      }
    }

    // ---- Sound scheduling (delegated directly to running service instance) ----

    Function("setSoundSchedule") { entries: List<SoundScheduleRecord> ->
      val mapped = entries.map {
        MeditationForegroundService.ScheduleEntry(
          type = it.type,
          soundId = it.soundId,
          intervalMs = it.intervalMs.toLong(),
          minIntervalMs = it.minIntervalMs.toLong(),
          maxIntervalMs = it.maxIntervalMs.toLong()
        )
      }
      MeditationForegroundService.instance?.setScheduleInternal(mapped)
    }

    Function("clearSoundSchedule") {
      MeditationForegroundService.instance?.clearScheduleInternal()
    }

    Function("pauseSoundSchedule") {
      MeditationForegroundService.instance?.pauseScheduleInternal()
    }

    Function("resumeSoundSchedule") {
      MeditationForegroundService.instance?.resumeScheduleInternal()
    }

    Function("setAmbientVolume") { volume: Double ->
      MeditationForegroundService.instance?.setAmbientVolumeInternal(volume.toFloat())
    }
  }

  private fun Intent.putState(state: MeditationStateRecord) {
    putExtra(MeditationForegroundService.EXTRA_PRESET, state.presetName)
    putExtra(MeditationForegroundService.EXTRA_PHASE, state.phaseName)
    putExtra(MeditationForegroundService.EXTRA_PAUSED, state.isPaused)
    putExtra(MeditationForegroundService.EXTRA_REMAINING_MS, state.remainingMs.toLong())
    putExtra(MeditationForegroundService.EXTRA_TOTAL_MS, state.totalMs.toLong())
    putExtra(MeditationForegroundService.EXTRA_CAN_SKIP, state.canSkip)
  }
}
