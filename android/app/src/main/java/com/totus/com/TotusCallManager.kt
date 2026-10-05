package com.totus.com

import android.Manifest
import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person
import androidx.core.content.ContextCompat
import java.lang.ref.WeakReference

/**
 * Android call UI of Totus (owner decision 04.10.2026: own screen instead of the system
 * Telecom / CallKeep screen).
 *
 * - Incoming call, app on screen: in-app ringtone + vibration, the JS CallModal is the UI.
 * - Incoming call, app in background / closed / phone locked: CallStyle notification with a
 *   full-screen intent (lock screen -> MainActivity over the keyguard), "Answer" opens
 *   MainActivity, "Decline" goes to [TotusCallActionReceiver] (no activity start).
 * - Conversation: [TotusVoipForegroundService] (type microphone) keeps the microphone and audio
 *   alive while the app is minimized or the screen is off; "End call" -> receiver.
 *
 * State is static: the activity, the receiver and the native module share it.
 */
object TotusCallManager {
  private const val TAG = "TotusCall"

  const val INCOMING_CHANNEL_ID = "totus_incoming_calls_v1"
  const val ONGOING_CHANNEL_ID = "totus_ongoing_calls_v1"
  /** Incoming call after the user silenced it with a side key: no sound, no heads-up. */
  const val SILENCED_CHANNEL_ID = "totus_incoming_silenced_v1"
  const val INCOMING_NOTIFICATION_ID = 41001
  const val ONGOING_NOTIFICATION_ID = 41002
  private const val INCOMING_TIMEOUT_MS = 65_000L

  const val EXTRA_CALL_ACTION = "totus_call_action"
  const val EXTRA_CALL_ID = "totus_call_id"
  const val EXTRA_CALLER_NAME = "totus_caller_name"
  const val CALL_ACTION_SHOW = "show"
  const val CALL_ACTION_ANSWER = "answer"
  const val CALL_ACTION_OPEN = "open"

  private val VIBRATION_PATTERN = longArrayOf(0L, 1000L, 1000L)
  private val lock = Any()

  @Volatile private var incomingCallId: String? = null
  @Volatile private var incomingCallerName: String = ""
  @Volatile private var incomingNotificationShown = false
  /** Ringtone / notification sound started for the current incoming call. */
  @Volatile private var alerting = false
  /** The user silenced the current incoming call (volume / power key): it keeps "ringing" silently. */
  @Volatile private var silenced = false
  private val mainHandler = Handler(Looper.getMainLooper())
  @Volatile private var mainActivityVisible = false
  @Volatile var ongoingServiceRunning = false
  private var mainActivityRef: WeakReference<Activity>? = null
  private var ringtone: Ringtone? = null
  private var vibrator: Vibrator? = null
  private var pendingAction: Map<String, String>? = null
  /** Calls already answered / declined / ended: a late "ringing" sync must not ring again. */
  private val finishedCallIds = LinkedHashSet<String>()

  /** Set by [TotusCallModule]: tells JS that a call action (answer / show / open) is waiting. */
  @Volatile var onPendingActionAvailable: (() -> Unit)? = null

  fun requestCode(callId: String, code: Int): Int = (callId.hashCode() and 0x00FFFFFF) * 16 + code

  // ------------------------------------------------------------------ incoming

  fun showIncoming(context: Context, callId: String, callerName: String) {
    val app = context.applicationContext
    var isNew = false
    var nameChanged = false
    synchronized(lock) {
      if (finishedCallIds.contains(callId)) {
        return
      }
      isNew = incomingCallId != callId
      if (isNew) {
        incomingCallerName = ""
        alerting = false
        silenced = false
      }
      nameChanged = callerName.isNotBlank() && callerName != incomingCallerName
      incomingCallId = callId
      if (callerName.isNotBlank()) {
        incomingCallerName = callerName
      }
    }
    if (!isNew) {
      if (nameChanged && incomingNotificationShown) {
        postIncomingNotification(app, silenced)
      }
      return
    }
    // Self-managed Telecom call: the system then handles the side keys like for a normal call
    // (volume / power while ringing -> Connection.onSilence). Our UI starts in onShowIncomingCallUi;
    // if Telecom refuses or does not answer in time, the UI starts directly.
    if (TotusTelecom.addIncomingCall(app, callId, incomingCallerName)) {
      mainHandler.postDelayed({
        if (incomingCallId == callId && !alerting) {
          Log.w(TAG, "Telecom did not show the incoming call in time, showing it directly")
          startAlerting(app, callId)
        }
      }, 2500L)
    } else {
      startAlerting(app, callId)
    }
  }

