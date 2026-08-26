import Foundation
import React

@objc(VoIPPushModule)
class VoIPPushModule: RCTEventEmitter {
  
  private static var sharedInstance: VoIPPushModule?
  
  override init() {
    super.init()
    VoIPPushModule.sharedInstance = self
    setupNotificationObservers()
  }
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  override func supportedEvents() -> [String]! {
    return ["VoIPPushTokenReceived", "VoIPPushReceived", "VoIPPushTokenInvalidated"]
  }
  
  private func setupNotificationObservers() {
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleTokenReceived(_:)),
      name: NSNotification.Name("VoIPPushTokenReceived"),
      object: nil
    )
    
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handlePushReceived(_:)),
      name: NSNotification.Name("VoIPPushReceived"),
      object: nil
    )
    
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleTokenInvalidated),
      name: NSNotification.Name("VoIPPushTokenInvalidated"),
      object: nil
    )
  }
  
  @objc private func handleTokenReceived(_ notification: Notification) {
    if let userInfo = notification.userInfo,
       let token = userInfo["token"] as? String {
      sendEvent(withName: "VoIPPushTokenReceived", body: ["token": token])
    }
  }
  
  @objc private func handlePushReceived(_ notification: Notification) {
    if let userInfo = notification.userInfo {
      sendEvent(withName: "VoIPPushReceived", body: userInfo)
    }
  }
  
  @objc private func handleTokenInvalidated() {
    sendEvent(withName: "VoIPPushTokenInvalidated", body: nil)
  }
  
  deinit {
    NotificationCenter.default.removeObserver(self)
  }
}

