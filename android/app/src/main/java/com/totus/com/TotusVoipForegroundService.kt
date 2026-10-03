package com.totus.com

import android.app.Service
import android.content.Intent
import android.os.IBinder

/**
 * Minimal service so IncomingCallActivity can compile and start.
 * The full VoIP foreground implementation is not in this tree.
 */
class TotusVoipForegroundService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    return START_NOT_STICKY
  }

  companion object {
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
