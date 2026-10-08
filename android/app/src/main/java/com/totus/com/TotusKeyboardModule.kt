package com.totus.com

import android.os.Build
import android.view.View
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
 * getInsets — только чтение. setImeResize — то, что делал adjustResize до Android 15: пока включено
 * (только экран чата поддержки), контент MainActivity (android.R.id.content) получает нижний отступ
 * ровно на высоту клавиатуры, и весь экран React Native становится выше клавиатуры. Включается
 * только на Android 15+ (API 35, там edge-to-edge обязателен и adjustResize не работает); на
 * старых версиях adjustResize работает сам. IncomingCallActivity и окно звонка не затрагиваются.
 * Используется в src/hooks/useAndroidKeyboardInset.ts. Значения в dp, как в React Native.
 */
class TotusKeyboardModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "TotusKeyboard"

  /** true — режим включён (Android 15+); false — не нужен (старый Android) или не удалось. */
  @ReactMethod
  fun setImeResize(enabled: Boolean, promise: Promise) {
    val activity = currentActivity
    if (activity == null || Build.VERSION.SDK_INT < 35) {
      promise.resolve(false)
      return
    }
    activity.runOnUiThread {
      try {
        val content = activity.findViewById<View>(android.R.id.content)
        if (content == null) {
          promise.resolve(false)
        } else {
          if (enabled) {
            ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
              val imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
              if (view.paddingBottom != imeBottom) {
                view.setPadding(view.paddingLeft, view.paddingTop, view.paddingRight, imeBottom)
              }
              insets // дальше без изменений: дочерние view получают insets как раньше
            }
          } else {
            ViewCompat.setOnApplyWindowInsetsListener(content, null)
            content.setPadding(content.paddingLeft, content.paddingTop, content.paddingRight, 0)
          }
          ViewCompat.requestApplyInsets(content)
          promise.resolve(enabled)
        }
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }
  }

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
