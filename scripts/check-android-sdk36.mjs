// Check: Android targetSdk 36 (Android 16) for Google Play, without changing app behavior.
//
// Run: node scripts/check-android-sdk36.mjs   (Node >= 18, no npm install)
//
// Google Play requires targetSdk 36 for new apps and updates from 31.08.2026. What target 36
// changes on Android 16 and how the app keeps its current behavior:
//  - predictive back is on by default and onBackPressed() is no longer called; React Native 0.79
//    ReactActivity handles Back only through onBackPressed() -> opt-out
//    android:enableOnBackInvokedCallback="false" (BackHandler, CallModal "Назад", navigation);
//  - large screens (sw >= 600dp) ignore screenOrientation -> opt-out property
//    PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY (the app stays portrait);
//  - edge-to-edge can no longer be disabled -> the theme must not rely on the opt-out
//    (already enforced since target 35, nothing changes);
//  - compileSdk 36 with AGP 8.8.2 (pinned by RN 0.79) -> suppressUnsupportedCompileSdk=36.
// Google Play upload: versionCode / upload key from Gradle properties, never secrets in Git.

import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = console.log.bind(console);
let failed = 0;
let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    out(`  ok   ${name}`);
  } catch (e) {
    failed++;
    out(`  FAIL ${name}\n       ${e && e.message ? e.message : e}`);
  }
}
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const xmlCode = s => s.replace(/<!--[\s\S]*?-->/g, '');
const gradleCode = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const rootGradle = gradleCode(read('android/build.gradle'));
const appGradle = gradleCode(read('android/app/build.gradle'));
const props = read('android/gradle.properties');
const manifest = xmlCode(read('android/app/src/main/AndroidManifest.xml'));
const styles = xmlCode(read('android/app/src/main/res/values/styles.xml'));

out('Android SDK 36');
check('compileSdk 36, targetSdk 36, build tools 36.0.0; minSdk unchanged (24)', () => {
  assert.match(rootGradle, /compileSdkVersion = 36\b/);
  assert.match(rootGradle, /targetSdkVersion = 36\b/);
  assert.match(rootGradle, /buildToolsVersion = "36\.0\.0"/);
  assert.match(rootGradle, /minSdkVersion = 24\b/);
  assert.match(appGradle, /compileSdk rootProject\.ext\.compileSdkVersion/);
  assert.match(appGradle, /targetSdkVersion rootProject\.ext\.targetSdkVersion/);
});
check('AGP pinned by React Native 0.79 accepts compileSdk 36', () => {
  assert.match(rootGradle, /classpath\("com\.android\.tools\.build:gradle"\)/, 'AGP version still comes from the RN plugin');
  assert.match(props, /^android\.suppressUnsupportedCompileSdk=36$/m);
});
check('Back keeps working on Android 16: predictive back opt-out (RN 0.79 uses onBackPressed)', () => {
  const app = manifest.match(/<application[\s\S]*?>/)[0];
  assert.match(app, /android:enableOnBackInvokedCallback="false"/);
  const activity = read('android/app/src/main/java/com/totus/com/MainActivity.kt');
  assert.ok(/class MainActivity : ReactActivity\(\)/.test(activity), 'MainActivity is a ReactActivity');
});
check('Large screens: portrait as before (target 36 resizability opt-out)', () => {
  const app = manifest.slice(manifest.indexOf('<application'), manifest.indexOf('</application>'));
  assert.match(app, /<property\s+android:name="android\.window\.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY"\s+android:value="true"\s*\/>/);
  assert.match(manifest, /android:name="\.MainActivity"[\s\S]*?android:screenOrientation="portrait"/);
});
check('Edge-to-edge: the theme does not rely on the opt-out removed in target 36', () => {
  assert.ok(!/windowOptOutEdgeToEdgeEnforcement/.test(styles + manifest));
});
check('No new permissions or components for the SDK bump; call services unchanged', () => {
  const perms = [...manifest.matchAll(/<uses-permission android:name="([^"]+)"/g)].map(m => m[1]).sort();
  assert.deepEqual(perms, [
    'android.permission.BIND_TELECOM_CONNECTION_SERVICE', 'android.permission.CALL_PHONE',
    'android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_MICROPHONE',
    'android.permission.FOREGROUND_SERVICE_PHONE_CALL', 'android.permission.INTERNET',
    'android.permission.MANAGE_OWN_CALLS', 'android.permission.MODIFY_AUDIO_SETTINGS',
    'android.permission.POST_NOTIFICATIONS', 'android.permission.READ_PHONE_NUMBERS',
    'android.permission.READ_PHONE_STATE', 'android.permission.RECORD_AUDIO',
    'android.permission.USE_FULL_SCREEN_INTENT', 'android.permission.VIBRATE', 'android.permission.WAKE_LOCK',
  ]);
  assert.match(manifest, /android:name="\.TotusVoipForegroundService"\s+android:foregroundServiceType="microphone"/);
  assert.match(manifest, /android:name="\.TotusConnectionService"/);
});
check('Google Play upload: versionCode / name and upload key from Gradle properties, defaults as before', () => {
  assert.match(appGradle, /versionCode\(\(findProperty\("TOTUS_VERSION_CODE"\) \?: "1"\)\.toString\(\)\.toInteger\(\)\)/);
  assert.match(appGradle, /versionName\(\(findProperty\("TOTUS_VERSION_NAME"\) \?: "1\.0"\)\.toString\(\)\)/);
  assert.match(appGradle, /if \(project\.hasProperty\("TOTUS_UPLOAD_STORE_FILE"\)\) \{\s*release \{/);
  assert.match(appGradle, /signingConfig project\.hasProperty\("TOTUS_UPLOAD_STORE_FILE"\) \? signingConfigs\.release : signingConfigs\.debug/);
  for (const k of ['TOTUS_UPLOAD_STORE_PASSWORD', 'TOTUS_UPLOAD_KEY_PASSWORD']) {
    assert.ok(!new RegExp(`${k}\\s*=`).test(props), `${k} is never stored in the repository`);
  }
  assert.ok(!/\.(jks|keystore)$/m.test(fs.readdirSync(path.join(root, 'android/app')).filter(f => f !== 'debug.keystore').join('\n')),
    'no upload keystore in the repository');
});

out(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
