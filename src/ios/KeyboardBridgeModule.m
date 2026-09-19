#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Bridges KeyboardBridgeModule.swift's @objc(KeyboardBridge) methods to JS as
// NativeModules.KeyboardBridge — see that file's own doc comment and docs/adr/ADR-008.
@interface RCT_EXTERN_MODULE(KeyboardBridge, RCTEventEmitter)

RCT_EXTERN_METHOD(commitText:(NSString *)text)
RCT_EXTERN_METHOD(deleteSurroundingText:(nonnull NSNumber *)before after:(nonnull NSNumber *)after)
RCT_EXTERN_METHOD(getTextBeforeCursor:(nonnull NSNumber *)length
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getTextAfterCursor:(nonnull NSNumber *)length
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getSelectedText:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getCursorCapsMode:(nonnull NSNumber *)reqModes
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(switchToPreviousInputMethod)
RCT_EXTERN_METHOD(switchToNextInputMethod)
RCT_EXTERN_METHOD(performHapticFeedback)
RCT_EXTERN_METHOD(playClickSound:(NSString *)effect)

// Android-only (see KeyboardBridgeModule.swift's per-method comments) — still bridged, as
// safe no-ops, not omitted.
RCT_EXTERN_METHOD(setSelection:(nonnull NSNumber *)start end:(nonnull NSNumber *)end)
RCT_EXTERN_METHOD(getExtractedText:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(sendKeyEvent:(nonnull NSNumber *)keyCode)
RCT_EXTERN_METHOD(performEditorAction:(nonnull NSNumber *)actionCode)
RCT_EXTERN_METHOD(setComposingText:(NSString *)text newCursorPosition:(nonnull NSNumber *)newCursorPosition)
RCT_EXTERN_METHOD(setComposingRegion:(nonnull NSNumber *)start end:(nonnull NSNumber *)end)
RCT_EXTERN_METHOD(finishComposingText)
RCT_EXTERN_METHOD(beginBatchEdit)
RCT_EXTERN_METHOD(endBatchEdit)
RCT_EXTERN_METHOD(hideKeyboard)
RCT_EXTERN_METHOD(getCurrentEditorInfo:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
