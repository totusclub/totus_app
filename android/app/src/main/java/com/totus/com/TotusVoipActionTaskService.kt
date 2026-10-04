package com.totus.com

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/** Runs the JS task "TotusVoipActionTask" (index.js) for notification actions, app closed or not. */
class TotusVoipActionTaskService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null
    return HeadlessJsTaskConfig("TotusVoipActionTask", Arguments.fromBundle(extras), 20000L, true)
  }
}
