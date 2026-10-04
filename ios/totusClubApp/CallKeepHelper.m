#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <CallKit/CallKit.h>
#import "RNCallKeep.h"
#import <React/RCTBridge.h>
#import <React/RCTRootView.h>
#import "CallKeepHelper.h"

// Private API of react-native-callkeep 4.3.x (present in the compiled library, not in RNCallKeep.h).
@interface RNCallKeep (TotusPrivate)
- (void)sendEventWithNameWrapper:(NSString *)name body:(id)body;
- (NSString *)getIncomingCallErrorCode:(NSError *)error;
@end

// Store bridge reference for access when app is closed
static RCTBridge *storedBridge = nil;
// Only if react-native-callkeep has no provider at all (see +callKitProvider).
static CXProvider *fallbackProvider = nil;

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

+ (NSDictionary *)callKitOptions {
    return @{
        @"appName": @"Totus",
        @"includesCallsInRecents": @YES,
        @"supportsVideo": @NO,
        @"maximumCallGroups": @"1",
        @"maximumCallsPerCallGroup": @"1",
    };
}

+ (void)setupCallKitNatively {
    // A VoIP push can launch the closed app in the background without React Native (it starts
    // only with the UI scene). The CallKit provider must exist, with its delegate, before the push
    // is handled: otherwise the call is never reported, iOS kills the app ("0xbaadca11") and no
    // incoming call appears on the lock screen / in the background. Same options as JS
    // (VoipService CALLKEEP_OPTIONS); the JS RNCallKeep.setup() is then a no-op.
    NSDictionary *options = [self callKitOptions];
    if ([RNCallKeep respondsToSelector:@selector(setup:)]) {
        [RNCallKeep setup:options];
        NSLog(@"📞 CallKeepHelper: CallKit provider set up natively");
    } else {
        NSLog(@"⚠️ CallKeepHelper: RNCallKeep.setup unavailable");
    }
}

// The CXProvider the call is reported to. react-native-callkeep keeps it in a static that is
// created lazily and, when missing, makes +reportNewIncomingCall a silent no-op: no report, and the
// PushKit completion is never called — iOS then kills the background-launched app after a few
// seconds (FRONTBOARD 0xbaadca11, main thread idle) and the call never rings. Here the provider is
// taken from the RNCallKeep module (setupCallKitNatively puts the shared provider there); only if it
// is missing a provider with the same configuration and the same delegate (the RNCallKeep module ->
// answer / end events reach JS as usual) is created.
+ (CXProvider *)callKitProvider {
    RNCallKeep *callKeep = [RNCallKeep allocWithZone:nil];
    if (callKeep.callKeepProvider != nil) {
        return callKeep.callKeepProvider;
    }
    if (fallbackProvider == nil) {
        NSDictionary *options = [self callKitOptions];
        if ([[NSUserDefaults standardUserDefaults] dictionaryForKey:@"RNCallKeepSettings"] == nil) {
            // Same key RNCallKeep setSettings: writes; the module reads it again on its init.
            [[NSUserDefaults standardUserDefaults] setObject:options forKey:@"RNCallKeepSettings"];
        }
        // Same configuration RNCallKeep builds from these options.
        CXProviderConfiguration *config = [[CXProviderConfiguration alloc] init]; // name = app display name
        config.supportsVideo = NO;
        config.maximumCallGroups = 1;
        config.maximumCallsPerCallGroup = 1;
        config.includesCallsInRecents = YES;
        config.supportedHandleTypes = [NSSet setWithObjects:@(CXHandleTypeGeneric), @(CXHandleTypePhoneNumber), nil];
        fallbackProvider = [[CXProvider alloc] initWithConfiguration:config];
        [fallbackProvider setDelegate:callKeep queue:nil];
        callKeep.callKeepProvider = fallbackProvider;
        NSLog(@"[TotusVoIP] RNCallKeep had no CallKit provider — fallback provider created");
    }
    return fallbackProvider;
}

