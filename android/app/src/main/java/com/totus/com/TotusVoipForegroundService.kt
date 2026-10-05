package com.totus.com

import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.ServiceCompat

/**
 * Foreground service for a call in progress (type microphone): keeps the microphone and the
 * audio alive while the app is minimized or the screen is off (Android 11+ blocks the
 * microphone of background apps without it). Started from JS when the call starts / is
 * answered (the app is on screen then), stopped when the call ends.
 * Notification: "Идёт звонок" with "Завершить" ([TotusCallManager.buildOngoingNotification]).
 */
class TotusVoipForegroundService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    TotusCallManager.ongoingServiceRunning = true
  }

  override fun onDestroy() {
    TotusCallManager.ongoingServiceRunning = false
    super.onDestroy()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START_ONGOING -> {
        val callId = intent.getStringExtra(TotusCallManager.EXTRA_CALL_ID) ?: ""
        val callerName = intent.getStringExtra(TotusCallManager.EXTRA_CALLER_NAME) ?: ""
        if (!enterForeground(callId, callerName)) {
          stopSelf()
        }
      }
      ACTION_STOP -> {
        try {
          ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        } catch (e: Exception) {
          Log.w(TAG, "stopForeground failed", e)
        }
        stopSelf()
      }
      else -> stopSelf()
    }
    return START_NOT_STICKY
  }

  private fun enterForeground(callId: String, callerName: String): Boolean {
    return try {
      val notification = TotusCallManager.buildOngoingNotification(this, callId, callerName)
      val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
      } else {
        0
      }
      ServiceCompat.startForeground(this, TotusCallManager.ONGOING_NOTIFICATION_ID, notification, type)
      true
    } catch (e: Exception) {
      Log.w(TAG, "startForeground failed", e)
      false
    }
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    // The user swiped the app away during a call: the call cannot continue without JS.
    TotusCallManager.stopAll(this)
    super.onTaskRemoved(rootIntent)
  }

  companion object {
    private const val TAG = "TotusCall"
    const val ACTION_START_ONGOING = "com.totus.com.call.START_ONGOING"
    const val ACTION_STOP = "com.totus.com.call.STOP_ONGOING"

    // Used by IncomingCallActivity (legacy screen, not launched by the current flow).
    const val ACTION_CLOSE_INCOMING_UI = "com.totus.com.CLOSE_INCOMING_UI"
    const val ACTION_CONNECTION_STATUS_UPDATE = "com.totus.com.CONNECTION_STATUS_UPDATE"
    const val ACTION_REJECT = "com.totus.com.REJECT"
    const val ACTION_ANSWER = "com.totus.com.ANSWER"
    const val ACTION_END = "com.totus.com.END"
    const val ACTION_TOGGLE_MUTE = "com.totus.com.TOGGLE_MUTE"
    const val ACTION_TOGGLE_SPEAKER = "com.totus.com.TOGGLE_SPEAKER"

    const val EXTRA_CALL_ID = "callId"
    const val EXTRA_CONNECTION_STATE = "connectionState"
    const val EXTRA_ICE_CONNECTION_STATE = "iceConnectionState"
    const val EXTRA_IS_CONNECTING = "isConnecting"
    const val EXTRA_IS_CONNECTED = "isConnected"
    const val EXTRA_IS_INCOMING = "isIncoming"
    const val EXTRA_IS_OUTGOING = "isOutgoing"
    const val EXTRA_CALLER_NAME = "callerName"
    const val EXTRA_PAYLOAD_JSON = "payloadJson"
    const val EXTRA_HANDLE = "handle"
    const val EXTRA_FORCE_CONNECTING = "forceConnecting"
    const val EXTRA_AUTO_ANSWER_FROM_NOTIFICATION = "autoAnswerFromNotification"
  }
}
