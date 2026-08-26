package com.totus.com

import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

class CallKeepLaunchStateModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CallKeepLaunchState"

  @ReactMethod
  fun getAndClearInitialPayload(promise: Promise) {
    val snapshot = synchronized(lock) {
      val payload = latestPayload
      latestPayload = null
      payload
    }
    promise.resolve(snapshot ?: Arguments.createMap())
  }

  companion object {
    private val lock = Any()
    private var latestPayload: WritableMap? = null

    fun captureIntent(intent: Intent?) {
      if (intent == null) return
      val extras = intent.extras ?: return

      val map = Arguments.createMap()
      map.putString("action", intent.action)

      for (key in extras.keySet()) {
        val value = extras.get(key)
        when (value) {
          is String -> map.putString(key, value)
          is Boolean -> map.putBoolean(key, value)
          is Int -> map.putInt(key, value)
          is Double -> map.putDouble(key, value)
          is Float -> map.putDouble(key, value.toDouble())
          is Long -> map.putDouble(key, value.toDouble())
          null -> map.putNull(key)
          else -> map.putString(key, value.toString())
        }
      }

      synchronized(lock) {
        latestPayload = map
      }
    }
  }
}
