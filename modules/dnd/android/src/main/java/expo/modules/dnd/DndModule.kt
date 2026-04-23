package expo.modules.dnd

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DndModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Dnd")

    Function("isAccessGranted") {
      val nm = appContext.reactContext?.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      nm?.isNotificationPolicyAccessGranted ?: false
    }

    Function("requestAccess") {
      val context = appContext.reactContext
      if (context != null) {
        val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
      }
    }

    Function("enableDnd") {
      val nm = appContext.reactContext?.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      if (nm != null && nm.isNotificationPolicyAccessGranted) {
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
      }
    }

    Function("disableDnd") {
      val nm = appContext.reactContext?.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      if (nm != null && nm.isNotificationPolicyAccessGranted) {
        nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
      }
    }
  }
}