  /** Ringing starts: in-app ringtone if the app is on screen, otherwise the call notification. */
  fun startAlerting(context: Context, callId: String) {
    val app = context.applicationContext
    synchronized(lock) {
      if (incomingCallId != callId || alerting) {
        return
      }
      alerting = true
    }
    if (mainActivityVisible) {
      if (!silenced) {
        startInAppRinging(app)
      }
    } else {
      postIncomingNotification(app, silenced)
    }
  }

  /**
   * Side key while ringing (Telecom Connection.onSilence, or power key with the app on screen):
   * stop the sound and vibration; the call keeps waiting for Answer / Decline.
   */
  fun silenceIncoming(context: Context) {
    val app = context.applicationContext
    synchronized(lock) {
      if (incomingCallId == null || silenced) {
        return
      }
      silenced = true
    }
    stopInAppRinging()
    if (incomingNotificationShown) {
      // Cancelling stops the insistent notification sound; the call stays in the shade, silent.
      cancelIncomingNotification(app)
      postIncomingNotification(app, true)
    }
  }

  fun isRinging(): Boolean = incomingCallId != null && alerting && !silenced

  /** callId == null: dismiss whatever incoming call is shown. */
  fun dismissIncoming(context: Context, callId: String?) {
    synchronized(lock) {
      if (callId != null) {
        finishedCallIds.add(callId)
        while (finishedCallIds.size > 50) {
          finishedCallIds.remove(finishedCallIds.first())
        }
      }
      if (callId != null && incomingCallId != null && incomingCallId != callId) {
        return
      }
      incomingCallId = null
      alerting = false
      silenced = false
    }
    cancelIncomingNotification(context.applicationContext)
    stopInAppRinging()
  }

  /**
   * The call ended on another device or by the caller (FCM call_ended, server check, ring timeout):
   * stop its ringing / notification and disconnect its Telecom call. Other calls are not touched;
   * the id is remembered, so a late incoming push of this call is not shown again.
   */
  fun endRemote(context: Context, callId: String) {
    dismissIncoming(context, callId)
    TotusTelecom.disconnect(callId, android.telecom.DisconnectCause.REMOTE)
  }

  private fun cancelIncomingNotification(context: Context) {
    incomingNotificationShown = false
    try {
      NotificationManagerCompat.from(context).cancel(INCOMING_NOTIFICATION_ID)
    } catch (e: Exception) {
      Log.w(TAG, "cancel incoming notification failed", e)
    }
  }

