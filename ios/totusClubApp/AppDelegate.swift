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

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    if FirebaseApp.app() == nil {
      FirebaseApp.configure()
    }

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "totusClubApp",
      in: window,
      launchOptions: launchOptions
    )

    // Store bridge reference in CallKeepHelper for VoIP push handling
    // This allows CallKeep to work even when app is closed
    // Try to get bridge after React Native is initialized
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
      // Try to get bridge from root view (most reliable method)
      if let window = self.window,
         let rootVC = window.rootViewController {
        // Check if root view is RCTRootView
        if let rootView = rootVC.view as? RCTRootView {
          let bridge = rootView.bridge
          if bridge != nil {
            CallKeepHelper.setBridge(bridge)
            print("✅ Bridge stored in CallKeepHelper (from RCTRootView)")
            return
          }
        }
        
        // Try to find RCTRootView in subviews
        for subview in rootVC.view.subviews {
          if let rootView = subview as? RCTRootView {
            let bridge = rootView.bridge
            if bridge != nil {
              CallKeepHelper.setBridge(bridge)
              print("✅ Bridge stored in CallKeepHelper (from subview)")
              return
            }
          }
        }
      }
      
      print("⚠️ Could not store bridge in CallKeepHelper, will try to get it dynamically")
    }

    // Notification permission is requested from JS after login (src/modules/push/pushService.ts,
    // notifee.requestPermission) — not at launch. RNFB Messaging also swizzles APNs callbacks;
    // we still set Messaging.apnsToken explicitly below for reliability after GoogleService-Info swaps.

    // Note: react-native-voip-push-notification library sets up its own PKPushRegistry
    // and will handle VoIP token registration. The library's native module will
    // automatically set AppDelegate as the delegate, so we just need to implement
    // the PKPushRegistryDelegate methods below.

    return true
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
    print("📱 PKPushRegistry: didReceiveIncomingPushWith payload for type: \(type.rawValue)")
    
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
      
      // Post notification for VoIPPushModule
      NotificationCenter.default.post(
        name: NSNotification.Name("VoIPPushReceived"),
        object: nil,
        userInfo: dictionaryPayload
      )
      
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
        print("   ✅ CallKeep reported successfully")
        completion()
      }
    } else {
      print("   ⚠️ Invalid payload format — still report CallKit so iOS does not kill the process")
      NotificationCenter.default.post(
        name: NSNotification.Name("VoIPPushReceived"),
        object: nil,
        userInfo: [:]
      )
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
    }
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
