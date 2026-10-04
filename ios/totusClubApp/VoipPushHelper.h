//
//  VoipPushHelper.h
//  totusClubApp
//
//  Helper to bridge VoIP push delegate methods from Swift to Objective-C
//

#import <Foundation/Foundation.h>
#import <PushKit/PushKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface VoipPushHelper : NSObject

+ (void)didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(PKPushType)type;
+ (void)didReceiveIncomingPushWithPayload:(PKPushPayload *)payload forType:(PKPushType)type completion:(void (^)(void))completion;
+ (void)addCompletionHandler:(NSString *)uuid completionHandler:(void (^)(void))completionHandler;

/// One PKPushRegistry for the whole process: the one AppDelegate creates in didFinishLaunching.
/// react-native-voip-push-notification's voipRegistration (JS registerVoipToken) creates a second,
/// local registry that is released right away; after this call it only re-sends the VoIP token
/// that the app registry already received. Call before the app registry is created.
+ (void)useAppRegistryOnly:(PKPushRegistry *)registry;

@end

NS_ASSUME_NONNULL_END

