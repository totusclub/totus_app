//
//  VoipPushHelper.m
//  totusClubApp
//
//  Helper to bridge VoIP push delegate methods from Swift to Objective-C
//

#import "VoipPushHelper.h"
#import "RNVoipPushNotificationManager.h"

@implementation VoipPushHelper

+ (void)didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(PKPushType)type {
    // PKPushType is already an NSString* in Objective-C, no need for .rawValue
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

