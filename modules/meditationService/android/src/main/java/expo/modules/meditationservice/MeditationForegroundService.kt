package expo.modules.meditationservice

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import kotlin.random.Random

/**
 * Foreground service that owns the meditation session lifecycle:
 * - Persistent ongoing notification (timer + Restart/Pause/Stop/Skip actions)
 * - WakeLock to keep CPU active while session runs
 * - Native scheduling and playback of interval/random/ambient sounds via
 *   Handler + MediaPlayer. This is the source of truth for sound playback —
 *   it runs even when JS is suspended in the background.
 */
class MeditationForegroundService : Service() {

  companion object {
    const val NOTIFICATION_ID = 4242
    const val CHANNEL_ID = "meditation_session"
    const val CHANNEL_NAME = "Meditation Session"

    const val ACTION_START = "expo.modules.meditationservice.START"
    const val ACTION_UPDATE = "expo.modules.meditationservice.UPDATE"
    const val ACTION_STOP = "expo.modules.meditationservice.STOP"

    const val EXTRA_PRESET = "preset"
    const val EXTRA_PHASE = "phase"
    const val EXTRA_PAUSED = "paused"
    const val EXTRA_REMAINING_MS = "remainingMs"
    const val EXTRA_TOTAL_MS = "totalMs"
    const val EXTRA_CAN_SKIP = "canSkip"

    @Volatile
    var moduleListener: ((String) -> Unit)? = null

    @Volatile
    var instance: MeditationForegroundService? = null

    fun emitAction(action: String) {
      moduleListener?.invoke(action)
    }

    private const val WAKE_LOCK_TIMEOUT_MS = 60L * 60 * 1000

    /** Map JS sound IDs to raw-resource names. Mirrors `src/types/sound.ts`.
     *  Resolved at runtime via `getIdentifier` because the resources live in the
     *  main app's res/raw, not the module's, so we can't reference R.raw directly.
     */
    fun resourceNameForSoundId(soundId: Int): String? = when (soundId) {
      1 -> "bell"
      2 -> "swoosh"
      3 -> "drone"
      4 -> "bird_sing"
      5 -> "bark"
      6 -> "distorted_rar"
      7 -> "ambient_rain"
      8 -> "ambient_ocean"
      9 -> "ambient_forest"
      else -> null
    }
  }

  data class ScheduleEntry(
    val type: String,           // "FIXED_INTERVAL", "RANDOM_INTERVAL", "AMBIENT"
    val soundId: Int,
    val intervalMs: Long,       // FIXED only
    val minIntervalMs: Long,    // RANDOM only
    val maxIntervalMs: Long     // RANDOM only
  )

  private inner class IntervalTracker(val schedule: ScheduleEntry) {
    var nextFireUptimeMs: Long = SystemClock.uptimeMillis() + computeNextDelay(schedule)
    var pausedRemainingMs: Long? = null
  }

