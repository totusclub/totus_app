#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <CallKit/CallKit.h>
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

+ (void)setupCallKitNatively {
    // A VoIP push can launch the closed app in the background without React Native (it starts
    // only with the UI scene). The CallKit provider must exist, with its delegate, before the push
    // is handled: otherwise the call is never reported, iOS kills the app ("0xbaadca11") and no
    // incoming call appears on the lock screen / in the background. Same options as JS
    // (VoipService CALLKEEP_OPTIONS); the JS RNCallKeep.setup() is then a no-op.
    NSDictionary *options = @{
        @"appName": @"Totus",
        @"includesCallsInRecents": @YES,
        @"supportsVideo": @NO,
        @"maximumCallGroups": @"1",
        @"maximumCallsPerCallGroup": @"1",
    };
    if ([RNCallKeep respondsToSelector:@selector(setup:)]) {
        [RNCallKeep setup:options];
        NSLog(@"📞 CallKeepHelper: CallKit provider set up natively");
    } else {
        NSLog(@"⚠️ CallKeepHelper: RNCallKeep.setup unavailable");
    }
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

    // iOS kills the process if PushKit completion runs without CXProvider.reportNewIncomingCall.
    // reportNewIncomingCall is a CLASS method — do not wait for RCTBridge (killed-app path has no bridge yet).
    NSString *safeCallId = (callId.length > 0) ? callId : [[NSUUID UUID] UUIDString];
    NSString *safeHandle = (handle.length > 0) ? handle : @"totus";
    NSString *safeName = (callerName.length > 0) ? callerName : @"Incoming call";

    NSMutableDictionary *safePayload = payload ? [payload mutableCopy] : [NSMutableDictionary dictionary];
    [safePayload removeObjectForKey:@"offer"];

    SEL reportSelector = @selector(reportNewIncomingCall:handle:handleType:hasVideo:localizedCallerName:supportsHolding:supportsDTMF:supportsGrouping:supportsUngrouping:fromPushKit:payload:withCompletionHandler:);

    if ([RNCallKeep respondsToSelector:reportSelector]) {
        [RNCallKeep reportNewIncomingCall:safeCallId
                                    handle:safeHandle
                                handleType:@"generic"
                                  hasVideo:hasVideo
                       localizedCallerName:safeName
                           supportsHolding:NO
                              supportsDTMF:NO
                          supportsGrouping:NO
                        supportsUngrouping:NO
                             fromPushKit:YES
                                 payload:safePayload
                   withCompletionHandler:completion];
        NSLog(@"✅ Reported incoming call to CallKeep: %@", safeCallId);
        return;
    }

    NSLog(@"⚠️ RNCallKeep.reportNewIncomingCall unavailable");
    if (completion) {
        completion();
    }
}

// RNCallKeep endCallWithUUID:reason: -> CXCallEndedReason:
// 2 remoteEnded, 3 unanswered (missed / caller cancelled), 4 answeredElsewhere, 5 declinedElsewhere.
+ (int)callKitEndReason:(NSString *)reason {
    if ([reason isEqualToString:@"answered_elsewhere"]) {
        return 4;
    }
    if ([reason isEqualToString:@"rejected"]) {
        return 5;
    }
    if ([reason isEqualToString:@"missed"] || [reason isEqualToString:@"caller_cancel"]) {
        return 3;
    }
    return 2;
}

+ (void)reportCallEnded:(NSString *)callId
                 reason:(NSString *)reason
             callerName:(NSString *)callerName
                payload:(NSDictionary *)payload
             completion:(void (^)(void))completion {
    NSLog(@"📞 CallKeepHelper: call ended elsewhere: %@ (%@)", callId, reason ?: @"-");
    NSString *safeCallId = (callId.length > 0) ? callId : [[NSUUID UUID] UUIDString];
    int endReason = [self callKitEndReason:reason ?: @""];
    BOOL canEnd = [RNCallKeep respondsToSelector:@selector(endCallWithUUID:reason:)];

    // PushKit rule (iOS 13+): when the completion handler runs, the app must have a call in
    // CallKit. Ending the call BEFORE completion (as before) left the app without a call: iOS
    // killed it and, after a few such pushes, stopped delivering VoIP pushes to the app at all
    // (no incoming calls on the iPhone). Now: complete first, end right after.
    CXCall *existing = nil;
    NSUUID *uuid = [[NSUUID alloc] initWithUUIDString:safeCallId];
    if (uuid) {
        CXCallObserver *observer = [[CXCallObserver alloc] init];
        for (CXCall *call in observer.calls) {
            if ([call.UUID isEqual:uuid] && !call.hasEnded) {
                existing = call;
            }
        }
    }

    if (existing) {
        // The call is still in CallKit (ringing or in progress): it satisfies PushKit.
        if (completion) {
            completion();
        }
        // A call this iPhone answered itself is not ended by "answered elsewhere"
        // (the server does not send that to the answering phone; this is only a safety net).
        BOOL keepCall = existing.hasConnected && [reason isEqualToString:@"answered_elsewhere"];
        if (!keepCall && canEnd) {
            dispatch_async(dispatch_get_main_queue(), ^{
                [RNCallKeep endCallWithUUID:safeCallId reason:endReason];
                NSLog(@"✅ CallKit call ended (reason %d): %@", endReason, safeCallId);
            });
        }
        return;
    }

    // CallKit no longer has the call (already ended by the app) or never showed it: PushKit
    // still needs a reported call. A UUID of an ended call cannot be reported again, so a
    // placeholder with a new UUID is reported, the push is completed, and the placeholder is
    // ended on the next run-loop turn.
    NSString *placeholderId = [[NSUUID UUID] UUIDString];
    NSMutableDictionary *safePayload = payload ? [payload mutableCopy] : [NSMutableDictionary dictionary];
    safePayload[@"placeholderFor"] = safeCallId;
    [self reportIncomingCall:placeholderId
                      handle:@"totus"
                  callerName:(callerName.length > 0 ? callerName : @"Totus")
                    hasVideo:NO
                     payload:safePayload
                  completion:^{
        if (completion) {
            completion();
        }
        if (canEnd) {
            dispatch_async(dispatch_get_main_queue(), ^{
                [RNCallKeep endCallWithUUID:placeholderId reason:endReason];
                NSLog(@"✅ CallKit placeholder ended (reason %d) for %@", endReason, safeCallId);
            });
        }
    }];
}

@end