  private fun postIncomingNotification(context: Context, silent: Boolean) {
    val callId = incomingCallId ?: return
    ensureChannels(context)
    val name = incomingCallerName.ifBlank { context.getString(R.string.totus_call_default_caller) }
    val fullScreen = activityPendingIntent(context, CALL_ACTION_SHOW, callId, name, 1)
    val answer = activityPendingIntent(context, CALL_ACTION_ANSWER, callId, name, 2)
    val decline = TotusCallActionReceiver.pendingIntent(context, TotusCallActionReceiver.ACTION_DECLINE, callId, 3)

    var notification: Notification? = null
    if (!silent) {
      try {
        val person = Person.Builder().setName(name).setImportant(true).build()
        val builder = baseIncomingBuilder(context, name, fullScreen, INCOMING_CHANNEL_ID)
          .setFullScreenIntent(fullScreen, true)
          .setStyle(NotificationCompat.CallStyle.forIncomingCall(person, decline, answer))
          .addPerson(person)
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
          builder.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE), AudioManager.STREAM_RING)
          builder.setVibrate(VIBRATION_PATTERN)
        }
        notification = builder.build()
        notification.flags = notification.flags or Notification.FLAG_INSISTENT
      } catch (e: Exception) {
        Log.w(TAG, "CallStyle notification failed, using plain one", e)
        notification = null
      }
    }
    if (notification == null) {
      // Silent (screen turned off with the power button while ringing) or CallStyle failed:
      // plain notification with the same two actions, no full-screen intent.
      notification = baseIncomingBuilder(context, name, fullScreen, if (silent) SILENCED_CHANNEL_ID else INCOMING_CHANNEL_ID)
        .setSilent(silent)
        .addAction(0, context.getString(R.string.totus_call_action_decline), decline)
        .addAction(0, context.getString(R.string.totus_call_action_answer), answer)
        .build()
    }
    if (notify(context, INCOMING_NOTIFICATION_ID, notification)) {
      incomingNotificationShown = true
    }
  }

  private fun baseIncomingBuilder(context: Context, name: String, contentIntent: PendingIntent, channelId: String): NotificationCompat.Builder =
    NotificationCompat.Builder(context, channelId)
      .setSmallIcon(R.drawable.ic_totus_phone_white_24)
      .setContentTitle(name)
      .setContentText(context.getString(R.string.totus_call_incoming_text))
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setTimeoutAfter(INCOMING_TIMEOUT_MS)
      .setContentIntent(contentIntent)

  private fun notify(context: Context, id: Int, notification: Notification): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
      Log.w(TAG, "POST_NOTIFICATIONS not granted: incoming call notification not shown")
      return false
    }
    return try {
      NotificationManagerCompat.from(context).notify(id, notification)
      true
    } catch (e: Exception) {
      Log.w(TAG, "notify failed", e)
      false
    }
  }

  private fun activityPendingIntent(context: Context, action: String, callId: String, name: String, code: Int): PendingIntent {
    val intent = Intent(context, MainActivity::class.java).apply {
      this.action = "com.totus.com.call.$action"
      putExtra(EXTRA_CALL_ACTION, action)
      putExtra(EXTRA_CALL_ID, callId)
      putExtra(EXTRA_CALLER_NAME, name)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    return PendingIntent.getActivity(
      context,
      requestCode(callId, code),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  fun ensureChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val nm = context.getSystemService(NotificationManager::class.java) ?: return
    if (nm.getNotificationChannel(INCOMING_CHANNEL_ID) == null) {
      val channel = NotificationChannel(
        INCOMING_CHANNEL_ID,
        context.getString(R.string.totus_call_channel_incoming),
        NotificationManager.IMPORTANCE_HIGH,
      )
      channel.setSound(
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
      channel.enableVibration(true)
      channel.vibrationPattern = VIBRATION_PATTERN
      channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      nm.createNotificationChannel(channel)
    }
    if (nm.getNotificationChannel(SILENCED_CHANNEL_ID) == null) {
      val channel = NotificationChannel(
        SILENCED_CHANNEL_ID,
        context.getString(R.string.totus_call_channel_silenced),
        NotificationManager.IMPORTANCE_LOW,
      )
      channel.setSound(null, null)
      channel.enableVibration(false)
      channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      nm.createNotificationChannel(channel)
    }
    if (nm.getNotificationChannel(ONGOING_CHANNEL_ID) == null) {
      val channel = NotificationChannel(
        ONGOING_CHANNEL_ID,
        context.getString(R.string.totus_call_channel_ongoing),
        NotificationManager.IMPORTANCE_LOW,
      )
      channel.setSound(null, null)
      channel.enableVibration(false)
      channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      nm.createNotificationChannel(channel)
    }
  }

  // ------------------------------------------------------------------ in-app ringing

  private fun startInAppRinging(context: Context) {
    stopInAppRinging()
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    val mode = audio?.ringerMode ?: AudioManager.RINGER_MODE_NORMAL
    if (mode == AudioManager.RINGER_MODE_NORMAL) {
      try {
        val uri = RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_RINGTONE)
          ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        val r = RingtoneManager.getRingtone(context, uri)
        if (r != null) {
          r.setAudioAttributes(
            AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
              .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
              .build(),
          )
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            r.setLooping(true)
          }
          r.play()
          ringtone = r
        }
      } catch (e: Exception) {
        Log.w(TAG, "ringtone failed", e)
      }
    }
    if (mode != AudioManager.RINGER_MODE_SILENT) {
      startVibration(context)
    }
  }

  @Suppress("DEPRECATION")
  private fun startVibration(context: Context) {
    try {
      val v: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
      } else {
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
      }
      if (v == null || !v.hasVibrator()) {
        return
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        v.vibrate(VibrationEffect.createWaveform(VIBRATION_PATTERN, 0))
      } else {
        v.vibrate(VIBRATION_PATTERN, 0)
      }
      vibrator = v
    } catch (e: Exception) {
      Log.w(TAG, "vibration failed", e)
    }
  }

  private fun stopInAppRinging() {
    try {
      ringtone?.stop()
    } catch (e: Exception) {
      Log.w(TAG, "ringtone stop failed", e)
    }
    ringtone = null
    try {
      vibrator?.cancel()
    } catch (e: Exception) {
      Log.w(TAG, "vibration stop failed", e)
    }
    vibrator = null
  }

  // ------------------------------------------------------------------ MainActivity

  fun onMainActivityVisibilityChanged(activity: Activity, visible: Boolean) {
    mainActivityVisible = visible
    if (visible) {
      mainActivityRef = WeakReference(activity)
    }
    if (incomingCallId == null) {
      return
    }
    val context = activity.applicationContext
    if (!alerting) {
      return // Telecom has not shown the call yet (onShowIncomingCallUi starts alerting)
    }
    if (visible) {
      cancelIncomingNotification(context)
      if (!silenced && ringtone == null && vibrator == null) {
        startInAppRinging(context)
      }
    } else {
      stopInAppRinging()
      val power = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
      val screenOn = power?.isInteractive ?: true
      if (!screenOn) {
        // Power button while ringing = silence (like the system dialer); the call stays in the shade.
        silenced = true
      }
      postIncomingNotification(context, silenced)
    }
  }

  /** Intent from a call notification: show over the lock screen and hand the action to JS. */
  fun handleActivityIntent(activity: Activity, intent: Intent?) {
    val action = intent?.getStringExtra(EXTRA_CALL_ACTION) ?: return
    val callId = intent.getStringExtra(EXTRA_CALL_ID) ?: return
    val name = intent.getStringExtra(EXTRA_CALLER_NAME) ?: ""
    // Consumed once: a recreated activity must not answer the same call again.
    intent.removeExtra(EXTRA_CALL_ACTION)
    mainActivityRef = WeakReference(activity)
    setLockScreenMode(activity, true)
    if (action == CALL_ACTION_ANSWER) {
      dismissIncoming(activity.applicationContext, callId)
      TotusTelecom.setActive(callId)
    }
    synchronized(lock) {
      pendingAction = mapOf("action" to action, "callId" to callId, "callerName" to name)
    }
    onPendingActionAvailable?.invoke()
  }

  fun consumePendingAction(): Map<String, String>? = synchronized(lock) {
    val a = pendingAction
    pendingAction = null
    a
  }

  private fun setLockScreenMode(activity: Activity, on: Boolean) {
    activity.runOnUiThread {
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
          activity.setShowWhenLocked(on)
          activity.setTurnScreenOn(on)
        } else {
          @Suppress("DEPRECATION")
          val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
          if (on) {
            activity.window.addFlags(flags)
          } else {
            activity.window.clearFlags(flags)
          }
        }
      } catch (e: Exception) {
        Log.w(TAG, "lock screen mode failed", e)
      }
    }
  }

  // ------------------------------------------------------------------ conversation

  fun startOngoing(context: Context, callId: String, callerName: String): Boolean {
    val app = context.applicationContext
    dismissIncoming(app, null)
    if (ContextCompat.checkSelfPermission(app, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      // A microphone foreground service cannot start without RECORD_AUDIO (Android 14+ SecurityException).
      Log.w(TAG, "RECORD_AUDIO not granted: ongoing call service not started")
      return false
    }
    val intent = Intent(app, TotusVoipForegroundService::class.java).apply {
      action = TotusVoipForegroundService.ACTION_START_ONGOING
      putExtra(EXTRA_CALL_ID, callId)
      putExtra(EXTRA_CALLER_NAME, callerName)
    }
    return try {
      ContextCompat.startForegroundService(app, intent)
      true
    } catch (e: Exception) {
      Log.w(TAG, "ongoing call service start failed", e)
      false
    }
  }

  fun stopOngoing(context: Context) {
    if (!ongoingServiceRunning) {
      return
    }
    val app = context.applicationContext
    try {
      // Delivered after a pending START, so the service always reaches startForeground first.
      app.startService(Intent(app, TotusVoipForegroundService::class.java).setAction(TotusVoipForegroundService.ACTION_STOP))
    } catch (e: Exception) {
      Log.w(TAG, "ongoing call service stop failed", e)
      try {
        app.stopService(Intent(app, TotusVoipForegroundService::class.java))
      } catch (e2: Exception) {
        Log.w(TAG, "stopService failed", e2)
      }
    }
  }

  fun buildOngoingNotification(context: Context, callId: String, callerName: String): Notification {
    ensureChannels(context)
    val name = callerName.ifBlank { context.getString(R.string.totus_call_default_caller) }
    val open = activityPendingIntent(context, CALL_ACTION_OPEN, callId, name, 4)
    val hangup = TotusCallActionReceiver.pendingIntent(context, TotusCallActionReceiver.ACTION_HANGUP, callId, 5)
    val builder = NotificationCompat.Builder(context, ONGOING_CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_totus_phone_white_24)
      .setContentTitle(name)
      .setContentText(context.getString(R.string.totus_call_ongoing_text))
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setShowWhen(true)
      .setWhen(System.currentTimeMillis())
      .setUsesChronometer(true)
      .setContentIntent(open)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
    return try {
      val person = Person.Builder().setName(name).setImportant(true).build()
      builder.setStyle(NotificationCompat.CallStyle.forOngoingCall(person, hangup)).build()
    } catch (e: Exception) {
      Log.w(TAG, "CallStyle ongoing failed, using plain one", e)
      builder.addAction(0, context.getString(R.string.totus_call_action_hangup), hangup).build()
    }
  }

  /** Call finished: no ringing, no notifications, no service, normal lock-screen behaviour. */
  fun stopAll(context: Context) {
    dismissIncoming(context, null)
    stopOngoing(context)
    TotusTelecom.disconnectAll()
    synchronized(lock) {
      pendingAction = null
    }
    mainActivityRef?.get()?.let { setLockScreenMode(it, false) }
  }

  // ------------------------------------------------------------------ actions from Telecom / notifications

  /** Runs the JS task "TotusVoipActionTask" (index.js): tells the server, also with the app closed. */
  fun startActionTask(context: Context, jsAction: String, callId: String) {
    val app = context.applicationContext
    try {
      val serviceIntent = Intent(app, TotusVoipActionTaskService::class.java)
        .putExtra("action", jsAction)
        .putExtra("callId", callId)
      app.startService(serviceIntent)
      com.facebook.react.HeadlessJsTaskService.acquireWakeLockNow(app)
    } catch (e: Exception) {
      Log.w(TAG, "action task start failed", e)
    }
  }

  /** "Отклонить" (notification) or reject from the system (Telecom, e.g. a headset). */
  fun declineIncoming(context: Context, callId: String) {
    dismissIncoming(context, callId)
    TotusTelecom.disconnect(callId, android.telecom.DisconnectCause.REJECTED)
    startActionTask(context, "com.totus.com.voip.REJECT", callId)
  }

  /** "Завершить" (ongoing notification) or hang-up from the system (side key, headset). */
  fun hangUp(context: Context, callId: String) {
    stopOngoing(context)
    TotusTelecom.disconnect(callId, android.telecom.DisconnectCause.LOCAL)
    startActionTask(context, "com.totus.com.voip.END", callId)
  }

  /** Answer from the system (Bluetooth headset, car, watch): handled by JS like "Ответить". */
  fun answerFromSystem(context: Context, callId: String, callerName: String) {
    dismissIncoming(context, callId)
    TotusTelecom.setActive(callId)
    synchronized(lock) {
      pendingAction = mapOf("action" to CALL_ACTION_ANSWER, "callId" to callId, "callerName" to callerName)
    }
    onPendingActionAvailable?.invoke()
  }

  fun isIncomingCall(callId: String): Boolean = incomingCallId == callId

  fun isFinished(callId: String): Boolean = synchronized(lock) { finishedCallIds.contains(callId) }

  fun canUseFullScreenIntent(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < 34) {
      return true
    }
    val nm = context.getSystemService(NotificationManager::class.java) ?: return false
    return nm.canUseFullScreenIntent()
  }
}
