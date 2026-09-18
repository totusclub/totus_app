#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
// Deep link totus://auth/yandex?ticket=… — возврат из браузера после входа через Яндекс ID.
// Без RCTLinkingManager событие Linking 'url' не доходит до JS.
#import <React/RCTLinkingManager.h>
#import "VoipPushHelper.h"
#import "RNCallKeep.h"
#import "CallKeepHelper.h"
