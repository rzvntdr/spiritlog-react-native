package expo.modules.meditationservice

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.media.app.NotificationCompat.MediaStyle

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

    fun emitAction(action: String) {
      moduleListener?.invoke(action)
    }
  }

  private var mediaSession: MediaSessionCompat? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
    mediaSession = MediaSessionCompat(this, "MeditationSession").apply {
      isActive = true
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
      }
      ACTION_UPDATE -> {
        val notification = buildNotification(intent)
        NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, notification)
      }
      ACTION_STOP -> {
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
      }
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
    mediaSession?.release()
    mediaSession = null
    NotificationManagerCompat.from(this).cancel(NOTIFICATION_ID)
  }

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

    // Update MediaSession metadata so the lock-screen player + system tray show the right info
    mediaSession?.apply {
      setMetadata(
        MediaMetadataCompat.Builder()
          .putString(MediaMetadataCompat.METADATA_KEY_TITLE, preset)
          .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, subtitle)
          .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, totalMs.coerceAtLeast(0L))
          .build()
      )
      setPlaybackState(
        PlaybackStateCompat.Builder()
          .setState(
            if (isPaused) PlaybackStateCompat.STATE_PAUSED else PlaybackStateCompat.STATE_PLAYING,
            (totalMs - remainingMs).coerceAtLeast(0L),
            1f
          )
          .setActions(
            PlaybackStateCompat.ACTION_PLAY or
              PlaybackStateCompat.ACTION_PAUSE or
              PlaybackStateCompat.ACTION_STOP or
              PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
              PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
          )
          .build()
      )
    }

    val pausePlayIcon = if (isPaused) {
      android.R.drawable.ic_media_play
    } else {
      android.R.drawable.ic_media_pause
    }
    val pausePlayLabel = if (isPaused) "Play" else "Pause"

    // Actions in TimerControls order: Restart, Play/Pause, Stop, Skip
    val restartAction = NotificationCompat.Action(
      android.R.drawable.ic_menu_revert,
      "Restart",
      buildActionIntent(MeditationActionReceiver.ACTION_RESTART)
    )
    val pausePlayAction = NotificationCompat.Action(
      pausePlayIcon,
      pausePlayLabel,
      buildActionIntent(MeditationActionReceiver.ACTION_PAUSE_PLAY)
    )
    val stopAction = NotificationCompat.Action(
      android.R.drawable.ic_menu_close_clear_cancel,
      "Stop",
      buildActionIntent(MeditationActionReceiver.ACTION_STOP)
    )
    val skipAction = NotificationCompat.Action(
      android.R.drawable.ic_media_next,
      "Skip",
      buildActionIntent(MeditationActionReceiver.ACTION_SKIP)
    )

    val mediaStyle = MediaStyle()
      .setMediaSession(mediaSession?.sessionToken)
      // Compact view (collapsed notification) shows these 3 — pick the most-used center trio.
      .setShowActionsInCompactView(0, 1, 2)

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle(preset)
      .setContentText(subtitle)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(buildContentIntent())
      .setStyle(mediaStyle)
      .addAction(restartAction)
      .addAction(pausePlayAction)
      .addAction(stopAction)

    if (canSkip) {
      builder.addAction(skipAction)
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
