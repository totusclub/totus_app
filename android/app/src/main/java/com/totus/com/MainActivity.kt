package com.totus.com

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "totusClubApp"

  /**
   * react-native-screens: do not restore fragments after the system killed the process in the
   * background, otherwise the app crashes on return ("Screen fragments should never be restored").
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
    // Opened from a call notification (answer / full-screen incoming / ongoing call).
    TotusCallManager.handleActivityIntent(this, intent)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    TotusCallManager.handleActivityIntent(this, intent)
  }

  override fun onResume() {
    super.onResume()
    TotusCallManager.onMainActivityVisibilityChanged(this, true)
  }

  override fun onPause() {
    TotusCallManager.onMainActivityVisibilityChanged(this, false)
    super.onPause()
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