+ (void)reportIncomingCall:(NSString *)callId
                    handle:(NSString *)handle
                callerName:(NSString *)callerName
                   hasVideo:(BOOL)hasVideo
                    payload:(NSDictionary *)payload
                 completion:(void (^)(void))completion {
    // PushKit (iOS 13+): the call must be reported to CallKit right here, in the same run loop as the
    // push, and the completion may run only after CallKit answered. The report goes straight to the
    // CXProvider (never a silent no-op), CallKit's answer is logged, and react-native-callkeep's
    // didDisplayIncomingCall event is sent exactly as RNCallKeep.reportNewIncomingCall sends it.
    // Killed-app path: no React Native bridge is needed for any of this.
    NSString *safeCallId = (callId.length > 0) ? callId : [[NSUUID UUID] UUIDString];
    NSString *safeHandle = (handle.length > 0) ? handle : @"totus";
    NSString *safeName = (callerName.length > 0) ? callerName : @"Incoming call";

    NSUUID *uuid = [[NSUUID alloc] initWithUUIDString:safeCallId];
    if (uuid == nil) {
        // CallKit needs a UUID; a non-UUID call id would otherwise be reported as nil.
        NSLog(@"[TotusVoIP] call id is not a UUID (%@) — reporting under a new UUID", safeCallId);
        uuid = [NSUUID UUID];
        safeCallId = [uuid.UUIDString lowercaseString];
    }

    NSMutableDictionary *safePayload = payload ? [payload mutableCopy] : [NSMutableDictionary dictionary];
    [safePayload removeObjectForKey:@"offer"];

    CXCallUpdate *update = [[CXCallUpdate alloc] init];
    update.remoteHandle = [[CXHandle alloc] initWithType:CXHandleTypeGeneric value:safeHandle];
    update.localizedCallerName = safeName;
    update.hasVideo = hasVideo;
    update.supportsHolding = NO;
    update.supportsDTMF = NO;
    update.supportsGrouping = NO;
    update.supportsUngrouping = NO;

    CXProvider *provider = [self callKitProvider];
    NSLog(@"[TotusVoIP] reporting incoming call %@ to CallKit (provider %@)", safeCallId, provider ? @"ok" : @"nil");
    [provider reportNewIncomingCallWithUUID:uuid update:update completion:^(NSError * _Nullable error) {
        if (error) {
            NSLog(@"[TotusVoIP] CallKit refused incoming call %@: %@ (code %ld)", safeCallId, error.localizedDescription, (long)error.code);
        } else {
            NSLog(@"[TotusVoIP] CallKit shows incoming call %@", safeCallId);
        }
        RNCallKeep *callKeep = [RNCallKeep allocWithZone:nil];
        if ([callKeep respondsToSelector:@selector(sendEventWithNameWrapper:body:)]) {
            NSString *errorCode = @"";
            if (error && [callKeep respondsToSelector:@selector(getIncomingCallErrorCode:)]) {
                errorCode = [callKeep getIncomingCallErrorCode:error] ?: @"Unknown";
            }
            [callKeep sendEventWithNameWrapper:@"RNCallKeepDidDisplayIncomingCall" body:@{
                @"error": (error && error.localizedDescription) ? error.localizedDescription : @"",
                @"errorCode": errorCode,
                @"callUUID": safeCallId,
                @"handle": safeHandle,
                @"localizedCallerName": safeName,
                @"hasVideo": hasVideo ? @"1" : @"0",
                @"supportsHolding": @"0",
                @"supportsDTMF": @"0",
                @"supportsGrouping": @"0",
                @"supportsUngrouping": @"0",
                @"fromPushKit": @"1",
                @"payload": safePayload,
            }];
        }
        if (completion) {
            completion();
        }
    }];
    if (provider == nil && completion) {
        // Unreachable (callKitProvider always returns a provider); never leave PushKit hanging.
        completion();
    }
}

// Ends a CallKit call on the same provider it was reported to (RNCallKeep.endCallWithUUID uses the
// library's static provider and silently does nothing without it).
+ (void)endCallKitCall:(NSString *)callId reason:(int)reason {
    NSUUID *uuid = [[NSUUID alloc] initWithUUIDString:callId];
    if (uuid == nil) {
        return;
    }
    CXCallEndedReason endedReason;
    switch (reason) {
        case 1: endedReason = CXCallEndedReasonFailed; break;
        case 3: endedReason = CXCallEndedReasonUnanswered; break;
        case 4: endedReason = CXCallEndedReasonAnsweredElsewhere; break;
        case 5: endedReason = CXCallEndedReasonDeclinedElsewhere; break;
        default: endedReason = CXCallEndedReasonRemoteEnded; break;
    }
    [[self callKitProvider] reportCallWithUUID:uuid endedAtDate:[NSDate date] reason:endedReason];
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
        if (!keepCall) {
            dispatch_async(dispatch_get_main_queue(), ^{
                [self endCallKitCall:safeCallId reason:endReason];
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
        dispatch_async(dispatch_get_main_queue(), ^{
            [self endCallKitCall:placeholderId reason:endReason];
            NSLog(@"✅ CallKit placeholder ended (reason %d) for %@", endReason, safeCallId);
        });
    }];
}

@end

