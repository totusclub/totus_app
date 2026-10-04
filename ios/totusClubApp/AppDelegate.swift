import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import PushKit
import UserNotifications
import FirebaseCore
import FirebaseMessaging

@main
class AppDelegate: UIResponder, UIApplicationDelegate, PKPushRegistryDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  /// PKPushRegistry must exist from launch and stay alive for the process lifetime.
  /// When a VoIP push wakes the closed app, iOS delivers it only to a registry created
  /// in didFinishLaunching. Before, the registry was created later from JS (after the
  /// bundle and PersistGate loaded) as a local object of the voip-push library — with
  /// the app closed the push could be lost and the call never rang (totus_support_app
  /// has done this since PR #1 and rings from the closed state).
  private var voipRegistry: PKPushRegistry?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    if FirebaseApp.app() == nil {
      FirebaseApp.configure()
    }

    // CallKit provider before PushKit: a VoIP push that launches the closed app in the background
    // (no UI scene, no React Native) must be reported to CallKit right away, or iOS kills the app
    // (crash 0xbaadca11) and the call never rings on the lock screen.
    CallKeepHelper.setupCallKitNatively()

    // PushKit before React Native starts, so a VoIP push can wake the closed app.
    let registry = PKPushRegistry(queue: .main)
    // The only registry of the process: JS registerVoipToken() no longer creates a second one
    // (react-native-voip-push-notification made a local registry that was released right away).
    VoipPushHelper.useAppRegistryOnly(registry)
    registry.delegate = self
    registry.desiredPushTypes = [.voIP]
    voipRegistry = registry

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // The window is created in SceneDelegate. iOS 27 rejects apps that launch
    // without a UIScene.

    // Notification permission is requested from JS after login (src/modules/push/pushService.ts,
    // notifee.requestPermission) — not at launch. RNFB Messaging also swizzles APNs callbacks;
    // we still set Messaging.apnsToken explicitly below for reliability after GoogleService-Info swaps.

    // VoIP token: the registry above (strong reference) delivers it to pushRegistry(_:didUpdate:)
    // below, which forwards it to the voip-push library -> JS 'register' -> /api/register-device.
    // JS may still call registerVoipToken(); that is harmless.

    return true
  }

  // MARK: - Deep links (totus://)

  /// Возврат из браузера после входа через Яндекс ID: totus://auth/yandex?ticket=…
  /// Без этого проброса React Native не получает событие Linking 'url' —
  /// приложение просто открывается, а обмен ticket на токены не запускается.
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    print("🔗 openURL: \(url.scheme ?? "-")://\(url.host ?? "")\(url.path)")
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  /// Universal Links (на будущее — сейчас не используются, но метод не мешает).
  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }

  // MARK: - APNs (FCM)

  func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    // .unknown lets Firebase pick sandbox (Debug) vs production (TestFlight/App Store).
    Messaging.messaging().setAPNSToken(deviceToken, type: .unknown)
    let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
    let preview = hex.count > 16 ? String(hex.prefix(16)) + "…" : hex
    print("📱 APNs device token set on Firebase Messaging (\(preview))")
  }

  func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("❌ APNs registration failed: \(error.localizedDescription)")
  }

  // MARK: - PKPushRegistryDelegate
  // This method is called when the VoIP push token is updated
  // Forward to the library's native module via Objective-C helper
  func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    print("📱 PKPushRegistry: didUpdate pushCredentials for type: \(type.rawValue)")

    // Log token for debugging (first 32 chars)
    let tokenString = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
    let tokenPreview = tokenString.count > 32 ? String(tokenString.prefix(32)) + "..." : tokenString
    print("   Token preview: \(tokenPreview)")
    print("   Token length: \(tokenString.count)")

    // Post notification for VoIPPushModule
    NotificationCenter.default.post(
      name: NSNotification.Name("VoIPPushTokenReceived"),
      object: nil,
      userInfo: ["token": tokenString]
    )

    // Forward to library via Objective-C helper
    VoipPushHelper.didUpdate(pushCredentials, forType: type)
  }

  // This method is called when the push registry receives an incoming push
  // Forward to the library's native module via Objective-C helper
  func pushRegistry(_ registry: PKPushRegistry, didReceiveIncomingPushWith payload: PKPushPayload, for type: PKPushType, completion: @escaping () -> Void) {
    // NSLog (not print): visible in Console.app for a TestFlight build, closed iPhone included.
    NSLog("[TotusVoIP] VoIP push received (app state %ld)", UIApplication.shared.applicationState.rawValue)

    // Extract call information from payload
    var callId: String? = nil
    var handle: String? = nil
    var callerName: String? = nil
    var hasVideo: Bool = false

    if let dictionaryPayload = payload.dictionaryPayload as? [String: Any] {
      // Try different possible keys for call ID
      callId = dictionaryPayload["callId"] as? String
        ?? dictionaryPayload["call_id"] as? String
        ?? dictionaryPayload["uuid"] as? String
        ?? dictionaryPayload["callUUID"] as? String

      // Try different possible keys for handle/phone number
      handle = dictionaryPayload["handle"] as? String
        ?? dictionaryPayload["from"] as? String
        ?? dictionaryPayload["callerId"] as? String
        ?? dictionaryPayload["deviceId"] as? String
        ?? callId // Fallback to callId if no handle

      // Try different possible keys for caller name
      callerName = dictionaryPayload["callerName"] as? String
        ?? dictionaryPayload["caller_name"] as? String
        ?? dictionaryPayload["name"] as? String
        ?? dictionaryPayload["displayName"] as? String
        ?? handle // Fallback to handle if no name

      // Check for video flag
      hasVideo = (dictionaryPayload["hasVideo"] as? Bool)
        ?? (dictionaryPayload["has_video"] as? Bool)
        ?? false

      print("   Extracted call info:")
      print("   - callId: \(callId ?? "nil")")
      print("   - handle: \(handle ?? "nil")")
      print("   - callerName: \(callerName ?? "nil")")
      print("   - hasVideo: \(hasVideo)")

      // Cancel push (calling_api_v2, CALL_END_SYNC_RU.md): the call was answered on another
      // device, hung up, declined or missed. End the CallKit call with the same UUID — a
      // closed iPhone has no JS to do it. The incoming-call path below is unchanged.
      if (dictionaryPayload["type"] as? String) == "call_ended" {
        let reason = dictionaryPayload["reason"] as? String
        print("   📴 Call ended elsewhere: \(callId ?? "nil") (\(reason ?? "-"))")
        CallKeepHelper.reportCallEnded(
          callId ?? UUID().uuidString,
          reason: reason,
          callerName: dictionaryPayload["callerName"] as? String,
          payload: dictionaryPayload
        ) {
          completion()
        }
        postVoIPPushReceived(dictionaryPayload)
        return
      }

      // Always report CallKit before PushKit completion — even if payload keys are missing.
      // Missing report + completion() = iOS terminates the app (killed-state VoIP crash).
      let reportCallId = callId ?? UUID().uuidString
      let reportHandle = handle ?? reportCallId
      let reportName = callerName ?? "Incoming call"
      print("   📞 Reporting incoming call to CallKeep...")
      CallKeepHelper.reportIncomingCall(
        reportCallId,
        handle: reportHandle,
        callerName: reportName,
        hasVideo: hasVideo,
        payload: dictionaryPayload
      ) {
        completion()
      }
      // Only after the CallKit report: nothing may run between the push and the report.
      postVoIPPushReceived(dictionaryPayload)
    } else {
      NSLog("[TotusVoIP] VoIP push payload is not a dictionary — still reporting a call to CallKit")
      let fallbackId = UUID().uuidString
      CallKeepHelper.reportIncomingCall(
        fallbackId,
        handle: fallbackId,
        callerName: "Incoming call",
        hasVideo: false,
        payload: [:]
      ) {
        completion()
      }
      postVoIPPushReceived([:])
    }
  }

  /// Push contents for VoIPPushModule (JS event). Called only after the CallKit report.
  private func postVoIPPushReceived(_ userInfo: [String: Any]) {
    NotificationCenter.default.post(
      name: NSNotification.Name("VoIPPushReceived"),
      object: nil,
      userInfo: userInfo
    )
  }

  // This method is called when the push registry is invalidated
  func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
    print("📱 PKPushRegistry: didInvalidatePushTokenFor type: \(type.rawValue)")
    print("   ⚠️ VoIP push token invalidated - system will automatically re-register")

    // Post notification for VoIPPushModule
    NotificationCenter.default.post(
      name: NSNotification.Name("VoIPPushTokenInvalidated"),
      object: nil
    )

    // The library's native module will handle this
    // No action needed - system will automatically re-register
  }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory
    else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }

    factory.startReactNative(
      withModuleName: "totusClubApp",
      in: window,
      launchOptions: launchOptions
    )

    if let url = connectionOptions.urlContexts.first?.url {
      _ = RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
    }
    if let userActivity = connectionOptions.userActivities.first {
      _ = RCTLinkingManager.application(
        UIApplication.shared,
        continue: userActivity,
        restorationHandler: { _ in }
      )
    }

    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
      guard let rootVC = window.rootViewController else {
        print("⚠️ Could not store bridge in CallKeepHelper, will try to get it dynamically")
        return
      }
      if let rootView = rootVC.view as? RCTRootView {
        CallKeepHelper.setBridge(rootView.bridge)
        print("✅ Bridge stored in CallKeepHelper (from RCTRootView)")
        return
      }
      for subview in rootVC.view.subviews {
        if let rootView = subview as? RCTRootView {
          CallKeepHelper.setBridge(rootView.bridge)
          print("✅ Bridge stored in CallKeepHelper (from subview)")
          return
        }
      }
      print("⚠️ Could not store bridge in CallKeepHelper, will try to get it dynamically")
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    _ = RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