  private var wakeLock: PowerManager.WakeLock? = null
  private val soundHandler = Handler(Looper.getMainLooper())
  private val intervalTrackers = mutableListOf<IntervalTracker>()
  private var ambientPlayer: MediaPlayer? = null
  private var ambientVolume: Float = 0.5f
  private var schedulePaused: Boolean = false

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    instance = this
    ensureChannel()
    val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = powerManager.newWakeLock(
      PowerManager.PARTIAL_WAKE_LOCK,
      "SpiritLog:MeditationServiceWakeLock"
    ).apply {
      setReferenceCounted(false)
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> {
        val notification = buildNotification(intent)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
          startForeground(
            NOTIFICATION_ID,
            notification,
            ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
          )
        } else {
          startForeground(NOTIFICATION_ID, notification)
        }
        acquireWakeLock()
      }
      ACTION_UPDATE -> {
        val notification = buildNotification(intent)
        NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, notification)
        acquireWakeLock()
      }
      ACTION_STOP -> {
        clearScheduleInternal()
        releaseWakeLock()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
      }
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
    clearScheduleInternal()
    releaseWakeLock()
    NotificationManagerCompat.from(this).cancel(NOTIFICATION_ID)
    instance = null
  }

  // ---- Sound scheduling API (called from MeditationServiceModule) ----

  fun setScheduleInternal(entries: List<ScheduleEntry>) {
    clearScheduleInternal()
    schedulePaused = false
    val now = SystemClock.uptimeMillis()
    for (e in entries) {
      when (e.type) {
        "AMBIENT" -> startAmbient(e.soundId, ambientVolume)
        "FIXED_INTERVAL", "RANDOM_INTERVAL" -> {
          val tracker = IntervalTracker(e).apply {
            nextFireUptimeMs = now + computeNextDelay(e)
          }
          intervalTrackers.add(tracker)
          scheduleTracker(tracker)
        }
      }
    }
  }

  fun clearScheduleInternal() {
    soundHandler.removeCallbacksAndMessages(null)
    intervalTrackers.clear()
    schedulePaused = false
    stopAmbient()
  }

  fun pauseScheduleInternal() {
    if (schedulePaused) return
    schedulePaused = true
    val now = SystemClock.uptimeMillis()
    for (t in intervalTrackers) {
      t.pausedRemainingMs = (t.nextFireUptimeMs - now).coerceAtLeast(0)
    }
    soundHandler.removeCallbacksAndMessages(null)
    try { ambientPlayer?.pause() } catch (_: Exception) {}
  }

  fun resumeScheduleInternal() {
    if (!schedulePaused) return
    schedulePaused = false
    val now = SystemClock.uptimeMillis()
    for (t in intervalTrackers) {
      val remaining = t.pausedRemainingMs ?: continue
      t.nextFireUptimeMs = now + remaining
      t.pausedRemainingMs = null
      scheduleTracker(t)
    }
    try { ambientPlayer?.start() } catch (_: Exception) {}
  }

  fun setAmbientVolumeInternal(volume: Float) {
    ambientVolume = volume.coerceIn(0f, 1f)
    try { ambientPlayer?.setVolume(ambientVolume, ambientVolume) } catch (_: Exception) {}
  }

  // ---- Internals ----

  private fun scheduleTracker(tracker: IntervalTracker) {
    val delay = (tracker.nextFireUptimeMs - SystemClock.uptimeMillis()).coerceAtLeast(0)
    soundHandler.postDelayed({
      // Tracker may have been removed via clearSchedule; ignore stale callbacks.
      if (intervalTrackers.contains(tracker) && !schedulePaused) {
        fireTracker(tracker)
      }
    }, delay)
  }

  private fun fireTracker(tracker: IntervalTracker) {
    playOneShotSound(tracker.schedule.soundId)
    val nextDelay = computeNextDelay(tracker.schedule)
    tracker.nextFireUptimeMs = SystemClock.uptimeMillis() + nextDelay
    scheduleTracker(tracker)
  }

  private fun computeNextDelay(schedule: ScheduleEntry): Long {
    return when (schedule.type) {
      "FIXED_INTERVAL" -> schedule.intervalMs.coerceAtLeast(100L)
      "RANDOM_INTERVAL" -> {
        val min = schedule.minIntervalMs.coerceAtLeast(100L)
        val max = schedule.maxIntervalMs.coerceAtLeast(min + 1L)
        Random.nextLong(min, max + 1L)
      }
      else -> Long.MAX_VALUE
    }
  }

  private fun resolveSoundRes(soundId: Int): Int {
    val name = resourceNameForSoundId(soundId) ?: return 0
    return resources.getIdentifier(name, "raw", packageName)
  }

  private fun playOneShotSound(soundId: Int) {
    val resId = resolveSoundRes(soundId)
    if (resId == 0) return
    try {
      val player = MediaPlayer.create(this, resId) ?: return
      player.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      player.setOnCompletionListener {
        try { it.release() } catch (_: Exception) {}
      }
      player.setOnErrorListener { mp, _, _ ->
        try { mp.release() } catch (_: Exception) {}
        true
      }
      player.start()
    } catch (_: Exception) {
      // Silently fail — don't crash the timer for a sound error
    }
  }

  private fun startAmbient(soundId: Int, volume: Float) {
    stopAmbient()
    val resId = resolveSoundRes(soundId)
    if (resId == 0) return
    try {
      val player = MediaPlayer.create(this, resId) ?: return
      player.isLooping = true
      player.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
          .build()
      )
      player.setVolume(volume, volume)
      player.setOnErrorListener { mp, _, _ ->
        try { mp.release() } catch (_: Exception) {}
        if (ambientPlayer === mp) ambientPlayer = null
        true
      }
      player.start()
      ambientPlayer = player
    } catch (_: Exception) {}
  }

  private fun stopAmbient() {
    val p = ambientPlayer ?: return
    ambientPlayer = null
    try {
      if (p.isPlaying) p.stop()
      p.release()
    } catch (_: Exception) {}
  }

  // ---- Wake lock ----

  private fun acquireWakeLock() {
    wakeLock?.acquire(WAKE_LOCK_TIMEOUT_MS)
  }

  private fun releaseWakeLock() {
    wakeLock?.let { if (it.isHeld) it.release() }
  }

  // ---- Notification ----

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (nm.getNotificationChannel(CHANNEL_ID) == null) {
        val channel = NotificationChannel(
          CHANNEL_ID,
          CHANNEL_NAME,
          NotificationManager.IMPORTANCE_LOW
        ).apply {
          description = "Ongoing meditation session"
          setSound(null, null)
          enableVibration(false)
          setShowBadge(false)
        }
        nm.createNotificationChannel(channel)
      }
    }
  }

  private fun buildNotification(intent: Intent): Notification {
    val preset = intent.getStringExtra(EXTRA_PRESET) ?: "Meditation"
    val phase = intent.getStringExtra(EXTRA_PHASE) ?: ""
    val isPaused = intent.getBooleanExtra(EXTRA_PAUSED, false)
    val remainingMs = intent.getLongExtra(EXTRA_REMAINING_MS, 0L)
    val totalMs = intent.getLongExtra(EXTRA_TOTAL_MS, 0L)
    val canSkip = intent.getBooleanExtra(EXTRA_CAN_SKIP, false)

    val timeText = formatTime(remainingMs)
    val subtitle = if (phase.isNotEmpty()) "$phase · $timeText" else timeText

    val pausePlayIcon = if (isPaused) {
      android.R.drawable.ic_media_play
    } else {
      android.R.drawable.ic_media_pause
    }
    val pausePlayLabel = if (isPaused) "Play" else "Pause"

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle(preset)
      .setContentText(subtitle)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(buildContentIntent())
      .addAction(
        android.R.drawable.ic_menu_revert,
        "Restart",
        buildActionIntent(MeditationActionReceiver.ACTION_RESTART)
      )
      .addAction(
        pausePlayIcon,
        pausePlayLabel,
        buildActionIntent(MeditationActionReceiver.ACTION_PAUSE_PLAY)
      )
      .addAction(
        android.R.drawable.ic_menu_close_clear_cancel,
        "Stop",
        buildActionIntent(MeditationActionReceiver.ACTION_STOP)
      )

    if (canSkip) {
      builder.addAction(
        android.R.drawable.ic_media_next,
        "Skip",
        buildActionIntent(MeditationActionReceiver.ACTION_SKIP)
      )
    }

    if (totalMs > 0 && remainingMs in 0..totalMs) {
      val progress = ((totalMs - remainingMs).toFloat() / totalMs * 100f).toInt()
      builder.setProgress(100, progress.coerceIn(0, 100), false)
    }

    return builder.build()
  }

  private fun buildContentIntent(): PendingIntent {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
      ?: Intent(Intent.ACTION_MAIN).apply {
        setPackage(packageName)
      }
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    return PendingIntent.getActivity(this, 0, launchIntent, flags)
  }

  private fun buildActionIntent(action: String): PendingIntent {
    val intent = Intent(this, MeditationActionReceiver::class.java).apply {
      this.action = action
      setPackage(packageName)
    }
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    return PendingIntent.getBroadcast(this, action.hashCode(), intent, flags)
  }

  private fun formatTime(ms: Long): String {
    if (ms <= 0) return "0:00"
    val totalSec = ms / 1000
    val h = totalSec / 3600
    val m = (totalSec % 3600) / 60
    val s = totalSec % 60
    return if (h > 0) {
      String.format("%d:%02d:%02d", h, m, s)
    } else {
      String.format("%d:%02d", m, s)
    }
  }
}
