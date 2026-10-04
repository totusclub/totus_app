package com.totus.com

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.telecom.Connection
import android.telecom.ConnectionRequest
import android.telecom.ConnectionService
import android.telecom.DisconnectCause
import android.telecom.PhoneAccount
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.util.Log
import java.util.concurrent.ConcurrentHashMap

/**
 * Self-managed Telecom integration (Android 8+). The UI stays Totus' own (no system call
 * screen: self-managed calls never get one), but Telecom knows a call is ringing / active, so:
 *  - volume keys and the power key while ringing silence it ([TotusConnection.onSilence]),
 *    exactly like a normal phone call;
 *  - "end call with the side key" and headset / car / watch buttons reach the app;
 *  - a regular GSM call and a Totus call do not collide.
 * Needs MANAGE_OWN_CALLS (normal permission, no prompt). If Telecom refuses, the call UI works
 * without it (TotusCallManager shows the call directly).
 */
object TotusTelecom {
  private const val TAG = "TotusCall"
  private const val ACCOUNT_ID = "totus_voip_self_managed"
  private val connections = ConcurrentHashMap<String, TotusConnection>()

  private fun accountHandle(context: Context): PhoneAccountHandle =
    PhoneAccountHandle(ComponentName(context, TotusConnectionService::class.java), ACCOUNT_ID)

  /** true: Telecom accepted the request; the UI starts in onShowIncomingCallUi. */
  fun addIncomingCall(context: Context, callId: String, callerName: String): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return false
    }
    return try {
      val telecom = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager ?: return false
      val handle = accountHandle(context)
      telecom.registerPhoneAccount(
        PhoneAccount.builder(handle, context.getString(R.string.totus_call_default_caller))
          .setCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED)
          .build(),
      )
      if (!telecom.isIncomingCallPermitted(handle)) {
        Log.w(TAG, "Telecom: incoming call not permitted now (another call?)")
        return false
      }
      val extras = Bundle()
      extras.putString(TotusCallManager.EXTRA_CALL_ID, callId)
      extras.putString(TotusCallManager.EXTRA_CALLER_NAME, callerName)
      telecom.addNewIncomingCall(handle, extras)
      true
    } catch (e: Exception) {
      Log.w(TAG, "Telecom addNewIncomingCall failed", e)
      false
    }
  }

  fun register(callId: String, connection: TotusConnection) {
    connections[callId]?.let { if (it !== connection) it.finish(DisconnectCause.CANCELED) }
    connections[callId] = connection
  }

  fun unregister(callId: String, connection: TotusConnection) {
    connections.remove(callId, connection)
  }

  /** Answered (in the app or from the notification): the Telecom call becomes active. */
  fun setActive(callId: String) {
    val c = connections[callId] ?: return
    try {
      if (c.state == Connection.STATE_RINGING || c.state == Connection.STATE_NEW) {
        c.setActive()
      }
    } catch (e: Exception) {
      Log.w(TAG, "Telecom setActive failed", e)
    }
  }

  fun disconnect(callId: String, cause: Int) {
    connections[callId]?.finish(cause)
  }

  fun disconnectAll() {
    for (c in connections.values) {
      c.finish(DisconnectCause.LOCAL)
    }
  }
}

/** Bound by Telecom only for the self-managed account (registered on Android 8+). */
class TotusConnectionService : ConnectionService() {
  override fun onCreateIncomingConnection(
    connectionManagerPhoneAccount: PhoneAccountHandle?,
    request: ConnectionRequest?,
  ): Connection {
    val extras = request?.extras
    val callId = extras?.getString(TotusCallManager.EXTRA_CALL_ID) ?: ""
    val callerName = extras?.getString(TotusCallManager.EXTRA_CALLER_NAME) ?: ""
    val connection = TotusConnection(applicationContext, callId, callerName)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      connection.connectionProperties = Connection.PROPERTY_SELF_MANAGED
    }
    connection.setAudioModeIsVoip(true)
    connection.setAddress(
      Uri.fromParts(PhoneAccount.SCHEME_SIP, callId.ifBlank { "totus" }, null),
      TelecomManager.PRESENTATION_ALLOWED,
    )
    connection.setCallerDisplayName(
      callerName.ifBlank { getString(R.string.totus_call_default_caller) },
      TelecomManager.PRESENTATION_ALLOWED,
    )
    connection.setRinging()
    if (callId.isNotEmpty()) {
      TotusTelecom.register(callId, connection)
      if (TotusCallManager.isFinished(callId)) {
        // The call ended (call_ended push, declined) before Telecom created the connection.
        android.os.Handler(android.os.Looper.getMainLooper()).post {
          connection.finish(DisconnectCause.REMOTE)
        }
      }
    }
    return connection
  }

  override fun onCreateIncomingConnectionFailed(
    connectionManagerPhoneAccount: PhoneAccountHandle?,
    request: ConnectionRequest?,
  ) {
    val callId = request?.extras?.getString(TotusCallManager.EXTRA_CALL_ID) ?: return
    Log.w("TotusCall", "Telecom refused the incoming call, showing it directly")
    TotusCallManager.startAlerting(applicationContext, callId)
  }
}

class TotusConnection(
  private val context: Context,
  private val callId: String,
  private val callerName: String,
) : Connection() {
  @Volatile private var finished = false

  /** Telecom: show the incoming-call UI now (ringtone / notification). */
  override fun onShowIncomingCallUi() {
    TotusCallManager.startAlerting(context, callId)
  }

  /** Volume or power key while ringing (Android 10+). */
  override fun onSilence() {
    TotusCallManager.silenceIncoming(context)
  }

  /** Headset / car / watch "answer". */
  override fun onAnswer() {
    TotusCallManager.answerFromSystem(context, callId, callerName)
  }

  override fun onReject() {
    if (!finished) {
      TotusCallManager.declineIncoming(context, callId)
    }
  }

  /** Side key "end call", headset hang-up. */
  override fun onDisconnect() {
    if (finished) {
      return
    }
    if (TotusCallManager.isIncomingCall(callId)) {
      TotusCallManager.declineIncoming(context, callId)
    } else {
      TotusCallManager.hangUp(context, callId)
    }
  }

  override fun onAbort() {
    finish(DisconnectCause.CANCELED)
  }

  fun finish(cause: Int) {
    if (finished) {
      return
    }
    finished = true
    try {
      setDisconnected(DisconnectCause(cause))
      destroy()
    } catch (e: Exception) {
      Log.w("TotusCall", "Telecom disconnect failed", e)
    }
    TotusTelecom.unregister(callId, this)
  }
}
