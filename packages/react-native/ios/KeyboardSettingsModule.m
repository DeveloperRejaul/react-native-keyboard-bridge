#import <React/RCTBridgeModule.h>

// Bridges the Swift KeyboardSettingsModule (exposed to the ObjC runtime as "KeyboardSettings" via
// @objc(KeyboardSettings)) into React Native — Swift can't use RCT_EXTERN_MODULE itself.
@interface RCT_EXTERN_MODULE(KeyboardSettings, NSObject)
RCT_EXTERN_METHOD(openInputMethodSettings)
@end
