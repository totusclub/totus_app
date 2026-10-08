package com.totus.com

import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Точное положение клавиатуры на Android (NativeModules.TotusKeyboard).
 *
 * Зачем: при targetSdk 35+ (edge-to-edge) adjustResize больше не уменьшает окно, а keyboardDidShow
 * из React Native 0.79 приходит один раз и с неточным screenY — поле ввода чата поддержки
 * оставалось под клавиатурой. Здесь значения читаются прямо из WindowInsets окна.
 *
 * Только чтение: никаких слушателей и изменений окна (звонки, IncomingCallActivity не затрагиваются).
 * Используется в src/hooks/useAndroidKeyboardInset.ts. Значения в dp, как в React Native.
 */
class TotusKeyboardModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "TotusKeyboard"

  @ReactMethod
  fun getInsets(promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.resolve(null)
      return
    }
    activity.runOnUiThread {
      try {
        val decor = activity.window?.decorView
        val insets = if (decor != null) ViewCompat.getRootWindowInsets(decor) else null
        if (decor == null || insets == null) {
          promise.resolve(null)
        } else {
          val density = reactContext.resources.displayMetrics.density.toDouble()
          val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
          val nav = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
          val map = Arguments.createMap()
          map.putBoolean("imeVisible", insets.isVisible(WindowInsetsCompat.Type.ime()))
          map.putDouble("imeBottom", ime.bottom / density)
          map.putDouble("navBottom", nav.bottom / density)
          map.putDouble("windowHeight", decor.height / density)
          promise.resolve(map)
        }
      } catch (e: Exception) {
        promise.resolve(null)
      }
    }
  }
}
