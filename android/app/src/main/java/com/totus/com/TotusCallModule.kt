package com.totus.com

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

/** JS bridge of [TotusCallManager] (NativeModules.TotusCall, src/modules/voip/androidCallUi.ts). */
class TotusCallModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  init {
    TotusCallManager.onPendingActionAvailable = { emitPendingActionAvailable() }
  }

  override fun getName(): String = "TotusCall"

  private fun emitPendingActionAvailable() {
    try {
      if (reactContext.hasActiveReactInstance()) {
        reactContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit(EVENT_ACTION_AVAILABLE, null)
      }
    } catch (e: Exception) {
      Log.w("TotusCall", "emit failed", e)
    }
  }

  /** Called on every call-state sync: ringing -> alert, anything else -> stop alerting. */
  @ReactMethod
  fun updateCall(callId: String, isIncoming: Boolean, callerName: String?) {
    if (isIncoming) {
      TotusCallManager.showIncoming(reactContext, callId, callerName ?: "")
    } else {
      TotusCallManager.dismissIncoming(reactContext, callId)
      // Answered in the app (or the call left the ringing state): the Telecom call is active;
      // an ended call is disconnected right after by stopAll().
      TotusTelecom.setActive(callId)
    }
  }

  @ReactMethod
  fun dismissIncoming(callId: String?) {
    TotusCallManager.dismissIncoming(reactContext, callId)
  }

  @ReactMethod
  fun startOngoing(callId: String, callerName: String?, promise: Promise) {
    promise.resolve(TotusCallManager.startOngoing(reactContext, callId, callerName ?: ""))
  }

  @ReactMethod
  fun stopOngoing() {
    TotusCallManager.stopOngoing(reactContext)
  }

  @ReactMethod
  fun stopAll() {
    TotusCallManager.stopAll(reactContext)
  }

  @ReactMethod
  fun consumePendingCallAction(promise: Promise) {
    val action = TotusCallManager.consumePendingAction()
    if (action == null) {
      promise.resolve(null)
      return
    }
    val map = Arguments.createMap()
    for ((key, value) in action) {
      map.putString(key, value)
    }
    promise.resolve(map)
  }

  @ReactMethod
  fun canUseFullScreenIntent(promise: Promise) {
    promise.resolve(TotusCallManager.canUseFullScreenIntent(reactContext))
  }

  /** Android 14+: settings page "Full screen notifications" of this app. */
  @ReactMethod
  fun openFullScreenIntentSettings() {
    try {
      val intent = if (android.os.Build.VERSION.SDK_INT >= 34) {
        Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + reactContext.packageName))
      } else {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
    } catch (e: Exception) {
      Log.w("TotusCall", "open full-screen settings failed", e)
    }
  }

  // NativeEventEmitter contract
  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Double) {}

  companion object {
    const val EVENT_ACTION_AVAILABLE = "TotusCallActionAvailable"
  }
}
