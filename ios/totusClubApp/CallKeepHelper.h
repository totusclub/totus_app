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

@end

NS_ASSUME_NONNULL_END

