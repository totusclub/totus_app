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
        NSLog(@"✅ Reported incoming call to CallKeep (bridge=%@): %@", [self getBridge] ? @"yes" : @"no", safeCallId);
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

    // A call this iPhone has answered itself is not ended by "answered elsewhere"
    // (the server does not send that to the answering phone; this is only a safety net).
    BOOL keepCall = NO;
    NSUUID *uuid = [[NSUUID alloc] initWithUUIDString:safeCallId];
    if (uuid) {
        CXCallObserver *observer = [[CXCallObserver alloc] init];
        for (CXCall *call in observer.calls) {
            if ([call.UUID isEqual:uuid] && call.hasConnected && !call.hasEnded &&
                [reason isEqualToString:@"answered_elsewhere"]) {
                keepCall = YES;
            }
        }
    }

    void (^finish)(void) = ^{
        if (!keepCall && [RNCallKeep respondsToSelector:@selector(endCallWithUUID:reason:)]) {
            [RNCallKeep endCallWithUUID:safeCallId reason:endReason];
            NSLog(@"✅ CallKit call ended (reason %d): %@", endReason, safeCallId);
        }
        if (completion) {
            completion();
        }
    };

    // PushKit: every VoIP push must report a call to CallKit, otherwise iOS kills the app.
    // If this call is still ringing, the report fails as a duplicate (harmless) and the call is
    // ended right after; if CallKit no longer has it, it is reported and ended at once.
    NSMutableDictionary *safePayload = payload ? [payload mutableCopy] : [NSMutableDictionary dictionary];
    [self reportIncomingCall:safeCallId
                      handle:@"totus"
                  callerName:(callerName.length > 0 ? callerName : @"Totus")
                    hasVideo:NO
                     payload:safePayload
                  completion:finish];
}

@end

