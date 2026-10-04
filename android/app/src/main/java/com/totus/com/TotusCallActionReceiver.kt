package com.totus.com

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * "Отклонить" on the incoming-call notification and "Завершить" on the ongoing-call
 * notification. Stops the ringing / the call service natively right away, then runs the JS
 * task "TotusVoipActionTask" (index.js) that tells the server — also when the app was closed.
 * No activity is started (Android 12+ forbids notification trampolines).
 */
class TotusCallActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val callId = intent.getStringExtra(TotusCallManager.EXTRA_CALL_ID) ?: return
    when (intent.action) {
      ACTION_DECLINE -> TotusCallManager.declineIncoming(context, callId)
      ACTION_HANGUP -> TotusCallManager.hangUp(context, callId)
    }
  }

  companion object {
    const val ACTION_DECLINE = "com.totus.com.call.DECLINE"
    const val ACTION_HANGUP = "com.totus.com.call.HANGUP"

    fun pendingIntent(context: Context, action: String, callId: String, code: Int): PendingIntent {
      val intent = Intent(context, TotusCallActionReceiver::class.java)
        .setAction(action)
        .putExtra(TotusCallManager.EXTRA_CALL_ID, callId)
      return PendingIntent.getBroadcast(
        context,
        TotusCallManager.requestCode(callId, code),
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }
  }
}
