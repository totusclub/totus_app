#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
@class RCTBridge;

NS_ASSUME_NONNULL_BEGIN

@interface CallKeepHelper : NSObject

+ (void)setBridge:(RCTBridge *)bridge;
+ (RCTBridge *)getBridge;
+ (void)reportIncomingCall:(NSString *)callId
                    handle:(NSString *)handle
                callerName:(NSString *)callerName
                   hasVideo:(BOOL)hasVideo
                    payload:(NSDictionary *)payload
                 completion:(void (^)(void))completion;
/// VoIP push type=call_ended: the call ended on another device / by the caller.
/// Ends the CallKit call with the same UUID (reason: answered_elsewhere, rejected, missed, hangup…).
+ (void)reportCallEnded:(NSString *)callId
                 reason:(nullable NSString *)reason
             callerName:(nullable NSString *)callerName
                payload:(NSDictionary *)payload
             completion:(void (^)(void))completion;

@end

NS_ASSUME_NONNULL_END

