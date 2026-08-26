#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import "RNCallKeep.h"
#import <React/RCTBridge.h>
#import <React/RCTRootView.h>
#import "CallKeepHelper.h"

// Store bridge reference for access when app is closed
static RCTBridge *storedBridge = nil;

@implementation CallKeepHelper

+ (void)setBridge:(RCTBridge *)bridge {
    storedBridge = bridge;
    NSLog(@"📱 CallKeepHelper: Bridge stored for VoIP push handling");
}

+ (RCTBridge *)getBridge {
    // First try stored bridge
    if (storedBridge) {
        return storedBridge;
    }
    
    // Try multiple ways to get the bridge
    UIApplication *app = [UIApplication sharedApplication];
    id delegate = [app delegate];
    
    // Method 1: Try to get bridge from app delegate (new architecture)
    SEL bridgeSelector = NSSelectorFromString(@"bridge");
    if ([delegate respondsToSelector:bridgeSelector]) {
        #pragma clang diagnostic push
        #pragma clang diagnostic ignored "-Warc-performSelector-leaks"
        id bridge = [delegate performSelector:bridgeSelector];
        #pragma clang diagnostic pop
        
        if (bridge && [bridge isKindOfClass:[RCTBridge class]]) {
            return (RCTBridge *)bridge;
        }
    }
    
    // Method 2: Try to get bridge from reactNativeDelegate
    SEL delegateSelector = NSSelectorFromString(@"reactNativeDelegate");
    if ([delegate respondsToSelector:delegateSelector]) {
        #pragma clang diagnostic push
        #pragma clang diagnostic ignored "-Warc-performSelector-leaks"
        id reactNativeDelegate = [delegate performSelector:delegateSelector];
        #pragma clang diagnostic pop
        
        if (reactNativeDelegate) {
            SEL bridgeSelector2 = NSSelectorFromString(@"bridge");
            if ([reactNativeDelegate respondsToSelector:bridgeSelector2]) {
                #pragma clang diagnostic push
                #pragma clang diagnostic ignored "-Warc-performSelector-leaks"
                id bridge = [reactNativeDelegate performSelector:bridgeSelector2];
                #pragma clang diagnostic pop
                
                if (bridge && [bridge isKindOfClass:[RCTBridge class]]) {
                    return (RCTBridge *)bridge;
                }
            }
        }
    }
    
    // Method 3: Try to get from reactNativeFactory
    SEL factorySelector = NSSelectorFromString(@"reactNativeFactory");
    if ([delegate respondsToSelector:factorySelector]) {
        #pragma clang diagnostic push
        #pragma clang diagnostic ignored "-Warc-performSelector-leaks"
        id factory = [delegate performSelector:factorySelector];
        #pragma clang diagnostic pop
        
        if (factory) {
            SEL bridgeSelector3 = NSSelectorFromString(@"bridge");
            if ([factory respondsToSelector:bridgeSelector3]) {
                #pragma clang diagnostic push
                #pragma clang diagnostic ignored "-Warc-performSelector-leaks"
                id bridge = [factory performSelector:bridgeSelector3];
                #pragma clang diagnostic pop
                
                if (bridge && [bridge isKindOfClass:[RCTBridge class]]) {
                    return (RCTBridge *)bridge;
                }
            }
        }
    }
    
    // Method 4: Try to get from main window's root view
    if (app.keyWindow) {
        UIViewController *rootVC = app.keyWindow.rootViewController;
        if ([rootVC.view isKindOfClass:[RCTRootView class]]) {
            RCTRootView *rootView = (RCTRootView *)rootVC.view;
            if (rootView.bridge) {
                return rootView.bridge;
            }
        }
    }
    
    return nil;
}

+ (void)reportIncomingCall:(NSString *)callId
                    handle:(NSString *)handle
                callerName:(NSString *)callerName
                   hasVideo:(BOOL)hasVideo
                    payload:(NSDictionary *)payload
                 completion:(void (^)(void))completion {
    NSLog(@"📞 CallKeepHelper: Reporting incoming call");
    NSLog(@"   callId: %@", callId);
    NSLog(@"   handle: %@", handle);
    NSLog(@"   callerName: %@", callerName);
    
    // Get bridge
    RCTBridge *bridge = [self getBridge];
    
    if (!bridge) {
        NSLog(@"⚠️ No bridge available, trying direct RNCallKeep access...");
        // Try to use RNCallKeep directly (it might have a singleton)
        // This is a fallback for when bridge is not yet available
        if (completion) {
            completion();
        }
        return;
    }
    
    // Get RNCallKeep module
    RNCallKeep *callKeep = [bridge moduleForName:@"RNCallKeep"];
    
    if (!callKeep) {
        NSLog(@"⚠️ RNCallKeep module not found in bridge");
        // Try to get it as a class method
        Class callKeepClass = NSClassFromString(@"RNCallKeep");
        if (callKeepClass) {
            NSLog(@"   Found RNCallKeep class, but module not available");
        }
        if (completion) {
            completion();
        }
        return;
    }
    
    NSLog(@"✅ Found RNCallKeep module, reporting call...");
    
    // Report the incoming call using the correct class method signature
    // Note: reportNewIncomingCall is a CLASS method (+), not an instance method
    // Method signature: reportNewIncomingCall:handle:handleType:hasVideo:localizedCallerName:supportsHolding:supportsDTMF:supportsGrouping:supportsUngrouping:fromPushKit:payload:withCompletionHandler:
    SEL reportSelector = @selector(reportNewIncomingCall:handle:handleType:hasVideo:localizedCallerName:supportsHolding:supportsDTMF:supportsGrouping:supportsUngrouping:fromPushKit:payload:withCompletionHandler:);
    
    if ([RNCallKeep respondsToSelector:reportSelector]) {
        [RNCallKeep reportNewIncomingCall:callId
                                    handle:handle
                                handleType:@"generic"
                                  hasVideo:hasVideo
                       localizedCallerName:callerName
                           supportsHolding:NO
                              supportsDTMF:NO
                          supportsGrouping:NO
                        supportsUngrouping:NO
                             fromPushKit:YES
                                 payload:payload
                   withCompletionHandler:completion];
        NSLog(@"✅ Successfully reported incoming call to CallKeep: %@", callId);
    } else {
        NSLog(@"⚠️ RNCallKeep doesn't respond to reportNewIncomingCall selector");
        if (completion) {
            completion();
        }
    }
}

@end

