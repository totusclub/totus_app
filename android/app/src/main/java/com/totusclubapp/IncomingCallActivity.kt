package com.totus.com

import android.content.Intent
import android.content.BroadcastReceiver
import android.content.IntentFilter
import android.content.res.ColorStateList
import android.app.KeyguardManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.widget.ImageViewCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

/**
 * Native incoming-call UI (matches RN CallModal incoming layout: header, avatar, ОТВЕТИТЬ / СБРОСИТЬ).
 * Shown from full-screen notification when CallKeep/Telecom UI is unavailable (killed / locked).
 */
class IncomingCallActivity : AppCompatActivity() {
  private var answeredFromLockScreen = false
  private var autoAnswerHandled = false
  private var isMuted = false
  private var isSpeakerOn = false
  private var remoteConnectionState: String? = null
  private var remoteIceConnectionState: String? = null
  private var remoteIsConnecting = false
  private var remoteIsConnected = false
  private var remoteIsIncoming = false
  private var remoteIsOutgoing = false
  private val statusHandler by lazy { android.os.Handler(android.os.Looper.getMainLooper()) }
  private val connectingStatusTicker = object : Runnable {
    override fun run() {
      if (!answeredFromLockScreen) {
        return
      }
      applyConnectionStatusToUi()
      statusHandler.postDelayed(this, 1200L)
    }
  }
  private val closeUiReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: android.content.Context?, intent: Intent?) {
      if (intent?.action != TotusVoipForegroundService.ACTION_CLOSE_INCOMING_UI) return
      val closingCallId = intent.getStringExtra(TotusVoipForegroundService.EXTRA_CALL_ID) ?: ""
      val currentCallId = readCallId()
      if (closingCallId.isBlank() || closingCallId == currentCallId) {
        finish()
      }
    }
  }
  private val connectionStatusReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: android.content.Context?, intent: Intent?) {
      if (intent?.action != TotusVoipForegroundService.ACTION_CONNECTION_STATUS_UPDATE) return
      val statusCallId = intent.getStringExtra(TotusVoipForegroundService.EXTRA_CALL_ID) ?: ""
      val currentCallId = readCallId()
      if (currentCallId.isBlank()) return
      if (statusCallId.isNotBlank() && statusCallId != currentCallId) return

      remoteConnectionState = intent.getStringExtra(TotusVoipForegroundService.EXTRA_CONNECTION_STATE)
      remoteIceConnectionState = intent.getStringExtra(TotusVoipForegroundService.EXTRA_ICE_CONNECTION_STATE)
      remoteIsConnecting = intent.getBooleanExtra(TotusVoipForegroundService.EXTRA_IS_CONNECTING, false)
      remoteIsConnected = intent.getBooleanExtra(TotusVoipForegroundService.EXTRA_IS_CONNECTED, false)
      remoteIsIncoming = intent.getBooleanExtra(TotusVoipForegroundService.EXTRA_IS_INCOMING, false)
      remoteIsOutgoing = intent.getBooleanExtra(TotusVoipForegroundService.EXTRA_IS_OUTGOING, false)
      applyConnectionStatusToUi()
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    markShown()
    android.util.Log.i("VOIP_NATIVE", "incoming_activity_onCreate")
    configureWindowForLockScreen()
    setContentView(R.layout.activity_incoming_call)
    applyStatusBarPadding()
    bindUi()
  }

  override fun onResume() {
    super.onResume()
    markShown()
    android.util.Log.i("VOIP_NATIVE", "incoming_activity_onResume")
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    resetUiForIncomingState()
    bindUi()
  }

  override fun onStart() {
    super.onStart()
    registerCloseUiReceiver()
    registerConnectionStatusReceiver()
  }

  override fun onStop() {
    super.onStop()
    statusHandler.removeCallbacks(connectingStatusTicker)
    try {
      unregisterReceiver(closeUiReceiver)
    } catch (_: Exception) {
    }
    try {
      unregisterReceiver(connectionStatusReceiver)
    } catch (_: Exception) {
    }
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    android.util.Log.i("VOIP_NATIVE", "incoming_activity_window_focus=$hasFocus")
  }

  private fun configureWindowForLockScreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
      )
    }
    window.addFlags(
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
    )
    android.util.Log.i("VOIP_NATIVE", "incoming_activity_window_configured")
  }

  private fun applyStatusBarPadding() {
    val header = findViewById<View>(R.id.incoming_header)
    val baseTopPx = dp(12)
    ViewCompat.setOnApplyWindowInsetsListener(header) { v, insets ->
      val topPx = insets.getInsets(WindowInsetsCompat.Type.statusBars()).top + baseTopPx
      v.setPaddingRelative(
        v.paddingStart,
        topPx,
        v.paddingEnd,
        v.paddingBottom,
      )
      insets
    }
    ViewCompat.requestApplyInsets(header)
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

  private fun bindUi() {
    val callerName = readCallerName()
    val callId = readCallId()
    val displayName = callerName.ifBlank { getString(R.string.totus_incoming_fallback_name) }

    findViewById<TextView>(R.id.incoming_caller_name).text = displayName
    val initial =
      displayName.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "?"
    findViewById<TextView>(R.id.incoming_avatar_initial).text = initial

    findViewById<View>(R.id.incoming_btn_close).setOnClickListener {
      sendActionToService(TotusVoipForegroundService.ACTION_REJECT)
    }
    findViewById<FrameLayout>(R.id.incoming_btn_reject).setOnClickListener {
      sendActionToService(TotusVoipForegroundService.ACTION_REJECT)
    }
    findViewById<FrameLayout>(R.id.incoming_btn_answer).setOnClickListener {
      sendActionToService(TotusVoipForegroundService.ACTION_ANSWER)
    }
    findViewById<FrameLayout>(R.id.connecting_btn_end).setOnClickListener {
      sendActionToService(TotusVoipForegroundService.ACTION_END)
    }
    findViewById<FrameLayout>(R.id.connecting_btn_mute).setOnClickListener {
      isMuted = !isMuted
      updateConnectingControlsAppearance()
      sendActionToService(TotusVoipForegroundService.ACTION_TOGGLE_MUTE)
    }
    findViewById<FrameLayout>(R.id.connecting_btn_speaker).setOnClickListener {
      isSpeakerOn = !isSpeakerOn
      updateConnectingControlsAppearance()
      sendActionToService(TotusVoipForegroundService.ACTION_TOGGLE_SPEAKER)
    }
    if (shouldStartInConnectingState()) {
      showConnectingState()
    }
    maybeAutoAnswerFromNotification()

    android.util.Log.i("VOIP_NATIVE", "incoming_activity_ui callId=$callId caller=$callerName")
  }

  private fun readCallId(): String {
    val fromService = intent.getStringExtra(TotusVoipForegroundService.EXTRA_CALL_ID)
    if (!fromService.isNullOrBlank()) return fromService
    return intent.getStringExtra("voip_fullscreen_intent_call_id") ?: ""
  }

  private fun readCallerName(): String {
    val name = intent.getStringExtra(TotusVoipForegroundService.EXTRA_CALLER_NAME)
    if (!name.isNullOrBlank()) return name
    return ""
  }

  private fun readPayloadJson(): String {
    val json = intent.getStringExtra(TotusVoipForegroundService.EXTRA_PAYLOAD_JSON)
    if (!json.isNullOrBlank()) return json
    return ""
  }

  private fun sendActionToService(action: String) {
    val serviceIntent = Intent(this, TotusVoipForegroundService::class.java).apply {
      this.action = action
      putExtra(TotusVoipForegroundService.EXTRA_CALL_ID, readCallId())
      putExtra(TotusVoipForegroundService.EXTRA_PAYLOAD_JSON, readPayloadJson())
      putExtra(
        TotusVoipForegroundService.EXTRA_CALLER_NAME,
        intent.getStringExtra(TotusVoipForegroundService.EXTRA_CALLER_NAME) ?: "",
      )
      putExtra(
        TotusVoipForegroundService.EXTRA_HANDLE,
        intent.getStringExtra(TotusVoipForegroundService.EXTRA_HANDLE) ?: "",
      )
    }
    ContextCompat.startForegroundService(this, serviceIntent)
    if (action == TotusVoipForegroundService.ACTION_ANSWER) {
      if (isDeviceLockedWithKeyguard()) {
        // Keep native custom screen visible on lockscreen and switch UI into "connecting".
        showConnectingState()
        return
      }
      val appIntent = Intent(this, MainActivity::class.java).apply {
        addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK or
            Intent.FLAG_ACTIVITY_CLEAR_TOP or
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        )
        putExtra("totus_open_call_modal", true)
        putExtra(TotusVoipForegroundService.EXTRA_CALL_ID, readCallId())
      }
      startActivity(appIntent)
      finish()
      return
    }
    if (
      action == TotusVoipForegroundService.ACTION_END ||
      action == TotusVoipForegroundService.ACTION_REJECT
    ) {
      finish()
    }
  }

  private fun showConnectingState() {
    if (answeredFromLockScreen) return
    answeredFromLockScreen = true

    findViewById<TextView>(R.id.incoming_status).apply {
      text = getString(R.string.totus_incoming_connecting)
      setTextColor(ContextCompat.getColor(this@IncomingCallActivity, R.color.totus_incoming_text_tertiary))
    }
    findViewById<TextView>(R.id.incoming_header_hint).text = "Установка соединения..."
    findViewById<LinearLayout>(R.id.incoming_actions_row).visibility = View.GONE
    findViewById<LinearLayout>(R.id.connecting_actions_row).visibility = View.VISIBLE
    findViewById<View>(R.id.incoming_btn_close).visibility = View.GONE
    updateConnectingControlsAppearance()
    statusHandler.removeCallbacks(connectingStatusTicker)
    applyConnectionStatusToUi()
    statusHandler.post(connectingStatusTicker)
  }

  private fun shouldStartInConnectingState(): Boolean {
    // Only force "connecting" if explicitly requested in current intent.
    // This avoids stale state when activity instance is reused for a new incoming call.
    return intent.getBooleanExtra(TotusVoipForegroundService.EXTRA_FORCE_CONNECTING, false)
  }

  private fun resetUiForIncomingState() {
    answeredFromLockScreen = false
    autoAnswerHandled = false
    isMuted = false
    isSpeakerOn = false
    statusHandler.removeCallbacks(connectingStatusTicker)

    findViewById<LinearLayout>(R.id.incoming_actions_row).visibility = View.VISIBLE
    findViewById<LinearLayout>(R.id.connecting_actions_row).visibility = View.GONE
    findViewById<View>(R.id.incoming_btn_close).visibility = View.VISIBLE

    findViewById<TextView>(R.id.incoming_status).apply {
      text = getString(R.string.totus_incoming_connecting)
      setTextColor(ContextCompat.getColor(this@IncomingCallActivity, R.color.totus_incoming_text_tertiary))
    }
    findViewById<TextView>(R.id.incoming_header_hint).apply {
      text = "Входящий вызов"
      setTextColor(ContextCompat.getColor(this@IncomingCallActivity, R.color.totus_incoming_text_tertiary))
    }
    updateConnectingControlsAppearance()
  }

  private fun applyConnectionStatusToUi() {
    val isActuallyConnected =
      remoteIsConnected ||
        remoteConnectionState == "connected" ||
        remoteConnectionState == "completed" ||
        remoteIceConnectionState == "connected" ||
        remoteIceConnectionState == "completed"
    val isActuallyConnecting =
      !isActuallyConnected &&
        (
          remoteIsConnecting ||
            remoteConnectionState == "connecting" ||
            remoteConnectionState == "new" ||
            remoteIceConnectionState == "checking" ||
            remoteIceConnectionState == "new"
        )

    val statusText =
      if (isActuallyConnected) {
        "Соединение установлено"
      } else if (isActuallyConnecting) {
        if (remoteIceConnectionState == "checking" && remoteConnectionState != "new") {
          "Соединение..."
        } else {
          "Вызов..."
        }
      } else if (remoteConnectionState == "failed") {
        "Ошибка подключения"
      } else if (remoteConnectionState == "disconnected" || remoteConnectionState == "closed") {
        "Отключено"
      } else if (remoteIsIncoming) {
        "Ожидание ответа..."
      } else if (remoteIsOutgoing) {
        "Установка соединения..."
      } else {
        "Ожидание..."
      }
    val shouldUseConnectedStyle =
      isActuallyConnected || statusText == "Соединение установлено"
    val statusColor =
      if (shouldUseConnectedStyle) {
        ContextCompat.getColor(this, R.color.totus_incoming_success)
      } else {
        ContextCompat.getColor(this, R.color.totus_incoming_text_tertiary)
      }
    findViewById<TextView>(R.id.incoming_header_hint).apply {
      text = statusText
      setTextColor(statusColor)
    }
    findViewById<TextView>(R.id.incoming_status).apply {
      text = statusText
      setTextColor(statusColor)
    }
  }

  private fun updateConnectingControlsAppearance() {
    val textColor = ContextCompat.getColor(this, R.color.totus_incoming_text)
    val errorColor = ContextCompat.getColor(this, R.color.totus_call_control_icon_mute_on)
    val warningColor = ContextCompat.getColor(this, R.color.totus_call_control_icon_speaker_on)

    findViewById<FrameLayout>(R.id.connecting_btn_mute).setBackgroundResource(
      if (isMuted) R.drawable.totus_connecting_circle_mute_on else R.drawable.totus_connecting_circle_neutral,
    )
    findViewById<FrameLayout>(R.id.connecting_btn_speaker).setBackgroundResource(
      if (isSpeakerOn) R.drawable.totus_connecting_circle_speaker_on else R.drawable.totus_connecting_circle_neutral,
    )

    findViewById<LinearLayout>(R.id.connecting_col_mute).setBackgroundResource(
      if (isMuted) R.drawable.totus_connecting_column_active else 0,
    )
    findViewById<LinearLayout>(R.id.connecting_col_speaker).setBackgroundResource(
      if (isSpeakerOn) R.drawable.totus_connecting_column_active else 0,
    )

    findViewById<TextView>(R.id.connecting_mute_label).apply {
      text = "MUTE"
      setTextColor(if (isMuted) errorColor else textColor)
    }
    findViewById<TextView>(R.id.connecting_speaker_label).apply {
      text = "SPEAKER"
      setTextColor(if (isSpeakerOn) warningColor else textColor)
    }

    ImageViewCompat.setImageTintList(
      findViewById<ImageView>(R.id.connecting_icon_mute),
      ColorStateList.valueOf(if (isMuted) errorColor else textColor),
    )
    ImageViewCompat.setImageTintList(
      findViewById<ImageView>(R.id.connecting_icon_speaker),
      ColorStateList.valueOf(if (isSpeakerOn) warningColor else textColor),
    )
  }

  private fun registerCloseUiReceiver() {
    try {
      val filter = IntentFilter(TotusVoipForegroundService.ACTION_CLOSE_INCOMING_UI)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        registerReceiver(closeUiReceiver, filter, RECEIVER_NOT_EXPORTED)
      } else {
        @Suppress("DEPRECATION")
        registerReceiver(closeUiReceiver, filter)
      }
    } catch (e: Exception) {
      android.util.Log.w("VOIP_NATIVE", "incoming_activity_close_receiver_register_failed", e)
    }
  }

  private fun registerConnectionStatusReceiver() {
    try {
      val filter = IntentFilter(TotusVoipForegroundService.ACTION_CONNECTION_STATUS_UPDATE)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        registerReceiver(connectionStatusReceiver, filter, RECEIVER_NOT_EXPORTED)
      } else {
        @Suppress("DEPRECATION")
        registerReceiver(connectionStatusReceiver, filter)
      }
    } catch (e: Exception) {
      android.util.Log.w("VOIP_NATIVE", "incoming_activity_status_receiver_register_failed", e)
    }
  }

  private fun maybeAutoAnswerFromNotification() {
    if (autoAnswerHandled) return
    val shouldAutoAnswer =
      intent.getBooleanExtra(TotusVoipForegroundService.EXTRA_AUTO_ANSWER_FROM_NOTIFICATION, false)
    if (!shouldAutoAnswer) return
    autoAnswerHandled = true
    showConnectingState()
    sendActionToService(TotusVoipForegroundService.ACTION_ANSWER)
  }

  private fun isDeviceLockedWithKeyguard(): Boolean {
    return try {
      val keyguardManager = getSystemService(KEYGUARD_SERVICE) as KeyguardManager
      keyguardManager.isDeviceLocked || keyguardManager.isKeyguardLocked
    } catch (_: Exception) {
      false
    }
  }

  private fun markShown() {
    lastShownAtMs = System.currentTimeMillis()
  }

  companion object {
    @Volatile
    private var lastShownAtMs: Long = 0L

    fun wasShownRecently(windowMs: Long = 3000L): Boolean {
      val shownAt = lastShownAtMs
      if (shownAt <= 0L) return false
      return System.currentTimeMillis() - shownAt <= windowMs
    }
  }
}
