//
//  VoipPushHelper.m
//  totusClubApp
//
//  Helper to bridge VoIP push delegate methods from Swift to Objective-C
//

#import <objc/runtime.h>
#import "VoipPushHelper.h"
#import "RNVoipPushNotificationManager.h"

// Private API of react-native-voip-push-notification 3.3.x (present in the compiled library).
@interface RNVoipPushNotificationManager (TotusPrivate)
+ (instancetype)sharedInstance;
- (void)sendEventWithNameWrapper:(NSString *)name body:(id)body;
@end

static PKPushCredentials *totusLastCredentials = nil;
static PKPushType totusLastType = nil;
static __weak PKPushRegistry *totusAppRegistry = nil;

@implementation RNVoipPushNotificationManager (TotusSingleRegistry)

// Replaces +voipRegistration (see VoipPushHelper useAppRegistryOnly:). The library version creates
// `PKPushRegistry *voipRegistry` as a local variable with delegate = AppDelegate: a second registry
// next to the app one, released at the end of the block. The app registry already delivers the
// token and the pushes, so only the token is re-sent here — what the library itself does when it
// is "already registered".
+ (void)totus_voipRegistration {
    if (totusLastCredentials) {
        NSLog(@"[TotusVoIP] registerVoipToken: re-sending the token of the app PKPushRegistry");
        [RNVoipPushNotificationManager didUpdatePushCredentials:totusLastCredentials forType:totusLastType];
        return;
    }
    NSData *token = [totusAppRegistry pushTokenForType:PKPushTypeVoIP];
    if (token.length > 0) {
        NSMutableString *hex = [NSMutableString string];
        const unsigned char *bytes = token.bytes;
        for (NSUInteger i = 0; i < token.length; i++) {
            [hex appendFormat:@"%02x", bytes[i]];
        }
        NSLog(@"[TotusVoIP] registerVoipToken: token from the app PKPushRegistry");
        RNVoipPushNotificationManager *manager = [RNVoipPushNotificationManager sharedInstance];
        if ([manager respondsToSelector:@selector(sendEventWithNameWrapper:body:)]) {
            [manager sendEventWithNameWrapper:@"RNVoipPushRemoteNotificationsRegisteredEvent" body:hex];
        }
        return;
    }
    // No token yet: the app registry delivers it to AppDelegate pushRegistry(_:didUpdate:for:),
    // which forwards it to the library -> JS 'register'.
    NSLog(@"[TotusVoIP] registerVoipToken: waiting for the app PKPushRegistry token");
}

@end

@implementation VoipPushHelper

+ (void)useAppRegistryOnly:(PKPushRegistry *)registry {
    totusAppRegistry = registry;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        Class cls = [RNVoipPushNotificationManager class];
        Method original = class_getClassMethod(cls, @selector(voipRegistration));
        Method replacement = class_getClassMethod(cls, @selector(totus_voipRegistration));
        if (original && replacement) {
            method_exchangeImplementations(original, replacement);
            NSLog(@"[TotusVoIP] single PKPushRegistry: library voipRegistration replaced");
        } else {
            NSLog(@"[TotusVoIP] library voipRegistration not found, left as is");
        }
    });
}

+ (void)didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(PKPushType)type {
    // PKPushType is already an NSString* in Objective-C, no need for .rawValue
    totusLastCredentials = credentials;
    totusLastType = type;
    [RNVoipPushNotificationManager didUpdatePushCredentials:credentials forType:type];
}

+ (void)didReceiveIncomingPushWithPayload:(PKPushPayload *)payload forType:(PKPushType)type completion:(void (^)(void))completion {
    // PKPushType is already an NSString* in Objective-C, no need for .rawValue
    
    // Extract UUID from payload if available
    NSString *uuid = payload.dictionaryPayload[@"uuid"];
    if (uuid) {
        [RNVoipPushNotificationManager addCompletionHandler:uuid completionHandler:completion];
    }
    
    [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:type];
    
    // Call completion if UUID wasn't found (library will handle it)
    if (!uuid && completion) {
        completion();
    }
}

+ (void)addCompletionHandler:(NSString *)uuid completionHandler:(void (^)(void))completionHandler {
    [RNVoipPushNotificationManager addCompletionHandler:uuid completionHandler:completionHandler];
}

@end

